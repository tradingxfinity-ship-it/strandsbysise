#!/usr/bin/env python3
"""StrandsBySise — tiny static build step.

Content lives in `data/`, not in code:

    data/settings.json   phone, WhatsApp, email, socials, announcement bar
    data/products/*.json one file per product

Both are plain files the admin panel at /admin edits and commits. Every
page is generated from `templates/`, so nothing needs hand-editing to
change a price or a phone number.

`templates/index.template.html` is the source of the shared chrome (head
links, announcement bar, header, mobile menu, footer, cart drawer) — it
is rendered first, and the other pages take their chrome from it. Each
template may contain these tokens:

    {{HEAD}}          shared <head> links
    {{HEADER}}        announcement + header + mobile menu
    {{FOOTER}}        footer + cart drawer + floating cart + scripts
    {{PRODUCTS}}      the full product grid (shop page only)
    {{RELATED}}       four related-product cards (product page only)

plus any key from settings.json as {{key}} — e.g. {{whatsapp_number}}.

Run `python3 build.py` after editing a template or a data file, and the
finished `.html` pages are rewritten.
"""
import hashlib
import json
import os
import re

ROOT = os.path.dirname(os.path.abspath(__file__))
TPL = os.path.join(ROOT, "templates")


def slice_between(text, start, end):
    a = text.index(start)
    b = text.index(end, a)
    return text[a:b]


# ---------------------------------------------------------------- cache busting
# Browsers hold on to styles.css and main.js hard, so a returning visitor can
# run week-old JS against fresh HTML. Stamping a content hash onto the asset
# URLs makes every change a new URL, which no cache can serve stale.
def asset_version(rel_path):
    with open(os.path.join(ROOT, rel_path), "rb") as fh:
        return hashlib.md5(fh.read()).hexdigest()[:8]


def stamp_assets(html):
    for rel in ("assets/css/styles.css", "assets/js/main.js"):
        html = re.sub(re.escape(rel) + r"(\?v=[0-9a-f]+)?",
                      rel + "?v=" + asset_version(rel), html)
    return html


# ---------------------------------------------------------------- content
def load(name):
    with open(os.path.join(ROOT, "data", name)) as fh:
        return json.load(fh)


SETTINGS = load("settings.json")


def load_products():
    """One JSON file per product, so the admin panel gets a real
    'New Product' button. Sorted by the `order` field the owner controls;
    ties fall back to name so the output is never arbitrary."""
    folder = os.path.join(ROOT, "data", "products")
    items = []
    for name in sorted(os.listdir(folder)):
        if not name.endswith(".json"):
            continue
        with open(os.path.join(folder, name)) as fh:
            items.append(json.load(fh))
    return sorted(items, key=lambda p: (p.get("order", 9999), p.get("name", "")))


PRODUCTS = load_products()

SETTINGS = dict(SETTINGS)
# The admin types the announcement as plain text; any currency amount in it
# is emphasised here, so nobody has to write HTML into a settings field.
SETTINGS["announcement_html"] = re.sub(r"(₦[\d,]+)", r"<b>\1</b>", SETTINGS["announcement"])


def apply_settings(html):
    for key, value in SETTINGS.items():
        html = html.replace("{{%s}}" % key, str(value))
    return html


# index.html is generated like every other page; it just happens to also be
# where the shared chrome is defined.
with open(os.path.join(ROOT, "templates", "index.template.html")) as fh:
    index = stamp_assets(apply_settings(fh.read()))
with open(os.path.join(ROOT, "index.html"), "w") as fh:
    fh.write(index)

HEAD = slice_between(index, '<link rel="icon"', '\n<script type="application/ld+json">').strip()
HEADER = slice_between(index, "<!-- ============ Announcement ============ -->", '<main id="main">').strip()
# Anchored on the tag, not the numbered comment, so inserting a section
# above the footer cannot silently break the build.
FOOTER = slice_between(index, '<footer class="footer">', "</body>").strip()

HEART = ('<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">'
         '<path d="M12 20s-7-4.4-7-9.3A3.9 3.9 0 0 1 12 8a3.9 3.9 0 0 1 7 2.7C19 15.6 12 20 12 20Z"/></svg>')


def naira(n):
    return "₦" + format(n, ",d")


def stars(rating):
    full = int(round(rating))
    return "★" * full + "☆" * (5 - full)


def product_card(p, order):
    # The panel stores a site-root path like /assets/img/foo.jpg; pages are
    # served from the root too, so it just needs the leading slash removed.
    # Falls back to the old id-based convention for anything added by hand.
    img = (p.get("image") or "").lstrip("/") or ("assets/img/product-%s-1.jpg" % p["id"])
    tag = ""
    if p["tag"]:
        cls = "product-card__tag product-card__tag--dark" if p["tag_dark"] else "product-card__tag"
        tag = '<span class="%s">%s</span>' % (cls, p["tag"])
    old = '<s>%s</s>' % naira(p["old"]) if p["old"] else ""
    meta = "%s · %s density" % (p["length"], p["density"])
    return """        <article class="product-card" data-reveal data-category="{cat}" data-price="{price}" data-rating="{rating}" data-order="{order}">
          <div class="product-card__media">
            <a href="product.html"><img src="{img}" alt="{name} luxury human hair wig" loading="lazy" width="900" height="1100"></a>
            {tag}
            <button class="wish" aria-label="Save {name} to wishlist" aria-pressed="false">{heart}</button>
          </div>
          <div class="product-card__body">
            <h3 class="product-card__name"><a href="product.html">{name}</a></h3>
            <span class="rating"><span class="stars" aria-hidden="true">{stars}</span> {rating} <span aria-hidden="true">·</span> {reviews} reviews</span>
            <ul class="spec-list">
              <li class="spec">{length} length</li>
              <li class="spec">{texture}</li>
              <li class="spec">{density} density</li>
            </ul>
            <div class="product-card__foot">
              <span class="price">{price_f}{old}</span>
              <button class="btn btn--dark btn--sm" data-add-to-cart data-id="{id}" data-name="{name}"
                      data-price="{price}" data-image="{img}" data-meta="{meta}">Add to Cart</button>
            </div>
          </div>
        </article>""".format(
        cat=p["cat"], price=p["price"], rating=p["rating"], order=order, img=img, name=p["name"],
        tag=tag, heart=HEART, stars=stars(p["rating"]), reviews=p["reviews"], length=p["length"],
        texture=p["texture"], density=p["density"], price_f=naira(p["price"]), old=old,
        id=p["id"], meta=meta)


PRODUCT_GRID = "\n\n".join(product_card(p, i) for i, p in enumerate(PRODUCTS))
RELATED_GRID = "\n\n".join(product_card(p, i) for i, p in enumerate(PRODUCTS[1:5]))

# ---------------------------------------------------------------- render
NAV_TARGETS = {
    "shop.html": "shop.html",
    "product.html": "shop.html",
    "contact.html": "contact.html",
}

built = []
for fname in sorted(os.listdir(TPL)):
    if not fname.endswith(".template.html") or fname == "index.template.html":
        continue  # index is rendered above, with its asset hashes stamped
    out_name = fname.replace(".template.html", ".html")
    with open(os.path.join(TPL, fname)) as fh:
        page = fh.read()

    header = HEADER
    current = NAV_TARGETS.get(out_name)
    if current:
        header = header.replace(
            '<a class="nav__link" href="index.html" aria-current="page">',
            '<a class="nav__link" href="index.html">')
        header = header.replace(
            '<a class="nav__link" href="%s">' % current,
            '<a class="nav__link" href="%s" aria-current="page">' % current, 1)

    page = apply_settings(page)
    page = page.replace("{{HEAD}}", HEAD)
    page = page.replace("{{HEADER}}", header)
    page = page.replace("{{FOOTER}}", FOOTER)
    page = page.replace("{{PRODUCTS}}", PRODUCT_GRID)
    page = page.replace("{{RELATED}}", RELATED_GRID)

    leftover = re.findall(r"\{\{[A-Za-z_]+\}\}", page)
    if leftover:
        raise SystemExit("Unresolved token(s) in %s: %s" % (fname, ", ".join(sorted(set(leftover)))))

    with open(os.path.join(ROOT, out_name), "w") as fh:
        fh.write(page)
    built.append(out_name)

print("Built: index.html, " + ", ".join(built))
