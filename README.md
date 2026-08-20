# StrandsBySise — Luxury Wig Boutique

A hand-built, fully responsive storefront for StrandsBySise. No frameworks, no build
tooling to install, no monthly platform fee — just HTML, one stylesheet and one script.
Open `index.html` in a browser and it works.

---

## 1. What's in here

```
index.html          Home — hero, collections, best sellers, why us,
                    before & after, testimonials, Instagram, newsletter
shop.html           Full collection with texture filters and sorting
product.html        Product detail — gallery, options, reviews, related
about.html          Brand story
contact.html        Contact form, direct channels, hours, map slot
faq.html            Grouped, searchable-by-section FAQs

assets/css/styles.css   The whole design system (one file, sectioned + commented)
assets/js/main.js       Cart, carousel, filters, gallery zoom, accordions, animations
assets/img/             Placeholder imagery — replace with your photography

templates/          Editable sources for every page except index.html
build.py            Rebuilds those pages (see §4)
tools-generate-placeholders.py   Regenerates the placeholder images
```

## 2. Viewing it locally

Double-click `index.html`, or run a small local server (better — some browsers
restrict features on `file://`):

```bash
python3 -m http.server 4321
```

Then open <http://localhost:4321>.

## 3. Putting it online

The site is fully static, so it can be hosted free or near-free almost anywhere.
Drag the whole folder onto **Netlify Drop** (netlify.com/drop), or push it to GitHub
and enable **GitHub Pages**. Both give you a live URL in under a minute, and you can
point your own domain at it afterwards.

## 4. The one thing to know before editing

`index.html` is the **source of truth for the shared parts** of the site: the
announcement bar, the header, the mobile menu, the footer and the cart drawer.

The other five pages are generated from the files in `templates/`, which pull those
shared parts in automatically. So:

- **Changing the menu, footer, phone number, or announcement bar?**
  Edit `index.html`, then run:
  ```bash
  python3 build.py
  ```
  Every other page picks the change up. Never edit the header or footer inside
  `shop.html`, `product.html`, `about.html`, `contact.html` or `faq.html` directly —
  the next build overwrites it.

- **Changing the words on one page only?**
  Edit that page's file in `templates/` (e.g. `templates/about.template.html`),
  then run `python3 build.py`.

If you'd rather not deal with the build step at all, you can delete `templates/` and
`build.py` and edit the five `.html` files directly — they're complete, standalone
pages. You'll just have to update the header and footer on each one by hand.

## 5. Everyday tasks

### Adding or editing a product

Open `build.py` and find the `PRODUCTS` list near the top. Each product is one entry:

```python
dict(id="silk-straight", name="Silk Straight", cat="straight", price=185000, old=None,
     rating=4.9, reviews=128, length='20"', texture="Straight", density="180%",
     tag="Best Seller", tag_dark=False),
```

- `id` — lowercase, hyphenated. Also decides the image filename (below).
- `cat` — one of `straight`, `curly`, `body-wave`, `bob`, `closure`, `frontal`.
  This is what the shop filters use.
- `price` — plain number, no commas or currency symbol.
- `old` — the crossed-out "was" price, or `None`.
- `tag` — the little badge ("New In", "Sale"…), or `None`.
  `tag_dark=True` makes the badge charcoal instead of white.

Save, run `python3 build.py`, and the product appears on the shop page and in the
"related pieces" row.

Its photo should be saved as `assets/img/product-<id>-1.jpg`. The product detail page
uses images `-1` through `-4` for its gallery.

### The photography

**Every image slot currently shows the same photo** (`IMG_7195.JPG.jpeg`), resized to
fit each spot. It's a placeholder in the sense that it repeats — but it's your real
photo, so the site looks like your brand today rather than like a template.

Replace them one at a time as you shoot more. Drop a new photo into `assets/img/` using
the filename of the slot you want to change, and that spot updates on its own:

| Slot | Filename | Shape | Suggested size |
|---|---|---|---|
| Hero | `hero-model.jpg` | Portrait 4:5 | 1100 × 1375 |
| Collection cards | `collection-*.jpg` | Portrait 4:5 | 760 × 950 |
| Products | `product-<id>-1..4.jpg` | Portrait 4:5 | 900 × 1125 |
| Before / After | `before.jpg`, `after.jpg` | Portrait 4:5 | 800 × 1000 |
| Instagram grid | `gram-1..8.jpg` | Portrait or square | 600 × 750 |
| Reviewer photos | `avatar-1..5.jpg` | Portrait or square | 240 × 300 |
| About page | `about-founder/studio/detail.jpg` | Portrait 4:5 | 700–900 wide |

Shoot portrait where you can — every slot is set up for 4:5, and the square and
landscape spots crop from the top so faces stay in frame. If your photos frame the
face higher or lower, adjust `object-position: 50% 15%` near the top of
`assets/css/styles.css`.

Compress before uploading (TinyPNG or Squoosh) — it's the single biggest thing you can
do for page speed. And update the `alt=""` text on any image you change: it's what
screen readers announce and what Google reads.

**To refill every slot from a different photo**, drop it in and run:

```bash
python3 tools-generate-placeholders.py assets/img/your-photo.jpg
```

That regenerates all 57 files at the right sizes. The original full-size
`IMG_7195.JPG.jpeg` is kept in `assets/img/` as the source — it's 4.7 MB and isn't
loaded by any page, so you can delete it once you no longer need to regenerate from it.

### Changing prices, phone number, social links

Prices live in `build.py` (`PRODUCTS`) and, for the featured four on the home page,
directly in `index.html`. The phone number `+234 803 000 0000` and the WhatsApp link
`wa.me/2348030000000` appear in the header, footer and contact page — a find-and-replace
across all `.html` files plus `templates/` catches every one. Same for
`hello@strandsbysise.com` and the `instagram.com/strandsbysise` handle.

### The Pay Little by Little group — set this link before you go live

The last section of the home page invites customers into your Pay Little by Little
WhatsApp group. **The invite link is a placeholder and must be replaced**, or the
button goes nowhere:

1. Open the group in WhatsApp → **Group info** → **Invite via link** → **Copy link**.
   You'll get something like `https://chat.whatsapp.com/HcW2kL9xYz3AbCdEf`.
2. In `index.html`, find `YOUR-GROUP-INVITE-CODE` and replace the whole URL with yours.

The second button beside it opens a one-to-one chat with you, pre-filled with a
question about the scheme — that one already uses your normal WhatsApp number.

The matching FAQ entry ("How does Pay Little by Little work?") lives in
`templates/faq.template.html`. Edit the terms there to match how you actually run it,
then run `python3 build.py`.

### The contact form

Wired for demo: it validates, then shows a confirmation message. Nothing is sent
anywhere yet. To make it live, sign up with **Formspree** or **Netlify Forms** (both
have free tiers) and add their `action` attribute to the `<form>` tag. Two minutes of
work, no code changes needed.

### The cart

The bag is real — it saves to the browser, survives page changes, and adds up totals.
"Checkout on WhatsApp" opens a chat with you so you can take the order personally,
which suits a boutique better than a card gateway. If you'd rather take card payments,
Paystack and Flutterwave both offer a drop-in checkout button.

### The map on the contact page

The styled block is a placeholder. To use a real map: open Google Maps, find your
address, choose **Share → Embed a map**, copy the `<iframe>`, and replace the
`<div class="map">…</div>` block in `templates/contact.template.html` with it. Then
run `python3 build.py`.

## 6. Colours and type

Everything visual is controlled from the tokens at the top of `assets/css/styles.css`:

```css
--gold:     #D4AF37;   /* highlights and primary actions only */
--blush:    #F8D7E6;
--white:    #FFFFFF;
--ivory:    #FFF9F5;
--charcoal: #2B2B2B;
```

Change a value there and it updates everywhere. Headings are Playfair Display, body
text is Inter, both loaded from Google Fonts.

## 7. What's already been handled

- **Responsive** from 360px phones through to wide desktops, with a floating cart
  button and a sticky Add to Cart bar on mobile.
- **Accessible** — semantic landmarks, skip link, visible focus rings, labelled
  controls, keyboard-operable option pickers and carousel, and full respect for
  `prefers-reduced-motion`.
- **SEO** — per-page titles and descriptions, Open Graph tags for link previews, and
  structured data for the store, the product and the FAQs so they can show as rich
  results in Google.
- **Fast** — no frameworks, one stylesheet, one script, lazy-loaded images,
  non-blocking fonts.
