# StrandsBySise — Luxury Wig Boutique

A hand-built, fully responsive storefront for StrandsBySise. No frameworks, no build
tooling to install, no monthly platform fee — just HTML, one stylesheet and one script.
Open `index.html` in a browser and it works.

**Outstanding work is in [NEXT-STEPS.md](NEXT-STEPS.md)** — start there.

---

## 1. What's in here

```
index.html          Home — hero, collections, best sellers, custom unit
                    builder, packaging unveiling, testimonials, SBS Babes,
                    Hair Bank
shop.html           Full collection with texture filters and sorting
product.html        Product detail — gallery, options, reviews, related
contact.html        Contact form, direct channels, hours, map slot

assets/css/styles.css   The whole design system (one file, sectioned + commented)
assets/js/main.js       Cart, carousels, filters, gallery zoom, accordions, animations
assets/img/             Site photography (some slots still placeholder)
assets/video/           The packaging unveiling clip

admin/              The admin panel served at /admin
api/                Sign-in handlers for the panel (no secrets in here)

data/settings.json  Phone, WhatsApp, email, socials, announcement bar
data/products/      One JSON file per product
data/shipping.json  Delivery options and the international rate table
templates/          Editable sources for every page
build.py            Rebuilds every page from data/ + templates/ (see §4)
tools-generate-placeholders.py   Fills empty image slots (never overwrites)
tools-fit-images.py              Resizes/compresses photos you drop in
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

**Content lives in `data/`, not in the code.** Prices, products, the phone number,
WhatsApp links and the announcement bar are all in `data/settings.json` and
`data/products.json`. Change one there and every page picks it up on the next build.

**Every page is generated**, including `index.html` — edit
`templates/index.template.html`, never `index.html` itself, or the next build
overwrites your change. `templates/index.template.html` is also where the shared
chrome lives (announcement bar, header, mobile menu, footer, cart drawer); the other
pages pull it in automatically. So:

- **Changing the phone number, WhatsApp link, socials or announcement bar?**
  Edit `data/settings.json`, then run:
  ```bash
  python3 build.py
  ```
  Every other page picks the change up. Never edit any `.html` file in the project
  root directly — they are all generated.

- **Changing the words on one page only?**
  Edit that page's file in `templates/` (e.g. `templates/about.template.html`),
  then run `python3 build.py`.

If you'd rather not deal with the build step at all, you can delete `templates/` and
`build.py` and edit the three `.html` files directly — they're complete, standalone
pages. You'll just have to update the header and footer on each one by hand.

## 5. Everyday tasks

### Adding or editing a product

Easiest is the admin panel — Products → New Product. To do it by hand, add a file to
`data/products/`, named after the product's id:

```json
{
  "order": 10, "id": "silk-straight", "name": "Silk Straight", "cat": "bonestraight",
  "price": 185000, "old": null, "rating": 4.9, "reviews": 128,
  "length": "20\"", "texture": "Bonestraight", "density": "180%",
  "tag": "Best Seller", "tag_dark": false
}
```

- `order` — lower numbers come first in the shop. The first four also fill the
  Best Sellers row on the home page.
- `id` — lowercase, hyphenated. Also decides the image filename (below), and the
  file it's stored in.
- `cat` — one of `wavy`, `bouncy`, `bonestraight`, `deepwave`, `pixie-curls`.
  This is what the shop filters and the home page collections use.
- `price` — plain number, no commas or currency symbol.
- `old` — the crossed-out "was" price, or `None`.
- `tag` — the little badge ("New In", "Sale"…), or `None`.
  `tag_dark=True` makes the badge charcoal instead of white.

Save, run `python3 build.py`, and the product appears on the shop page and in the
"related pieces" row.

Its photo should be saved as `assets/img/product-<id>-1.jpg`. The product detail page
uses images `-1` through `-4` for its gallery.

### The hero slideshow

The hero crossfades through four photos, `hero-1.jpg` to `hero-4.jpg`, changing every
6 seconds. `hero-1.jpg` shows first and is the one used for link previews on
WhatsApp and social, so make it your strongest shot.

To change a slide, replace that file. To add or remove one, copy or delete an `<img>`
inside `<div class="hero__frame" data-hero-slides>` in `index.html` — the rotation
counts whatever is there. Only the first slide should carry `fetchpriority="high"`;
the rest stay `loading="lazy"`.

**Shoot these portrait.** The frame is 4:5, so a landscape photo loses its left and
right edges. `hero-3.jpg` is landscape and is cropped this way — if that matters,
replace it with a portrait shot, or use it on the About page instead, where
`.split__media--wide` expects a landscape image. Per-slide framing is nudged with the
`object-position` rules just under `.hero__frame img` in `assets/css/styles.css`.

The slideshow pauses while the browser tab is in the background. Under reduced
motion it still rotates, but cuts between photos instead of fading.

**If the hero looks like it isn't changing, check the four files are actually
different pictures** — `md5 -q assets/img/hero-*.jpg` should print four different
values. Four copies of one photo look exactly like a broken slideshow.

### The photography

The hero slides, the five collection cards and the product cards use real
photography. The reviewer photos still show `IMG_7195.JPG.jpeg` resized
to fit each spot — your own photo, so the site looks like your brand rather than a
template, but it repeats.

**Products currently share their texture's collection photo**, so the two bonestraight
pieces show the same wig, as do the two bouncy and the two wavy. All four gallery
views of a product are that one shot too, which makes the product page's thumbnails
redundant. Shoot each piece separately — front, side, back, styled — and save them as
`product-<id>-1.jpg` through `-4.jpg` to fix both at once.

Replace them one at a time as you shoot more. Drop a new photo into `assets/img/` using
the filename of the slot you want to change, and that spot updates on its own:

| Slot | Filename | Shape | Suggested size |
|---|---|---|---|
| Hero slides | `hero-1..4.jpg` | Portrait 4:5 | 900–1100 wide |
| Collection cards | `collection-{wavy,bouncy,bonestraight,deepwave,pixie-curls}.jpg` | Portrait 4:5 | 760 × 950 |
| Products | `product-<id>-1..4.jpg` | Portrait 3:4 or taller | 760–900 wide |
| Reviewer photos | `avatar-1..5.jpg` | Portrait or square | 240 × 300 |

Both SBS Babes rows use live platform embeds, so they have no image files.

Shoot portrait where you can — every slot is set up for 4:5, and the square and
landscape spots crop from the top so faces stay in frame. If your photos frame the
face higher or lower, adjust `object-position: 50% 15%` near the top of
`assets/css/styles.css`.

Compress before uploading (TinyPNG or Squoosh) — it's the single biggest thing you can
do for page speed. And update the `alt=""` text on any image you change: it's what
screen readers announce and what Google reads.

**To fill any slots that are still empty**, run:

```bash
python3 tools-generate-placeholders.py assets/img/your-photo.jpg
```

It only fills slots with no image yet — **it will never overwrite a photo you've
already put in place.** To deliberately reset every slot back to one source picture,
add `--force`. That flag replaces all your photography, so it's worth being sure.

The original full-size `IMG_7195.JPG.jpeg` is kept in `assets/img/` as the source —
it's 4.7 MB and isn't loaded by any page, so you can delete it once you no longer
need to regenerate from it.

### Changing prices, phone number, social links

All of it lives in `data/settings.json` — phone, WhatsApp number, email, the three
social links, the announcement bar and the Hair Bank group URL. Change a value, run
`python3 build.py`, and every page updates. Product prices are in
`data/products.json`.

### The Hair Bank group — set this link before you go live

The Hair Bank section closes the home page, inviting customers into your
savings-scheme WhatsApp group. **The invite link is a placeholder and must be
replaced**, or the button goes nowhere:

1. Open the group in WhatsApp → **Group info** → **Invite via link** → **Copy link**.
   You'll get something like `https://chat.whatsapp.com/HcW2kL9xYz3AbCdEf`.
2. In `index.html`, find `YOUR-HAIR-BANK-GROUP-INVITE-CODE` and replace the whole URL
   with yours.

The matching FAQ entry ("How does the Hair Bank scheme work?") lives in
`templates/faq.template.html`. Edit the terms there to match how you actually run it,
then run `python3 build.py`.

### The packaging unveiling video

`assets/video/packaging-unveil.mp4` plays in the "Unveiling Our New Packaging"
section. It's 8 MB, which would be punishing to load on a phone — so the video is set
to `preload="none"` and shows a poster image instead. Nothing downloads until someone
presses play, so the section costs the page nothing.

To swap the clip, replace that file (keep it MP4/H.264 — it plays everywhere). Vertical
9:16 suits the frame; other shapes get cropped to fit.

The poster is `assets/img/packaging-poster.jpg`, currently a copy of the packaging photo
rather than a frame from the video, so there's a slight jump when playback starts. To
remove that, screenshot the video's opening frame, save it over that file, and run
`python3 tools-fit-images.py packaging-poster` — you'll need to add it to `SLOTS` in
`tools-generate-placeholders.py` first, or just compress it yourself.

### The SBS Babes carousels

**Instagram row — real embeds.** Nine posts play inline on the page, video and all,
using Instagram's own embed. The links live on the `<iframe src>` inside `index.html`;
to swap a post, change its URL (keep the trailing `embed/`). To add or remove one,
copy or delete a whole `<div class="social-embed">` block.

The iframe is deliberately taller than the frame around it. Instagram's embed renders a
profile header, then the media, then a tall caption and comment block — we show the
first two and clip the rest. Only the bottom is truncated, so if Instagram changes that
tail the layout still holds. If a card ever looks wrong, adjust the `height` on
`.social-embed` in `assets/css/styles.css`.

Two trade-offs worth knowing. Embeds load from Instagram, so the row is slower than
plain images and sets Meta cookies — if you ever add a cookie banner, this is the part
that needs consent. And a post that gets deleted or set to private shows an empty card,
so it's worth a glance now and then.

**TikTok row — real embeds.** Four videos play inline the same way. TikTok's embed
needs the numeric video id, not a `vt.tiktok.com` share link — open the share link in a
browser and the address bar shows the full URL ending in `/video/7674599998390160647`.
That number goes in `https://www.tiktok.com/embed/v2/<id>`. The canonical URL is kept
in an HTML comment above each iframe so you can tell which video is which.

**Adjusting the crop.** Each row's visible height is one variable. In
`assets/css/styles.css`, `--embed-h` on `.social-embed` controls the Instagram row and
`--embed-h` on `.social-embed--tiktok` the TikTok row. TikTok's frame is taller because
it centres its player lower down. If a card ever shows too much caption or cuts the
video, change that one number.

### The custom unit builder

The "Create a Custom Unit" section on the home page collects a full specification —
hair grade, hair type, length, weight, a colour reference picture, plus the customer's
name, number and notes — and opens WhatsApp with it all written out, so you receive a
tidy brief instead of a back-and-forth.

Two things to know:

**The length list follows the grade.** Virgin hair offers 10"–30" and raw hair 10"–40",
in 2" steps. If a customer picks 38" as raw and then switches to virgin, the length
resets rather than leaving an impossible order. To change these ranges, edit the
`data-max` values on the grade buttons in `index.html`.

**The colour picture is not sent automatically.** A static site has no server to receive
an upload, and WhatsApp links can carry text but not attachments. So the customer picks
their picture, sees it previewed, and the message says they're sending it — then they
attach it in the chat that opens. If you'd rather the photo arrive by itself, a paid
Formspree plan accepts file uploads and would email it to you; point the `<form>` at
their endpoint and remove the WhatsApp handler in `assets/js/main.js`.

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


## 7. The admin panel

Sise edits the site at **strandsbysise.vercel.app/admin** — products, prices, badges,
the WhatsApp number, the announcement bar and the Hair Bank link, from a phone or a
laptop. Saving commits to GitHub, a workflow rebuilds the pages, and Vercel publishes.
About a minute end to end.

### One-time setup

Two steps, both on your own accounts. **I can't do these — they involve a secret that
should only ever be seen by you.**

**1. Create a GitHub OAuth app.** Go to GitHub → Settings → Developer settings →
OAuth Apps → New OAuth App:

| Field | Value |
|---|---|
| Application name | `StrandsBySise Admin` |
| Homepage URL | `https://strandsbysise.vercel.app` |
| Redirect URI | `https://strandsbysise.vercel.app/api/callback` |

Leave *Allow wildcard matching* and *Enable Device Flow* unchecked. Leave *Expire user
access tokens* checked — it's the safer default, and the only effect is having to sign
in again every so often.

Register it, then **Generate a new client secret**. You'll have a Client ID and a
Client Secret. Copy both — the secret is shown only once, and it should never be
pasted into a chat, a file in this repo, or anywhere other than Vercel's settings.

If you later put the site on a custom domain, come back and add a second redirect URI
for it — `https://yourdomain.com/api/callback`.

**2. Give them to Vercel.** In the Vercel project → Settings → Environment Variables,
add two, for all environments:

| Name | Value |
|---|---|
| `GITHUB_CLIENT_ID` | the Client ID |
| `GITHUB_CLIENT_SECRET` | the Client Secret |

Redeploy, then open `/admin` and sign in with GitHub.

Keep the secret out of this repo. It belongs in Vercel's settings only — anything
committed here is public.

### Who can edit

Anyone with write access to the GitHub repo. To let someone else in, add them as a
collaborator on the repository; to remove them, remove that access. There's no separate
password to manage.

### What the panel can and can't do

It edits `data/products.json` and `data/settings.json`, and uploads photos to
`assets/img`. That covers prices, products, badges, contact details and links.

It does **not** edit page wording, section layouts or the design — those live in
`templates/` and the stylesheet. Ask for those changes, or edit the templates directly.

### If a change doesn't appear

Saving commits to GitHub, then the **Build site** workflow regenerates the HTML. Check
the repo's Actions tab: a red run means the rebuild failed and the site is still
serving the previous version — which is deliberate, so a bad edit can't take the shop
down. The commit is in `main` either way, so nothing is lost.


## 8. Payments and orders

The shop is a normal online shop: add to cart, checkout, pay by card, bank transfer
or USSD through **Paystack**. WhatsApp is no longer an order route — it remains only
for the Hair Bank group, custom unit enquiries, and as a contact link in the footer.

### How an order flows

1. Customer fills the bag and presses **Checkout**.
2. On `checkout.html` they enter name, phone, email and delivery address.
3. The browser sends **only product ids and quantities** to `/api/checkout`. That
   function prices the order from `data/products/` on the server, so a customer
   editing the page cannot pay ₦1 for a ₦185,000 wig. This is the reason a shop needs
   a server at all.
4. They pay on Paystack, then return to `order-complete.html`, which re-checks the
   payment with Paystack before saying anything — the reference in the URL is not
   trusted on its own.
5. The bag is emptied **only after payment is confirmed**, so an abandoned checkout
   never loses someone's basket.

### The one-time setup

Create a Paystack account and complete business verification, then add the secret key
in Vercel → Settings → Environment Variables:

| Name | Value |
|---|---|
| `PAYSTACK_SECRET_KEY` | your Paystack **secret** key (`sk_live_…`) |

Redeploy afterwards — environment variables only reach the code on a fresh build.

Use the **test** key (`sk_test_…`) first and put a test order through with Paystack's
test cards. Everything works identically; no money moves.

Until that key is set, checkout shows "Payments aren't configured yet. Please contact
us to order." rather than failing silently.

**Never put the secret key in this repo.** It belongs in Vercel's settings only —
anything committed here is public.

### Where orders live

There is no separate database. Each order rides along with its Paystack transaction:
customer name, phone, delivery address, notes and the full item list are attached as
metadata, so your **Paystack dashboard is the order book**. Open any transaction to see
exactly what to ship and where.

That is enough for a boutique, and it has real limits: no stock counts, so nothing
stops the same piece selling twice, and no order status to work through. That's the
point at which a platform like Shopify starts earning its fee.



## 9. Delivery

Three options at checkout:

| Option | Price |
|---|---|
| Benin City | ₦5,000 |
| Elsewhere in Nigeria | ₦15,000 |
| International | By region and parcel weight |

International uses the Parcels Nigeria express table (3–5 business days). The customer
picks a region — UK & Ireland, West Africa, Rest of Africa, USA & Canada, Europe,
Middle East, Asia or Caribbean — and the rate comes from the weight band, plus ₦2,500
packaging. Over 40kg it refuses and asks them to contact you.

**Parcel weight is the sum of each product's `weight_kg`**, editable per product in the
panel and defaulting to 0.4kg. That matters: it decides the band, so an under-estimate
costs you money on every overseas order. Weigh a boxed piece once and set it properly.

Rates live in `data/shipping.json` — the two local prices, the zone list and the whole
table. Edit that file when the carrier changes its prices.

**Both the browser and the server price delivery with the same function**
(`assets/js/shipping.js`), so the figure a customer is shown is the figure they're
charged. The server's answer is the one that counts; the browser's is only for display.

Import duty is charged by the destination country and paid by the recipient — that's
noted at checkout, not added to the total.
