/* Emails you the moment an order is paid for.
 *
 * Paystack calls this URL the instant a payment succeeds — you don't have to
 * be watching the dashboard. We check the call is genuinely from Paystack
 * (anyone can POST to a public URL), then send a plain, readable order email:
 * who bought what, where it's going, and how it's being delivered.
 *
 * Set the webhook URL once in your Paystack dashboard → Settings → API Keys &
 * Webhooks → Live/Test Webhook URL:
 *     https://strandsbysise.vercel.app/api/paystack-webhook
 *
 * Environment variables (Vercel → Settings → Environment Variables):
 *   PAYSTACK_SECRET_KEY   already set for checkout — reused to verify the call
 *   RESEND_API_KEY        from resend.com, lets us send the email
 *   ORDER_EMAIL_TO        where orders land (defaults to data/settings.json email)
 *   ORDER_EMAIL_FROM      the "from" address on a domain you've verified in Resend
 *                         (defaults to orders@strandsbysise.com)
 *
 * Never put any of these keys in this repo. Vercel's settings only.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

/* Paystack signs the exact bytes it sent, so we must read the raw body —
   a parsed-and-restringified body would not match the signature. */
export const config = { api: { bodyParser: false } };

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function naira(kobo) {
  return "₦" + Math.round((Number(kobo) || 0) / 100).toLocaleString();
}

/* Where orders should be emailed. An env var wins so it can change without a
   code edit; otherwise fall back to the shop's own contact address. */
function recipient() {
  if (process.env.ORDER_EMAIL_TO) return process.env.ORDER_EMAIL_TO;
  try {
    const s = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), "data", "settings.json"), "utf8")
    );
    return s.email || "";
  } catch (err) {
    return "";
  }
}

function orderEmail(t) {
  const m = t.metadata || {};
  const items = Array.isArray(m.items) ? m.items : [];
  const rows = items
    .map(
      (l) =>
        `<tr>
           <td style="padding:6px 12px 6px 0">${l.name || l.id}${
          l.options ? ` <span style="color:#8a827f">(${l.options})</span>` : ""
        }</td>
           <td style="padding:6px 12px;text-align:center">×${l.qty}</td>
           <td style="padding:6px 0;text-align:right">₦${Number(
             l.line_total || 0
           ).toLocaleString()}</td>
         </tr>`
    )
    .join("");

  const html = `
  <div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;color:#2b2523;max-width:560px">
    <h2 style="margin:0 0 4px">New order — ${naira(t.amount)}</h2>
    <p style="margin:0 0 20px;color:#8a827f">Paid ${new Date(
      t.paid_at || Date.now()
    ).toLocaleString("en-GB", { timeZone: "Africa/Lagos" })} · ref ${t.reference}</p>

    <table style="width:100%;border-collapse:collapse;margin:0 0 20px">
      ${rows || '<tr><td style="color:#8a827f">No item detail on this order.</td></tr>'}
      <tr><td colspan="3" style="border-top:1px solid #e7e1de"></td></tr>
      <tr>
        <td colspan="2" style="padding:6px 12px 0 0;text-align:right;color:#8a827f">Items</td>
        <td style="padding:6px 0 0;text-align:right">₦${Number(
          m.items_total || 0
        ).toLocaleString()}</td>
      </tr>
      <tr>
        <td colspan="2" style="padding:2px 12px 0 0;text-align:right;color:#8a827f">${
          m.delivery_method || "Delivery"
        }</td>
        <td style="padding:2px 0 0;text-align:right">₦${Number(
          m.delivery_fee || 0
        ).toLocaleString()}</td>
      </tr>
      <tr>
        <td colspan="2" style="padding:6px 12px 0 0;text-align:right;font-weight:600">Total paid</td>
        <td style="padding:6px 0 0;text-align:right;font-weight:600">${naira(t.amount)}</td>
      </tr>
    </table>

    <h3 style="margin:0 0 8px">Ship to</h3>
    <p style="margin:0 0 4px;line-height:1.5">
      <strong>${m.customer_name || ""}</strong><br>
      ${m.delivery_address || ""}<br>
      ${m.phone || ""} · ${t.customer && t.customer.email ? t.customer.email : ""}
    </p>
    ${
      m.notes
        ? `<p style="margin:12px 0 0;padding:12px;background:#f6f3f1;border-radius:8px">
             <strong>Notes:</strong> ${m.notes}</p>`
        : ""
    }
    ${
      m.parcel_weight_kg
        ? `<p style="margin:16px 0 0;color:#8a827f;font-size:13px">Parcel weight ~${m.parcel_weight_kg}kg</p>`
        : ""
    }
  </div>`;

  const summary = items.map((l) => `${l.name || l.id} ×${l.qty}`).join(", ");
  return {
    subject: `New order — ${naira(t.amount)}${summary ? ` — ${summary}` : ""}`,
    html,
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Use POST." });
    return;
  }

  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) {
    /* Nothing to verify against — accept quietly so Paystack doesn't retry
       forever, but do nothing. */
    res.status(200).json({ ok: true, skipped: "payments not configured" });
    return;
  }

  const raw = await readRawBody(req);

  /* Prove the call is really from Paystack: they HMAC-SHA512 the exact body
     with your secret key and send it as this header. */
  const expected = crypto.createHmac("sha512", secret).update(raw).digest("hex");
  const signature = req.headers["x-paystack-signature"];
  if (
    !signature ||
    !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(String(signature)))
  ) {
    res.status(401).json({ error: "Bad signature." });
    return;
  }

  let event;
  try {
    event = JSON.parse(raw.toString("utf8"));
  } catch (err) {
    res.status(400).json({ error: "Unreadable payload." });
    return;
  }

  /* Acknowledge every event fast so Paystack marks it delivered; only a
     successful charge is worth an email. */
  if (!event || event.event !== "charge.success" || !event.data) {
    res.status(200).json({ ok: true, ignored: event && event.event });
    return;
  }

  const to = recipient();
  const from = process.env.ORDER_EMAIL_FROM || "orders@strandsbysise.com";
  if (!process.env.RESEND_API_KEY || !to) {
    /* Payment already succeeded and is safe in Paystack; we just can't email
       yet. Acknowledge so there's no retry storm. */
    res.status(200).json({ ok: true, emailed: false, reason: "email not configured" });
    return;
  }

  const { subject, html } = orderEmail(event.data);

  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to, subject, html }),
    });
    if (!r.ok) {
      const detail = await r.text();
      /* Log for Vercel's function logs; still 200 so Paystack won't hammer us.
         The order is not lost — it's in the dashboard regardless. */
      console.error("Resend rejected order email:", r.status, detail);
      res.status(200).json({ ok: true, emailed: false });
      return;
    }
  } catch (err) {
    console.error("Could not reach Resend:", err);
    res.status(200).json({ ok: true, emailed: false });
    return;
  }

  res.status(200).json({ ok: true, emailed: true });
}
