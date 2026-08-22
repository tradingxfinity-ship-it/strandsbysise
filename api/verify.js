/* Confirms a payment after Paystack sends the customer back.
 *
 * Asked from the browser purely so the thank-you page can show a truthful
 * message. It re-checks with Paystack rather than trusting the URL, because
 * anyone can type ?reference=anything into the address bar.
 */
export default async function handler(req, res) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  const reference = (req.query.reference || "").toString().trim();

  if (!secret) {
    res.status(500).json({ status: "unknown", error: "Payments aren't configured." });
    return;
  }
  if (!/^[A-Za-z0-9._-]{4,80}$/.test(reference)) {
    res.status(400).json({ status: "unknown", error: "Missing payment reference." });
    return;
  }

  try {
    const response = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      { headers: { Authorization: `Bearer ${secret}` } }
    );
    const data = await response.json();

    if (!data.status || !data.data) {
      res.status(502).json({ status: "unknown", error: "Could not confirm the payment." });
      return;
    }

    const t = data.data;
    /* Only the essentials go back to the browser — no card details, no
       internal Paystack fields. */
    res.status(200).json({
      status: t.status === "success" ? "success" : t.status,
      reference: t.reference,
      amount: (t.amount || 0) / 100,
      name: (t.metadata && t.metadata.customer_name) || "",
      items: (t.metadata && t.metadata.items) || [],
    });
  } catch (err) {
    res.status(502).json({ status: "unknown", error: "Could not reach the payment provider." });
  }
}
