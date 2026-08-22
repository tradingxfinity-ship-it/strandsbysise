/* Delivery pricing, shared by the checkout page and the server.
 *
 * Written as a plain function of (rules, choice, weight) so the browser and
 * /api/checkout compute the identical figure. The server's answer is the one
 * that gets charged; the browser's is only what the customer is shown, and
 * they must agree or someone is being quoted a price they don't pay.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.SBSShipping = factory();
})(typeof self !== "undefined" ? self : this, function () {

  function bandRate(bands, zoneIndex, weight) {
    for (var i = 0; i < bands.length; i++) {
      if (weight <= bands[i].up_to_kg) return bands[i].rates[zoneIndex];
    }
    return null;
  }

  /* Returns { ok, amount, label, error }. `amount` is in naira. */
  function quote(rules, choice, weightKg) {
    choice = choice || {};

    if (choice.method !== "international") {
      var local = (rules.local || []).filter(function (o) { return o.id === choice.method; })[0];
      if (!local) return { ok: false, error: "Please choose a delivery option." };
      return { ok: true, amount: local.price, label: local.label };
    }

    var intl = rules.international;
    var zoneIndex = (intl.zones || []).map(function (z) { return z.id; }).indexOf(choice.zone);
    if (zoneIndex < 0) return { ok: false, error: "Please choose where we're delivering to." };

    var weight = Math.max(0.1, Number(weightKg) || 0.1);
    if (weight > intl.quote_above_kg) return { ok: false, error: intl.quote_note };

    var zoneLabel = intl.zones[zoneIndex].label;
    var shipping = bandRate(intl.bands, zoneIndex, weight);

    if (shipping === null) {
      /* Past the fixed bands the carrier charges per kilo, by range. */
      var perKg = bandRate(intl.per_kg_bands, zoneIndex, weight);
      if (perKg === null) return { ok: false, error: intl.quote_note };
      shipping = Math.round(perKg * weight);
    }

    return {
      ok: true,
      amount: shipping + (intl.packaging_fee || 0),
      label: "International — " + zoneLabel,
      note: intl.packaging_note
    };
  }

  return { quote: quote };
});
