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
    {{BESTSELLERS}}   the first four products (home page only)
    {{RELATED}}       four related-product cards (product page only)

plus any key from settings.json as {{key}} — e.g. {{whatsapp_number}}.

A product's identity is its FILENAME (data/products/<slug>.json), never
the `id` field inside it. The admin panel's slug is fixed when a product
is created but the `id` field can be edited afterwards, so the two drift
apart and `id` is not unique. The filename is. Every product page, cart
line and checkout lookup keys off the filename slug.

Run `python3 build.py` after editing a template or a data file, and the
finished `.html` pages are rewritten — one product-<slug>.html per product.
"""
import hashlib
import html
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


def stamp_assets(markup):
    for rel in ("assets/css/styles.css", "assets/js/main.js"):
        markup = re.sub(re.escape(rel) + r"(\?v=[0-9a-f]+)?",
                        rel + "?v=" + asset_version(rel), markup)
    return markup


# ---------------------------------------------------------------- content
def load(name):
    with open(os.path.join(ROOT, "data", name)) as fh:
        return json.load(fh)


def load_products():
    """One JSON file per product. The filename (without .json) is the
    product's stable slug — see the module docstring for why the `id`
    field can't be trusted. Sorted by the `order` field the owner
    controls; ties fall back to name so the output is never arbitrary."""
    folder = os.path.join(ROOT, "data", "products")
    items = []
    for name in sorted(os.listdir(folder)):
        if not name.endswith(".json"):
            continue
        with open(os.path.join(folder, name)) as fh:
            p = json.load(fh)
        p["slug"] = name[:-len(".json")]
        items.append(p)
    return sorted(items, key=lambda p: (p.get("order", 9999), p.get("name", "")))


SETTINGS = dict(load("settings.json"))
# The admin types the announcement as plain text; any currency amount in it
# is emphasised here, so nobody has to write HTML into a settings field.
SETTINGS["announcement_html"] = re.sub(r"(₦[\d,]+)", r"<b>\1</b>", SETTINGS["announcement"])

PRODUCTS = load_products()

# Human labels for the collection a product belongs to (its `cat`).
CAT_LABELS = {
    "wavy": "Wavy", "bouncy": "Bouncy", "bonestraight": "Bonestraight",
    "deepwave": "Deepwave", "pixie-curls": "Pixie Curls",
}


def apply_settings(markup):
    for key, value in SETTINGS.items():
        markup = markup.replace("{{%s}}" % key, str(value))
    return markup


HEART = ('<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">'
         '<path d="M12 20s-7-4.4-7-9.3A3.9 3.9 0 0 1 12 8a3.9 3.9 0 0 1 7 2.7C19 15.6 12 20 12 20Z"/></svg>')


def naira(n):
    return "₦" + format(int(n), ",d")


def stars(rating):
    full = int(round(float(rating)))
    return "★" * full + "☆" * (5 - full)


def attr(value):
    """Escape a value going into a double-quoted HTML attribute.

    Lengths carry an inch mark — 20" — which closed the attribute early and
    silently truncated it, so a bag line read "20" instead of the full
    specification."""
    return html.escape(str(value), quote=True)


def product_img(p):
    # The panel stores a site-root path like /assets/img/foo.jpg; pages are
    # served from the root too, so it just needs the leading slash removed.
    # Falls back to the old slug-based convention for anything added by hand.
    return (p.get("image") or "").lstrip("/") or ("assets/img/product-%s-1.jpg" % p["slug"])


def cat_label(p):
    return CAT_LABELS.get(p.get("cat", ""), (p.get("cat") or "").title())


def product_url(p):
    return "product-%s.html" % p["slug"]


def product_card(p, order):
    img = product_img(p)
    tag = ""
    if p.get("tag"):
        cls = "product-card__tag product-card__tag--dark" if p.get("tag_dark") else "product-card__tag"
        tag = '<span class="%s">%s</span>' % (cls, attr(p["tag"]))
    old = '<s>%s</s>' % naira(p["old"]) if p.get("old") else ""
    meta = "%s · %s density" % (p.get("length", ""), p.get("density", ""))
    url = product_url(p)

    # Built with the real values, not placeholders: this string is inserted
    # into the card template by .format(), which does not recurse into what
    # it inserts — leaving {slug} and friends sitting in the markup.
    actions = (
        '<button class="btn btn--dark btn--sm" data-add-to-cart data-id="%s" data-name="%s"\n'
        '                      data-price="%s" data-image="%s" data-meta="%s">Add to Cart</button>'
    ) % (attr(p["slug"]), attr(p["name"]), attr(p["price"]), attr(img), attr(meta))

    return """        <article class="product-card" data-reveal data-category="{cat}" data-price="{price}" data-rating="{rating}" data-order="{order}">
          <div class="product-card__media">
            <a href="{url}"><img src="{img}" alt="{name} luxury human hair wig" loading="lazy" width="900" height="1100"></a>
            {tag}
            <button class="wish" aria-label="Save {name} to wishlist" aria-pressed="false">{heart}</button>
          </div>
          <div class="product-card__body">
            <h3 class="product-card__name"><a href="{url}">{name}</a></h3>
            <span class="rating"><span class="stars" aria-hidden="true">{stars}</span> {rating} <span aria-hidden="true">·</span> {reviews} reviews</span>
            <ul class="spec-list">
              <li class="spec">{length} length</li>
              <li class="spec">{texture}</li>
              <li class="spec">{density} density</li>
            </ul>
            <div class="product-card__foot">
              <span class="price">{price_f}{old}</span>
              {actions}
            </div>
          </div>
        </article>""".format(
        cat=attr(p.get("cat", "")), price=attr(p["price"]), rating=attr(p["rating"]), order=order,
        url=attr(url), img=attr(img), name=attr(p["name"]),
        tag=tag, heart=HEART, stars=stars(p["rating"]), reviews=attr(p["reviews"]),
        length=attr(p.get("length", "")), texture=attr(p.get("texture", "")),
        density=attr(p.get("density", "")), price_f=naira(p["price"]), old=old, actions=actions)


PRODUCT_GRID = "\n\n".join(product_card(p, i) for i, p in enumerate(PRODUCTS))
BESTSELLERS_GRID = "\n\n".join(product_card(p, i) for i, p in enumerate(PRODUCTS[:4]))


def related_grid(current):
    """Four other pieces — never the one being viewed."""
    others = [p for p in PRODUCTS if p["slug"] != current["slug"]][:4]
    return "\n\n".join(product_card(p, i) for i, p in enumerate(others))


# ---------------------------------------------------------------- render index
# index.html is generated like every other page; it just happens to also be
# where the shared chrome is defined, so it is rendered first.
with open(os.path.join(TPL, "index.template.html")) as fh:
    index = fh.read()
index = apply_settings(index)
index = index.replace("{{BESTSELLERS}}", BESTSELLERS_GRID)
index = stamp_assets(index)
with open(os.path.join(ROOT, "index.html"), "w") as fh:
    fh.write(index)

HEAD = slice_between(index, '<link rel="icon"', '\n<script type="application/ld+json">').strip()
HEADER = slice_between(index, "<!-- ============ Announcement ============ -->", '<main id="main">').strip()
# Anchored on the tag, not the numbered comment, so inserting a section
# above the footer cannot silently break the build.
FOOTER = slice_between(index, '<footer class="footer">', "</body>").strip()


def header_for(active_href):
    """The shared header with the right nav item marked as the current page."""
    header = HEADER.replace(
        '<a class="nav__link" href="index.html" aria-current="page">',
        '<a class="nav__link" href="index.html">')
    if active_href:
        header = header.replace(
            '<a class="nav__link" href="%s">' % active_href,
            '<a class="nav__link" href="%s" aria-current="page">' % active_href, 1)
    return header


def finish(page, fname):
    """Guard against a token nobody filled — a stray {{X}} shipping to a
    customer is worse than a failed build."""
    leftover = re.findall(r"\{\{[A-Za-z_]+\}\}", page)
    if leftover:
        raise SystemExit("Unresolved token(s) in %s: %s" % (fname, ", ".join(sorted(set(leftover)))))
    return page


# ---------------------------------------------------------------- simple pages
NAV_TARGETS = {
    "shop.html": "shop.html",
    "contact.html": "contact.html",
}

built = []
for fname in sorted(os.listdir(TPL)):
    if not fname.endswith(".template.html"):
        continue
    if fname in ("index.template.html", "product.template.html"):
        continue  # index rendered above; product pages generated below
    out_name = fname.replace(".template.html", ".html")
    with open(os.path.join(TPL, fname)) as fh:
        page = fh.read()

    page = apply_settings(page)
    page = page.replace("{{HEAD}}", HEAD)
    page = page.replace("{{HEADER}}", header_for(NAV_TARGETS.get(out_name)))
    page = page.replace("{{FOOTER}}", FOOTER)
    page = page.replace("{{PRODUCTS}}", PRODUCT_GRID)
    page = stamp_assets(finish(page, fname))

    with open(os.path.join(ROOT, out_name), "w") as fh:
        fh.write(page)
    built.append(out_name)


# ---------------------------------------------------------------- product pages
with open(os.path.join(TPL, "product.template.html")) as fh:
    PRODUCT_TPL = fh.read()


def long_description(p):
    return ("%s is cut from a single donor and finished by hand, with a "
            "transparent HD lace, a pre-plucked hairline and bleached knots — "
            "ready to wear straight from the box. Choose your colour, length "
            "and density to make it yours." % p["name"])


def short_description(p):
    return ("%s — 100%% premium human hair wig with a pre-plucked hairline "
            "and bleached knots. Choose your colour, length and density." % p["name"])


def eyebrow(p):
    label = "%s Collection" % cat_label(p)
    return "%s · %s" % (p["tag"], label) if p.get("tag") else label


def render_product(p):
    img = product_img(p)
    old = "<s>%s</s>" % naira(p["old"]) if p.get("old") else ""
    save = ""
    if p.get("old") and int(p["old"]) > int(p["price"]):
        save = '<span class="save-pill">Save %s</span>' % naira(int(p["old"]) - int(p["price"]))

    tokens = {
        "PDP_SLUG": attr(p["slug"]),
        "PDP_NAME": attr(p["name"].strip()),
        "PDP_DESC": attr(short_description(p)),
        "PDP_DESC_LONG": html.escape(long_description(p)),
        "PDP_IMG": attr(img),
        "PDP_EYEBROW": attr(eyebrow(p)),
        "PDP_PRICE": naira(p["price"]),
        "PDP_PRICE_RAW": attr(p["price"]),
        "PDP_OLD": old,
        "PDP_SAVE": save,
        "PDP_RATING": attr(p["rating"]),
        "PDP_REVIEWS": attr(p["reviews"]),
        "PDP_STARS": stars(p["rating"]),
    }

    page = PRODUCT_TPL
    page = apply_settings(page)
    page = page.replace("{{HEAD}}", HEAD)
    page = page.replace("{{HEADER}}", header_for("shop.html"))
    page = page.replace("{{FOOTER}}", FOOTER)
    page = page.replace("{{RELATED}}", related_grid(p))
    for key, value in tokens.items():
        page = page.replace("{{%s}}" % key, str(value))
    return stamp_assets(finish(page, "product.template.html"))


product_pages = []
for p in PRODUCTS:
    out_name = product_url(p)
    with open(os.path.join(ROOT, out_name), "w") as fh:
        fh.write(render_product(p))
    product_pages.append(out_name)

# A bare product.html is kept as a fallback for any old bookmark or stray
# link — it shows the first product rather than 404-ing.
if PRODUCTS:
    with open(os.path.join(ROOT, "product.html"), "w") as fh:
        fh.write(render_product(PRODUCTS[0]))

print("Built: index.html, " + ", ".join(built))
print("Product pages: %d (+ product.html fallback)" % len(product_pages))
