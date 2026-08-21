#!/usr/bin/env python3
"""StrandsBySise — tiny static build step.

`index.html` is the source of truth for the shared chrome (head links,
announcement bar, header, mobile menu, footer, cart drawer). Every other
page is written as a template containing these tokens:

    {{HEAD}}          shared <head> links
    {{HEADER}}        announcement + header + mobile menu
    {{FOOTER}}        footer + cart drawer + floating cart + scripts
    {{PRODUCTS}}      the full product grid (shop page only)
    {{RELATED}}       four related-product cards (product page only)

Run `python3 build.py` after editing a `*.template.html` file and the
finished `.html` pages are rewritten. Templates live in `templates/`.
"""
import hashlib
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


with open(os.path.join(ROOT, "index.html")) as fh:
    index = fh.read()

# index.html is hand-edited, so stamp it in place before anything is copied
# out of it into the other pages.
stamped = stamp_assets(index)
if stamped != index:
    with open(os.path.join(ROOT, "index.html"), "w") as fh:
        fh.write(stamped)
    index = stamped

HEAD = slice_between(index, '<link rel="icon"', '\n<script type="application/ld+json">').strip()
HEADER = slice_between(index, "<!-- ============ Announcement ============ -->", '<main id="main">').strip()
# Anchored on the tag, not the numbered comment, so inserting a section
# above the footer cannot silently break the build.
FOOTER = slice_between(index, '<footer class="footer">', "</body>").strip()

# ---------------------------------------------------------------- catalogue
PRODUCTS = [
    dict(id="silk-straight", name="Silk Straight", cat="straight", price=185000, old=None,
         rating=4.9, reviews=128, length='20"', texture="Straight", density="180%",
         tag="Best Seller", tag_dark=False),
    dict(id="cascade-curls", name="Cascade Curls", cat="curly", price=215000, old=None,
         rating=4.8, reviews=96, length='22"', texture="Curly", density="200%",
         tag="New In", tag_dark=True),
    dict(id="body-wave-luxe", name="Body Wave Luxe", cat="body-wave", price=245000, old=275000,
         rating=4.9, reviews=141, length='24"', texture="Body wave", density="180%",
         tag=None, tag_dark=False),
    dict(id="blunt-bob", name="Blunt Bob", cat="bob", price=135000, old=None,
         rating=4.7, reviews=73, length='12"', texture="Straight", density="150%",
         tag="Editor's Pick", tag_dark=False),
    dict(id="closure-classic", name="Closure Classic", cat="closure", price=165000, old=None,
         rating=4.8, reviews=88, length='18"', texture="Straight", density="180%",
         tag=None, tag_dark=False),
    dict(id="frontal-glam", name="Frontal Glam", cat="frontal", price=268000, old=None,
         rating=4.9, reviews=112, length='26"', texture="Body wave", density="200%",
         tag="Signature", tag_dark=True),
    dict(id="deep-wave", name="Deep Wave Dream", cat="body-wave", price=232000, old=None,
         rating=4.8, reviews=64, length='22"', texture="Deep wave", density="200%",
         tag=None, tag_dark=False),
    dict(id="pixie-chic", name="Pixie Chic", cat="bob", price=112000, old=135000,
         rating=4.6, reviews=41, length='8"', texture="Straight", density="150%",
         tag="Sale", tag_dark=False),
]

HEART = ('<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">'
         '<path d="M12 20s-7-4.4-7-9.3A3.9 3.9 0 0 1 12 8a3.9 3.9 0 0 1 7 2.7C19 15.6 12 20 12 20Z"/></svg>')


def naira(n):
    return "₦" + format(n, ",d")


def stars(rating):
    full = int(round(rating))
    return "★" * full + "☆" * (5 - full)


def product_card(p, order):
    img = "assets/img/product-%s-1.jpg" % p["id"]
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
    "about.html": "about.html",
    "faq.html": "faq.html",
    "contact.html": "contact.html",
}

built = []
for fname in sorted(os.listdir(TPL)):
    if not fname.endswith(".template.html"):
        continue
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

    page = page.replace("{{HEAD}}", HEAD)
    page = page.replace("{{HEADER}}", header)
    page = page.replace("{{FOOTER}}", FOOTER)
    page = page.replace("{{PRODUCTS}}", PRODUCT_GRID)
    page = page.replace("{{RELATED}}", RELATED_GRID)

    leftover = re.findall(r"\{\{[A-Z_]+\}\}", page)
    if leftover:
        raise SystemExit("Unresolved token(s) in %s: %s" % (fname, ", ".join(sorted(set(leftover)))))

    with open(os.path.join(ROOT, out_name), "w") as fh:
        fh.write(page)
    built.append(out_name)

print("Built: " + ", ".join(built))
