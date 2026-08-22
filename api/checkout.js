/* Starts a Paystack payment for a basket.
 *
 * The browser sends product ids and quantities — never prices. This
 * recomputes every line from the catalogue on the server, so a customer
 * editing the page cannot pay ₦1 for a ₦185,000 wig. That is the whole
 * reason a shop needs a server at all.
 *
 * PAYSTACK_SECRET_KEY lives in Vercel's environment variables, never in
 * this repo. See README §8.
 */
import fs from "node:fs";
import path from "node:path";
/* The same pricing function the checkout page uses, so what the customer
   was shown and what they're charged cannot drift apart. Imported
   statically so Vercel's bundler traces it into the function — a
   createRequire here threw at module load, before any handler ran. */
import shipping from "../assets/js/shipping.js";

const MAX_QTY = 20;

function loadCatalogue() {
  const dir = path.join(process.cwd(), "data", "products");
  const byId = {};
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith(".json")) continue;
    const p = JSON.parse(fs.readFileSync(path.join(dir, file), "utf8"));
    byId[p.id] = p;
  }
  return byId;
}

export default async function handler(req, res) {
  /* A GET is a health check: it proves the catalogue and rate table are
     actually bundled into the function. Vercel cannot trace files read
     with fs at runtime, so this is the only way to catch a missing
     data/ directory before a customer does. Counts only — no prices,
     no keys. */
  if (req.method === "GET") {
    try {
      const catalogue = loadCatalogue();
      const rules = JSON.parse(
        fs.readFileSync(path.join(process.cwd(), "data", "shipping.json"), "utf8")
      );
      res.status(200).json({
        ok: true,
        products: Object.keys(catalogue).length,
        delivery_options: (rules.local || []).length + 1,
        zones: (rules.international.zones || []).length,
        payments_configured: Boolean(process.env.PAYSTACK_SECRET_KEY),
      });
    } catch (err) {
      res.status(500).json({ ok: false, error: "Catalogue or rates missing from the deploy." });
    }
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Use POST." });
    return;
  }

  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) {
    res.status(500).json({ error: "Payments aren't configured yet. Please contact us to order." });
    return;
  }

  const { items, customer } = req.body || {};
  if (!Array.isArray(items) || !items.length) {
    res.status(400).json({ error: "Your bag is empty." });
    return;
  }
  if (!customer || !customer.email || !customer.name || !customer.phone || !customer.address) {
    res.status(400).json({ error: "Please fill in every delivery detail." });
    return;
  }

  const catalogue = loadCatalogue();
  const lines = [];
  let total = 0;
  let weight = 0;

  for (const item of items) {
    const product = catalogue[item.id];
    if (!product) {
      res.status(400).json({ error: `"${item.id}" is no longer available.` });
      return;
    }
    const qty = Math.min(MAX_QTY, Math.max(1, parseInt(item.qty, 10) || 1));
    const amount = product.price * qty;
    total += amount;
    weight += (Number(product.weight_kg) || 0.4) * qty;
    lines.push({
      id: product.id,
      name: product.name,
      options: String(item.meta || "").slice(0, 120),
      qty,
      unit_price: product.price,
      line_total: amount,
    });
  }

  /* Delivery is priced here too — a figure posted by the browser could be
     anything. */
  const rules = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), "data", "shipping.json"), "utf8")
  );
  const delivery = shipping.quote(rules, req.body.delivery || {}, weight);
  if (!delivery.ok) {
    res.status(400).json({ error: delivery.error });
    return;
  }
  const grandTotal = total + delivery.amount;

  try {
    const response = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: String(customer.email).slice(0, 120),
        /* Paystack works in kobo. */
        amount: grandTotal * 100,
        currency: "NGN",
        callback_url: `https://${req.headers["x-forwarded-host"] || req.headers.host}/order-complete.html`,
        /* The order itself rides along with the transaction, so Paystack's
           dashboard doubles as the order book — no separate database. */
        metadata: {
          customer_name: String(customer.name).slice(0, 120),
          phone: String(customer.phone).slice(0, 40),
          delivery_address: String(customer.address).slice(0, 400),
          notes: String(customer.notes || "").slice(0, 500),
          items: lines,
          items_total: total,
          delivery_method: delivery.label,
          delivery_fee: delivery.amount,
          parcel_weight_kg: Math.round(weight * 100) / 100,
          custom_fields: [
            { display_name: "Customer", variable_name: "customer_name", value: String(customer.name).slice(0, 120) },
            { display_name: "Phone", variable_name: "phone", value: String(customer.phone).slice(0, 40) },
            { display_name: "Deliver to", variable_name: "delivery_address", value: String(customer.address).slice(0, 400) },
            { display_name: "Order", variable_name: "order_summary",
              value: lines.map((l) => `${l.name} x${l.qty}`).join(", ").slice(0, 400) },
            { display_name: "Delivery", variable_name: "delivery",
              value: `${delivery.label} — ₦${delivery.amount.toLocaleString()}` },
          ],
        },
      }),
    });

    const data = await response.json();
    if (!data.status || !data.data || !data.data.authorization_url) {
      res.status(502).json({ error: data.message || "Could not start the payment. Please try again." });
      return;
    }

    res.status(200).json({ url: data.data.authorization_url, reference: data.data.reference, total: grandTotal });
  } catch (err) {
    res.status(502).json({ error: "Could not reach the payment provider. Please try again." });
  }
}
