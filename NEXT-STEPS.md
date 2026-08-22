# What's left to do

State of play as of the last commit. `README.md` explains how everything works; this
file is only the outstanding list, roughly in the order worth doing it.

---

## 1. Switch on payments — blocks real orders

The shop is built and working but cannot take money yet. Checkout currently says
*"Payments aren't configured yet"* rather than failing silently.

1. Create a Paystack account and complete business verification.
2. Vercel → project → Settings → Environment Variables → add
   `PAYSTACK_SECRET_KEY` (start with the **test** key, `sk_test_…`).
3. Redeploy.
4. Put a test order through with a Paystack test card — items, delivery, the lot.
5. Swap in the live key when you're happy.

Check it worked: open <https://strandsbysise.vercel.app/api/checkout> in a browser.
`"payments_configured"` should read `true`.

**Never put the key in this repo.** Vercel's settings only.

## 2. Give Sise access to the admin panel — blocks her editing anything

GitHub → this repo → Settings → Collaborators → add her with **Write**.
Until then her login at `/admin` succeeds but cannot save.

## 3. Set the Hair Bank WhatsApp group link

Still the placeholder `YOUR-HAIR-BANK-GROUP-INVITE-CODE`. It's the closing call to
action on the home page, so the button currently goes nowhere.
Editable in the panel: **Settings → Hair Bank group invite link**.

## 4. Set the real phone number and prices

`+234 803 000 0000` and the sample naira prices are placeholders.
Phone is in **Settings**; prices are per product under **Products**.

## 5. Set real shipping weights

Every product is currently 0.4kg. That number picks the international rate band, so
an under-estimate costs money on every overseas order. Weigh a boxed piece and set it
under **Products → Shipping weight**.

---

## Known gaps, deliberately

- **The contact form goes nowhere.** It validates, says thank you, and discards the
  message. Anyone using it believes they've reached you. Formspree's free tier fixes
  this in about two minutes — point the `<form>` at their endpoint.
- **No shipping, returns or privacy policy.** These lived on the FAQ page, which was
  removed. Worth restoring as a small Policies page before real orders, especially
  with card payments. The content is recoverable from git history.
- **No stock counts.** Nothing stops the same piece selling twice.
- **No order statuses.** Paystack's dashboard is the order book — each transaction
  carries the customer, address and item list as metadata.
- **Product photos repeat.** Pieces sharing a texture show the same wig, and all four
  gallery views of a product are the same shot. Fixed by shooting each piece.
- **The reviewer photos and testimonials are invented.** Replace before launch — made-up
  reviews on a real shop are a genuine problem, not a placeholder.

## Things that will bite if you forget

- **Never edit an `.html` file in the project root.** They are all generated. Edit
  `templates/` or `data/`, then run `python3 build.py`.
- **`tools-generate-placeholders.py` only fills empty slots.** It won't overwrite your
  photography unless you pass `--force`. Don't pass `--force`.
- **If the hero looks stuck**, check the four files are different pictures:
  `md5 -q assets/img/hero-*.jpg` should print four different values.
- **Prices live in one place** (`data/products/`). There's no second copy to keep in
  sync now that per-product Paystack links are gone.
