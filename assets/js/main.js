/* =============================================================
   StrandsBySise — site behaviour
   Vanilla JS, no dependencies. Progressive: every feature is
   optional and only binds when its markup exists on the page.
   ============================================================= */
(function () {
  "use strict";

  var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var money = function (n) {
    return "₦" + Number(n).toLocaleString("en-NG", { maximumFractionDigits: 0 });
  };

  /* --- Header shadow on scroll ------------------------------ */
  var header = $(".header");
  if (header) {
    var onScroll = function () {
      header.classList.toggle("is-stuck", window.scrollY > 8);
      var fab = $(".fab");
      if (fab) fab.classList.toggle("is-visible", window.scrollY > 500);
      var sticky = $(".sticky-buy");
      if (sticky) sticky.classList.toggle("is-visible", window.scrollY > 620);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* --- Mobile navigation ------------------------------------ */
  var mobileNav = $(".mobile-nav");
  if (mobileNav) {
    var openNav = function (open) {
      mobileNav.classList.toggle("is-open", open);
      mobileNav.setAttribute("aria-hidden", String(!open));
      document.body.classList.toggle("is-locked", open);
      var toggle = $(".nav__toggle");
      if (toggle) toggle.setAttribute("aria-expanded", String(open));
      if (open) {
        var first = $("a", mobileNav);
        if (first) setTimeout(function () { first.focus(); }, 320);
      }
    };
    $$("[data-nav-open]").forEach(function (b) { b.addEventListener("click", function () { openNav(true); }); });
    $$("[data-nav-close]").forEach(function (b) { b.addEventListener("click", function () { openNav(false); }); });
    $$("a", mobileNav).forEach(function (a) { a.addEventListener("click", function () { openNav(false); }); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && mobileNav.classList.contains("is-open")) openNav(false);
    });
  }

  /* --- Hero slideshow ---------------------------------------
     Everything in this file shares one function scope, so names declared
     with `var` here are visible to every other block. Keep them prefixed:
     a plain `slides` collided with the testimonial carousel's `slides`,
     which reassigned it and left this timer animating the wrong nodes. */
  var heroFrame = $("[data-hero-slides]");
  if (heroFrame) {
    var heroSlides = $$("img", heroFrame);
    if (heroSlides.length > 1) {
      var heroIndex = 0;
      var heroTimer;
      var heroSettle;
      /* Must match the transition duration on .hero__frame img in the CSS.
         Under reduced motion the stylesheet drops that transition, so the
         hold-the-outgoing-slide step is pointless and slides cut instead
         of fading — the photos still rotate, there is just no animation. */
      var FADE_MS = reduceMotion ? 0 : 1800;

      var showHeroSlide = function (i) {
        var outgoing = heroSlides[heroIndex];
        heroIndex = (i + heroSlides.length) % heroSlides.length;

        /* Hold the outgoing frame opaque beneath the incoming one, so the
           blend never dips through the background mid-fade. */
        outgoing.classList.add("is-prev");
        outgoing.classList.remove("is-active");
        heroSlides[heroIndex].classList.add("is-active");

        clearTimeout(heroSettle);
        heroSettle = setTimeout(function () {
          heroSlides.forEach(function (s) {
            if (!s.classList.contains("is-active")) s.classList.remove("is-prev");
          });
        }, FADE_MS);
      };

      var playHero = function () {
        heroTimer = setInterval(function () { showHeroSlide(heroIndex + 1); }, 6000);
      };
      var pauseHero = function () { clearInterval(heroTimer); };

      /* Don't burn cycles advancing a slideshow nobody is looking at. */
      document.addEventListener("visibilitychange", function () {
        pauseHero();
        if (!document.hidden) playHero();
      });

      playHero();
    }
  }

  /* --- Packaging video -------------------------------------- */
  $$("[data-video-frame]").forEach(function (frame) {
    var video = $("video", frame);
    var playBtn = $("[data-video-play]", frame);
    if (!video || !playBtn) return;

    /* The control bar is ugly over a poster still. It ships in the markup
       so the video is usable without JS, and is taken away only once we
       know JS is here to offer the play button instead. */
    video.removeAttribute("controls");

    playBtn.addEventListener("click", function () {
      /* preload="none" means nothing is fetched until this point. */
      video.play();
    });

    /* Track the element rather than the button, so the overlay also
       clears when playback starts from the native controls. */
    video.addEventListener("play", function () {
      frame.classList.add("is-playing");
      video.controls = true;
    });
    video.addEventListener("ended", function () { frame.classList.remove("is-playing"); });
  });

  /* --- Scroll reveal ---------------------------------------- */
  var revealables = $$("[data-reveal]");
  if (revealables.length) {
    if (reduceMotion || !("IntersectionObserver" in window)) {
      revealables.forEach(function (el) { el.classList.add("is-in"); });
    } else {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var el = entry.target;
          var delay = parseFloat(el.getAttribute("data-delay") || "0");
          setTimeout(function () { el.classList.add("is-in"); }, delay * 1000);
          io.unobserve(el);
        });
      }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
      revealables.forEach(function (el) { io.observe(el); });
    }
  }

  /* Stagger children of [data-stagger] automatically */
  $$("[data-stagger]").forEach(function (parent) {
    var step = parseFloat(parent.getAttribute("data-stagger")) || 0.08;
    $$("[data-reveal]", parent).forEach(function (child, i) {
      if (!child.hasAttribute("data-delay")) child.setAttribute("data-delay", String(i * step));
    });
  });

  /* --- Rating bars animate into view ------------------------ */
  var bars = $$(".bar__fill");
  if (bars.length && "IntersectionObserver" in window) {
    var barIo = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.style.width = e.target.getAttribute("data-value") + "%";
        barIo.unobserve(e.target);
      });
    }, { threshold: 0.4 });
    bars.forEach(function (b) { barIo.observe(b); });
  }

  /* --- Button ripple ---------------------------------------- */
  if (!reduceMotion) {
    document.addEventListener("click", function (e) {
      var btn = e.target.closest(".btn");
      if (!btn) return;
      var rect = btn.getBoundingClientRect();
      var size = Math.max(rect.width, rect.height);
      var span = document.createElement("span");
      span.className = "ripple";
      span.style.width = span.style.height = size + "px";
      span.style.left = (e.clientX - rect.left - size / 2) + "px";
      span.style.top = (e.clientY - rect.top - size / 2) + "px";
      btn.appendChild(span);
      setTimeout(function () { span.remove(); }, 700);
    });
  }

  /* --- Toasts ----------------------------------------------- */
  var toastStack = $(".toast-stack");
  function toast(message) {
    if (!toastStack) return;
    var el = document.createElement("div");
    el.className = "toast";
    el.setAttribute("role", "status");
    el.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
      'stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg><span></span>';
    $("span", el).textContent = message;
    toastStack.appendChild(el);
    setTimeout(function () {
      el.classList.add("is-out");
      setTimeout(function () { el.remove(); }, 400);
    }, 2600);
  }

  /* --- Cart -------------------------------------------------- */
  var STORE_KEY = "sbs_cart_v1";
  var cart = [];
  try { cart = JSON.parse(localStorage.getItem(STORE_KEY)) || []; } catch (err) { cart = []; }

  function saveCart() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(cart)); } catch (err) { /* private mode */ }
  }

  function cartCount() {
    return cart.reduce(function (sum, l) { return sum + l.qty; }, 0);
  }

  function cartTotal() {
    return cart.reduce(function (sum, l) { return sum + l.price * l.qty; }, 0);
  }

  function renderCart() {
    var count = cartCount();
    $$(".cart-count").forEach(function (el) {
      el.textContent = String(count);
      el.classList.toggle("is-visible", count > 0);
    });

    var body = $(".drawer__body");
    if (!body) return;

    if (!cart.length) {
      body.innerHTML =
        '<div class="cart-empty"><div class="cart-empty__icon">🤍</div>' +
        "<h3>Your bag is empty</h3>" +
        "<p>Beautiful things are waiting for you.</p>" +
        '<a class="btn btn--outline btn--sm" href="shop.html" style="margin-top:1.25rem">Browse the collection</a></div>';
    } else {
      body.innerHTML = cart.map(function (line, i) {
        return '<div class="cart-line">' +
          '<img src="' + line.image + '" alt="" loading="lazy">' +
          "<div><b>" + line.name + "</b>" +
          "<small>" + line.meta + "</small>" +
          "<small>Qty " + line.qty + "</small>" +
          '<span class="price">' + money(line.price * line.qty) + "</span></div>" +
          '<button class="cart-line__remove" data-remove="' + i + '" aria-label="Remove ' + line.name + '">' +
          '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" ' +
          'stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button></div>';
      }).join("");
    }

    var totalEl = $("[data-cart-total]");
    if (totalEl) totalEl.textContent = money(cartTotal());

    var foot = $(".drawer__foot");
    if (foot) foot.style.display = cart.length ? "" : "none";
  }

  function addToCart(item) {
    var key = item.id + "|" + item.meta;
    var found = cart.filter(function (l) { return l.id + "|" + l.meta === key; })[0];
    if (found) found.qty += item.qty;
    else cart.push(item);
    saveCart();
    renderCart();
    toast(item.name + " added to your bag");
  }

  document.addEventListener("click", function (e) {
    var rm = e.target.closest("[data-remove]");
    if (rm) {
      cart.splice(parseInt(rm.getAttribute("data-remove"), 10), 1);
      saveCart();
      renderCart();
      return;
    }

    var add = e.target.closest("[data-add-to-cart]");
    if (add) {
      e.preventDefault();
      var form = add.closest("[data-product-form]");
      var item;
      if (form) {
        var selected = function (group) {
          var el = $('[data-option="' + group + '"] [aria-checked="true"]', form);
          return el ? (el.getAttribute("data-value") || el.textContent.trim()) : "";
        };
        var qtyInput = $(".qty input", form);
        item = {
          id: form.getAttribute("data-id"),
          name: form.getAttribute("data-name"),
          price: Number(form.getAttribute("data-price")),
          image: form.getAttribute("data-image"),
          meta: [selected("color"), form.getAttribute("data-lace"), form.getAttribute("data-length"), form.getAttribute("data-weight"), form.getAttribute("data-closure")].filter(Boolean).join(" · "),
          qty: qtyInput ? Math.max(1, parseInt(qtyInput.value, 10) || 1) : 1
        };
      } else {
        item = {
          id: add.getAttribute("data-id"),
          name: add.getAttribute("data-name"),
          price: Number(add.getAttribute("data-price")),
          image: add.getAttribute("data-image"),
          meta: add.getAttribute("data-meta") || "",
          qty: 1
        };
      }
      addToCart(item);
      if (add.hasAttribute("data-buy-now")) openDrawer(true);
    }
  });

  /* --- Cart drawer ------------------------------------------ */
  var drawer = $(".drawer");
  var overlay = $(".overlay");
  function openDrawer(open) {
    if (!drawer) return;
    drawer.classList.toggle("is-open", open);
    drawer.setAttribute("aria-hidden", String(!open));
    if (overlay) overlay.classList.toggle("is-open", open);
    document.body.classList.toggle("is-locked", open);
    if (open) {
      var close = $("[data-cart-close]", drawer);
      if (close) setTimeout(function () { close.focus(); }, 250);
    }
  }
  $$("[data-cart-open]").forEach(function (b) {
    b.addEventListener("click", function (e) { e.preventDefault(); openDrawer(true); });
  });
  $$("[data-cart-close]").forEach(function (b) { b.addEventListener("click", function () { openDrawer(false); }); });
  if (overlay) overlay.addEventListener("click", function () { openDrawer(false); });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && drawer && drawer.classList.contains("is-open")) openDrawer(false);
  });

  renderCart();

  /* --- Checkout --------------------------------------------- */
  var checkoutRoot = $("[data-checkout]");
  if (checkoutRoot) {
    var form = $("[data-checkout-form]", checkoutRoot);
    var errorEl = $("[data-checkout-error]", checkoutRoot);
    var payBtn = $("[data-checkout-pay]", checkoutRoot);

    var rules = null;
    var weights = {};
    var chosen = { method: null, zone: null };

    function parcelWeight() {
      return cart.reduce(function (sum, l) {
        return sum + (weights[l.id] || 0.4) * l.qty;
      }, 0);
    }

    function deliveryQuote() {
      if (!rules || !chosen.method) return null;
      return window.SBSShipping.quote(rules, chosen, parcelWeight());
    }

    function renderTotals() {
      $("[data-checkout-subtotal]", checkoutRoot).textContent = money(cartTotal());
      var q = deliveryQuote();
      var feeEl = $("[data-checkout-delivery]", checkoutRoot);
      var labelEl = $("[data-checkout-deliverylabel]", checkoutRoot);
      var noteEl = $("[data-zone-note]", checkoutRoot);

      if (q && q.ok) {
        feeEl.textContent = money(q.amount);
        labelEl.textContent = q.label;
        if (noteEl) noteEl.textContent = q.note || "";
        $("[data-checkout-total]", checkoutRoot).textContent = money(cartTotal() + q.amount);
        $("[data-checkout-paytotal]", checkoutRoot).textContent = money(cartTotal() + q.amount);
      } else {
        feeEl.textContent = q && q.error ? "—" : "—";
        labelEl.textContent = "Delivery";
        if (noteEl) noteEl.textContent = q && q.error ? q.error : "";
        $("[data-checkout-total]", checkoutRoot).textContent = money(cartTotal());
        $("[data-checkout-paytotal]", checkoutRoot).textContent = "";
      }
    }

    function renderDeliveryOptions() {
      var box = $("[data-delivery-options]", checkoutRoot);
      if (!box || !rules) return;
      var options = (rules.local || []).map(function (o) {
        return { id: o.id, label: o.label, detail: o.detail, price: money(o.price) };
      });
      options.push({
        id: "international",
        label: rules.international.label,
        detail: rules.international.detail,
        price: "From " + money(rules.international.bands[0].rates[0])
      });

      box.innerHTML = options.map(function (o) {
        return '<label class="delivery-option">' +
          '<input type="radio" name="delivery" value="' + o.id + '">' +
          "<span><b>" + o.label + "</b><small>" + o.detail + "</small></span>" +
          '<span class="delivery-option__price">' + o.price + "</span></label>";
      }).join("");

      var zoneSel = $("[data-zone]", checkoutRoot);
      zoneSel.innerHTML = '<option value="">Choose a region…</option>' +
        rules.international.zones.map(function (z) {
          return '<option value="' + z.id + '">' + z.label + "</option>";
        }).join("");

      box.addEventListener("change", function (e) {
        chosen.method = e.target.value;
        $("[data-zone-wrap]", checkoutRoot).hidden = chosen.method !== "international";
        renderTotals();
      });
      zoneSel.addEventListener("change", function () {
        chosen.zone = zoneSel.value;
        renderTotals();
      });
    }

    function renderSummary() {
      var box = $("[data-checkout-items]", checkoutRoot);
      if (!cart.length) {
        box.innerHTML = '<p class="form-note">Your bag is empty.</p>';
        if (form) form.hidden = true;
        return;
      }
      box.innerHTML = cart.map(function (l) {
        return '<div class="cart-line">' +
          '<img src="' + l.image + '" alt="" loading="lazy">' +
          "<div><b>" + l.name + "</b><small>" + (l.meta || "") + "</small>" +
          "<small>Qty " + l.qty + '</small><span class="price">' +
          money(l.price * l.qty) + "</span></div></div>";
      }).join("");
      renderTotals();
    }
    renderSummary();

    /* Rates and per-product weights come from the same files the server
       prices from, so the quote shown matches the amount charged. */
    Promise.all([
      fetch("data/shipping.json").then(function (r) { return r.json(); }),
      Promise.all(cart.map(function (l) {
        return fetch("data/products/" + l.id + ".json")
          .then(function (r) { return r.ok ? r.json() : null; })
          .catch(function () { return null; });
      }))
    ]).then(function (out) {
      rules = out[0];
      out[1].forEach(function (p) { if (p) weights[p.id] = Number(p.weight_kg) || 0.4; });
      renderDeliveryOptions();
      renderTotals();
    }).catch(function () {
      var box = $("[data-delivery-options]", checkoutRoot);
      if (box) box.innerHTML = '<p class="form-note">Couldn\'t load delivery options. Please reload.</p>';
    });

    function fail(message) {
      errorEl.textContent = message;
      errorEl.hidden = false;
      payBtn.disabled = false;
      payBtn.textContent = "Try again";
    }

    if (form) {
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        if (!form.checkValidity()) { form.reportValidity(); return; }
        if (!cart.length) { fail("Your bag is empty."); return; }
        var q = deliveryQuote();
        if (!q || !q.ok) { fail((q && q.error) || "Please choose a delivery option."); return; }

        errorEl.hidden = true;
        payBtn.disabled = true;
        payBtn.textContent = "Taking you to payment…";

        /* Only ids, quantities and options are sent. The server prices the
           order from the catalogue, so the total can't be tampered with. */
        fetch("/api/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: cart.map(function (l) { return { id: l.id, qty: l.qty, meta: l.meta }; }),
            delivery: chosen,
            customer: {
              name: $("#co-name").value.trim(),
              email: $("#co-email").value.trim(),
              phone: $("#co-phone").value.trim(),
              address: $("#co-address").value.trim(),
              notes: $("#co-notes").value.trim()
            }
          })
        })
          .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
          .then(function (res) {
            if (!res.ok || !res.d.url) { fail(res.d.error || "Something went wrong. Please try again."); return; }
            /* The bag is cleared only once payment is confirmed, so an
               abandoned checkout doesn't lose someone's basket. */
            window.location.href = res.d.url;
          })
          .catch(function () { fail("Couldn't reach the payment service. Check your connection and try again."); });
      });
    }
  }

  /* --- Order confirmation ----------------------------------- */
  var orderResult = $("[data-order-result]");
  if (orderResult) {
    var reference = new URLSearchParams(window.location.search).get("reference");

    function show(html) { orderResult.innerHTML = html; }

    if (!reference) {
      show('<h1>Nothing to show</h1><p>No order reference was given.</p>' +
           '<a class="btn btn--gold" href="shop.html" style="margin-top:1.5rem">Back to the shop</a>');
    } else {
      fetch("/api/verify?reference=" + encodeURIComponent(reference))
        .then(function (r) { return r.json(); })
        .then(function (d) {
          if (d.status === "success") {
            /* Paid — safe to empty the bag now. */
            cart = [];
            saveCart();
            renderCart();
            show('<span class="eyebrow eyebrow--line">Order confirmed</span>' +
                 "<h1>Thank you" + (d.name ? ", " + d.name.split(" ")[0] : "") + "</h1>" +
                 "<p>We've received your payment of <strong>" + money(d.amount) + "</strong>. " +
                 "A receipt is on its way to your email, and we'll message you to arrange delivery.</p>" +
                 '<p class="form-note" style="margin-top:1rem">Reference: ' + d.reference + "</p>" +
                 '<a class="btn btn--gold" href="shop.html" style="margin-top:1.75rem">Keep shopping</a>');
          } else {
            show("<h1>Payment not completed</h1>" +
                 "<p>Your bag is still saved, so nothing is lost. You can try again whenever you're ready.</p>" +
                 '<a class="btn btn--gold" href="checkout.html" style="margin-top:1.5rem">Back to checkout</a>');
          }
        })
        .catch(function () {
          show("<h1>We couldn't confirm your payment</h1>" +
               "<p>If money left your account, the order went through — send us a message and we'll confirm it.</p>" +
               '<a class="btn btn--outline" href="contact.html" style="margin-top:1.5rem">Contact us</a>');
        });
    }
  }

  /* --- Wishlist toggle -------------------------------------- */
  document.addEventListener("click", function (e) {
    var w = e.target.closest(".wish");
    if (!w) return;
    e.preventDefault();
    var on = w.classList.toggle("is-active");
    w.setAttribute("aria-pressed", String(on));
    toast(on ? "Saved to your wishlist" : "Removed from your wishlist");
  });

  /* --- Option groups (color / length / density) ------------- */
  $$("[data-option]").forEach(function (group) {
    var out = $("[data-option-value]", group.closest(".option") || group);
    group.addEventListener("click", function (e) {
      var opt = e.target.closest("[role='radio']");
      if (!opt) return;
      $$("[role='radio']", group).forEach(function (o) {
        o.setAttribute("aria-checked", String(o === opt));
        o.tabIndex = o === opt ? 0 : -1;
      });
      if (out) out.textContent = opt.getAttribute("data-value") || opt.textContent.trim();
    });
    group.addEventListener("keydown", function (e) {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      var opts = $$("[role='radio']", group);
      var idx = opts.indexOf(document.activeElement);
      if (idx < 0) return;
      e.preventDefault();
      var next = opts[(idx + (e.key === "ArrowRight" ? 1 : opts.length - 1)) % opts.length];
      next.focus();
      next.click();
    });
  });

  /* --- Quantity stepper ------------------------------------- */
  $$(".qty").forEach(function (q) {
    var input = $("input", q);
    $$("button", q).forEach(function (b) {
      b.addEventListener("click", function () {
        var step = b.getAttribute("data-step") === "up" ? 1 : -1;
        input.value = Math.max(1, Math.min(20, (parseInt(input.value, 10) || 1) + step));
      });
    });
  });

  /* --- Product gallery + hover zoom ------------------------- */
  var gallery = $(".gallery");
  if (gallery) {
    var main = $(".gallery__main", gallery);
    var mainImg = $("img", main);

    $$(".thumb", gallery).forEach(function (thumb) {
      thumb.addEventListener("click", function () {
        $$(".thumb", gallery).forEach(function (t) { t.setAttribute("aria-current", String(t === thumb)); });
        var src = thumb.getAttribute("data-full") || $("img", thumb).src;
        mainImg.style.opacity = "0";
        setTimeout(function () {
          mainImg.src = src;
          mainImg.style.opacity = "1";
        }, 180);
      });
    });

    if (window.matchMedia("(hover: hover)").matches) {
      main.addEventListener("mouseenter", function () { main.classList.add("is-zoomed"); });
      main.addEventListener("mouseleave", function () {
        main.classList.remove("is-zoomed");
        mainImg.style.transformOrigin = "center center";
      });
      main.addEventListener("mousemove", function (e) {
        if (!main.classList.contains("is-zoomed")) return;
        var r = main.getBoundingClientRect();
        var x = ((e.clientX - r.left) / r.width) * 100;
        var y = ((e.clientY - r.top) / r.height) * 100;
        mainImg.style.transformOrigin = x + "% " + y + "%";
      });
    }
  }

  /* --- Accordions ------------------------------------------- */
  $$(".acc").forEach(function (acc) {
    var single = acc.hasAttribute("data-single");
    $$(".acc__btn", acc).forEach(function (btn) {
      btn.addEventListener("click", function () {
        var panel = document.getElementById(btn.getAttribute("aria-controls"));
        var open = btn.getAttribute("aria-expanded") === "true";
        if (single && !open) {
          $$(".acc__btn", acc).forEach(function (b) {
            b.setAttribute("aria-expanded", "false");
            var p = document.getElementById(b.getAttribute("aria-controls"));
            if (p) p.setAttribute("data-open", "false");
          });
        }
        btn.setAttribute("aria-expanded", String(!open));
        if (panel) panel.setAttribute("data-open", String(!open));
      });
    });
  });

  /* --- Testimonial carousel --------------------------------- */
  var reviews = $(".reviews");
  if (reviews) {
    var track = $(".reviews__track", reviews);
    var slides = $$(".review", track);
    var prev = $("[data-rev-prev]", reviews);
    var next = $("[data-rev-next]", reviews);
    var dotsWrap = $(".reviews__dots", reviews);
    var index = 0;

    var perView = function () {
      if (window.innerWidth <= 640) return 1;
      if (window.innerWidth <= 1080) return 2;
      return 3;
    };
    var maxIndex = function () { return Math.max(0, slides.length - perView()); };

    function buildDots() {
      if (!dotsWrap) return;
      dotsWrap.innerHTML = "";
      for (var i = 0; i <= maxIndex(); i++) {
        (function (i) {
          var b = document.createElement("button");
          b.type = "button";
          b.setAttribute("aria-label", "Go to review " + (i + 1));
          b.addEventListener("click", function () { go(i); });
          dotsWrap.appendChild(b);
        })(i);
      }
    }

    function go(i) {
      index = Math.max(0, Math.min(maxIndex(), i));
      var slide = slides[0];
      if (!slide) return;
      var gap = parseFloat(getComputedStyle(track).columnGap || "0") || 0;
      track.style.transform = "translateX(" + (-index * (slide.offsetWidth + gap)) + "px)";
      if (prev) prev.disabled = index === 0;
      if (next) next.disabled = index === maxIndex();
      if (dotsWrap) {
        $$("button", dotsWrap).forEach(function (d, di) {
          d.setAttribute("aria-current", String(di === index));
        });
      }
    }

    if (prev) prev.addEventListener("click", function () { go(index - 1); });
    if (next) next.addEventListener("click", function () { go(index + 1); });

    /* Touch swipe */
    var startX = null;
    track.addEventListener("touchstart", function (e) { startX = e.touches[0].clientX; }, { passive: true });
    track.addEventListener("touchend", function (e) {
      if (startX === null) return;
      var dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 45) go(index + (dx < 0 ? 1 : -1));
      startX = null;
    });

    var resizeTimer;
    window.addEventListener("resize", function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () { buildDots(); go(Math.min(index, maxIndex())); }, 150);
    });

    buildDots();
    go(0);
  }

  /* --- SBS Babes social rows -------------------------------- */
  $$("[data-social-row]").forEach(function (row) {
    var track = $("[data-social-track]", row);
    var prev = $("[data-social-prev]", row);
    var next = $("[data-social-next]", row);
    if (!track) return;

    function step() {
      var card = $(".social-card, .social-embed", track);
      if (!card) return track.clientWidth;
      var gap = parseFloat(getComputedStyle(track).columnGap || "0") || 0;
      /* Advance by whole cards, as many as fit minus one for context. */
      var per = Math.max(1, Math.floor(track.clientWidth / (card.offsetWidth + gap)) - 1);
      return (card.offsetWidth + gap) * per;
    }

    function sync() {
      var max = track.scrollWidth - track.clientWidth;
      if (prev) prev.disabled = track.scrollLeft <= 2;
      if (next) next.disabled = track.scrollLeft >= max - 2;
    }

    /* Animated by hand rather than with `behavior: "smooth"`: scroll
       snapping cancels the native smooth scroll in some browsers and
       springs the track back to where it started. */
    var raf, guard;
    function nudge(dir) {
      var max = track.scrollWidth - track.clientWidth;
      var from = track.scrollLeft;
      var to = Math.max(0, Math.min(max, from + dir * step()));
      if (to === from) return;

      if (reduceMotion) { track.scrollLeft = to; sync(); return; }

      cancelAnimationFrame(raf);
      clearTimeout(guard);
      var snap = track.style.scrollSnapType;
      track.style.scrollSnapType = "none";
      var start = performance.now();
      var dur = 520;
      var done = false;

      /* The eased scroll is a nicety; landing on `to` is not. If frames
         never arrive (hidden tab, throttled renderer) this still ends up
         in the right place with snapping restored. */
      function finish() {
        if (done) return;
        done = true;
        cancelAnimationFrame(raf);
        track.scrollLeft = to;
        track.style.scrollSnapType = snap;
        sync();
      }
      guard = setTimeout(finish, dur + 120);

      raf = requestAnimationFrame(function frame(now) {
        if (done) return;
        var p = Math.min(1, (now - start) / dur);
        track.scrollLeft = from + (to - from) * (1 - Math.pow(1 - p, 3));
        if (p < 1) raf = requestAnimationFrame(frame);
        else finish();
      });
    }

    if (prev) prev.addEventListener("click", function () { nudge(-1); });
    if (next) next.addEventListener("click", function () { nudge(1); });

    var tick;
    track.addEventListener("scroll", function () {
      clearTimeout(tick);
      tick = setTimeout(sync, 80);
    }, { passive: true });

    window.addEventListener("resize", function () { clearTimeout(tick); tick = setTimeout(sync, 150); });
    sync();
  });

  /* --- Shop filters ----------------------------------------- */
  var shop = $("[data-shop]");
  if (shop) {
    var cards = $$("[data-category]", shop);
    var countEl = $("[data-shop-count]");
    var filterBtns = $$("[data-filter]");

    function applyFilter(cat) {
      /* Fall back to "all" for an unknown category, so a stale link can't
         leave the shop showing nothing. */
      if (!filterBtns.some(function (b) { return b.getAttribute("data-filter") === cat; })) {
        cat = "all";
      }
      filterBtns.forEach(function (b) {
        b.setAttribute("aria-checked", String(b.getAttribute("data-filter") === cat));
      });
      var shown = 0;
      cards.forEach(function (card) {
        var match = cat === "all" || card.getAttribute("data-category") === cat;
        card.style.display = match ? "" : "none";
        if (match) shown++;
      });
      if (countEl) countEl.textContent = shown + (shown === 1 ? " style" : " styles");
    }

    filterBtns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        applyFilter(btn.getAttribute("data-filter"));
      });
    });

    /* The home page links here as shop.html#wavy, so honour that on arrival —
       and if they switch category by hash while already here. */
    function filterFromHash() {
      var cat = (location.hash || "").replace(/^#/, "");
      if (cat) applyFilter(cat);
    }
    filterFromHash();
    window.addEventListener("hashchange", filterFromHash);

    var sortSel = $("[data-sort]");
    if (sortSel) {
      var grid = cards[0] ? cards[0].parentNode : null;
      sortSel.addEventListener("change", function () {
        if (!grid) return;
        var mode = sortSel.value;
        cards.slice().sort(function (a, b) {
          var pa = Number(a.getAttribute("data-price"));
          var pb = Number(b.getAttribute("data-price"));
          if (mode === "low") return pa - pb;
          if (mode === "high") return pb - pa;
          if (mode === "rating") return Number(b.getAttribute("data-rating")) - Number(a.getAttribute("data-rating"));
          return Number(a.getAttribute("data-order")) - Number(b.getAttribute("data-order"));
        }).forEach(function (c) { grid.appendChild(c); });
      });
    }
  }

  /* --- Create a Custom Unit --------------------------------- */
  var custom = $("[data-custom-form]");
  if (custom) {
    /* The real number is injected into data-wa from settings.json at build
       time, so updating it in the admin panel updates this button too. */
    var WA_NUMBER = custom.getAttribute("data-wa") || "2348030000000";
    var grades = $("[data-custom-grade]", custom);
    var lengthSel = $("[data-custom-length]", custom);
    var hint = $("[data-grade-hint]", custom);
    var fileInput = $("[data-colour-input]", custom);
    var zone = $("[data-dropzone]", custom);
    var preview = $(".dropzone__preview", custom);
    var empty = $(".dropzone__empty", custom);

    /* Length choices depend on grade: raw reaches 40", virgin 30". */
    function fillLengths() {
      var checked = $("[aria-checked='true']", grades);
      var max = parseInt(checked ? checked.getAttribute("data-max") : "30", 10);
      var keep = lengthSel.value;
      lengthSel.innerHTML = "";
      for (var n = 10; n <= max; n += 2) {
        var o = document.createElement("option");
        o.value = o.textContent = n + '"';
        lengthSel.appendChild(o);
      }
      /* Keep the chosen length if the new grade still offers it. */
      lengthSel.value = keep && parseInt(keep, 10) <= max ? keep : '20"';
      if (hint && checked) {
        hint.textContent = checked.getAttribute("data-value") +
          ' is available from 10" to ' + max + '".';
      }
    }
    if (grades) grades.addEventListener("click", function () { setTimeout(fillLengths, 0); });
    fillLengths();

    /* Colour reference preview */
    function showFile(file) {
      if (!file || file.type.indexOf("image/") !== 0) return;
      $("[data-colour-preview]", custom).src = URL.createObjectURL(file);
      $("[data-colour-name]", custom).textContent = file.name;
      preview.hidden = false;
      empty.hidden = true;
    }
    if (fileInput) {
      fileInput.addEventListener("change", function () { showFile(fileInput.files[0]); });
    }
    if (zone) {
      ["dragenter", "dragover"].forEach(function (ev) {
        zone.addEventListener(ev, function (e) { e.preventDefault(); zone.classList.add("is-dragging"); });
      });
      ["dragleave", "drop"].forEach(function (ev) {
        zone.addEventListener(ev, function (e) { e.preventDefault(); zone.classList.remove("is-dragging"); });
      });
      zone.addEventListener("drop", function (e) {
        var file = e.dataTransfer && e.dataTransfer.files[0];
        if (!file) return;
        try { fileInput.files = e.dataTransfer.files; } catch (err) { /* older browsers */ }
        showFile(file);
      });
    }

    custom.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!custom.checkValidity()) { custom.reportValidity(); return; }

      var pick = function (group) {
        var el = $("[data-option='" + group + "'] [aria-checked='true']", custom);
        return el ? el.getAttribute("data-value") : "";
      };
      var val = function (sel) { var el = $(sel, custom); return el ? el.value.trim() : ""; };

      var lines = [
        "Hello StrandsBySise, I'd like a custom unit.",
        "",
        "Name: " + val("#cu-name"),
        "Phone: " + val("#cu-phone"),
        "Hair grade: " + pick("grade"),
        "Hair type: " + pick("type"),
        "Lace type: " + pick("lace"),
        "Length: " + val("#cu-length"),
        "Weight: " + val("#cu-weight"),
        "Closure: " + val("#cu-closure")
      ];
      var notes = val("#cu-notes");
      if (notes) lines.push("Notes: " + notes);
      lines.push("");
      lines.push(fileInput && fileInput.files[0]
        ? "Colour reference: sending the picture now."
        : "Colour reference: I'll send a picture shortly.");

      window.open("https://wa.me/" + WA_NUMBER + "?text=" + encodeURIComponent(lines.join("\n")),
                  "_blank", "noopener");

      toast(fileInput && fileInput.files[0]
        ? "Opening WhatsApp — attach your colour picture there"
        : "Opening WhatsApp with your specification");
    });
  }

  /* --- Forms (demo handlers) -------------------------------- */
  $$("[data-demo-form]").forEach(function (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!form.checkValidity()) { form.reportValidity(); return; }
      toast(form.getAttribute("data-demo-form"));
      form.reset();
    });
  });

  /* --- Elegant page transition ------------------------------ */
  if (!reduceMotion) {
    var veil = document.createElement("div");
    veil.className = "veil";
    document.body.appendChild(veil);
    requestAnimationFrame(function () { veil.classList.remove("is-on"); });

    document.addEventListener("click", function (e) {
      var a = e.target.closest("a");
      if (!a) return;
      var href = a.getAttribute("href");
      if (!href || a.target === "_blank" || a.hasAttribute("download")) return;
      if (href.charAt(0) === "#" || /^(mailto:|tel:|https?:)/.test(href)) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      e.preventDefault();
      veil.classList.add("is-on");
      setTimeout(function () { window.location.href = href; }, 260);
    });

    window.addEventListener("pageshow", function (ev) {
      if (ev.persisted) veil.classList.remove("is-on");
    });
  }

  /* --- Reels (tap a muted clip for sound) ------------------- */
  var reels = $$("[data-reel]");
  if (reels.length) {
    /* Play each muted clip only while it's on screen — reliable autoplay
       across browsers, and no wasted bandwidth on off-screen video. */
    if ("IntersectionObserver" in window) {
      var reelObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          var v = $("video", entry.target);
          if (!v) return;
          if (entry.isIntersecting) {
            var p = v.play();
            if (p && p.catch) p.catch(function () {});
          } else {
            v.pause();
          }
        });
      }, { threshold: 0.4 });
      reels.forEach(function (reel) { reelObserver.observe(reel); });
    }

    reels.forEach(function (reel) {
      var video = $("video", reel);
      if (!video) return;
      reel.addEventListener("click", function () {
        var turnOn = video.muted;
        /* Only one clip plays sound at a time. */
        reels.forEach(function (other) {
          var v = $("video", other);
          if (v && other !== reel) { v.muted = true; other.classList.remove("is-unmuted"); }
        });
        video.muted = !turnOn;
        reel.classList.toggle("is-unmuted", turnOn);
        var p = video.play();
        if (p && p.catch) p.catch(function () { /* autoplay/interaction guard */ });
      });
    });
  }

  /* --- Footer year ------------------------------------------ */
  $$("[data-year]").forEach(function (el) { el.textContent = String(new Date().getFullYear()); });

  /* --- Anniversary popup ------------------------------------ */
  /* Shown once per browsing session, so moving between pages doesn't
     re-trigger it but a fresh visit does. */
  var celebrate = $("[data-celebrate]");
  if (celebrate) {
    var SEEN = "sbs_anniv_seen";
    var already = false;
    try { already = sessionStorage.getItem(SEEN) === "1"; } catch (err) { /* private mode */ }

    var openCelebrate = function () {
      celebrate.hidden = false;
      document.body.classList.add("is-locked");
      try { sessionStorage.setItem(SEEN, "1"); } catch (err) { /* private mode */ }
      var closeBtn = $(".celebrate__close", celebrate);
      if (closeBtn) closeBtn.focus();
      launchConfetti();
    };
    var closeCelebrate = function () {
      celebrate.hidden = true;
      document.body.classList.remove("is-locked");
    };

    function launchConfetti() {
      if (reduceMotion) return;
      var canvas = $("[data-confetti]", celebrate);
      if (!canvas) return;
      var colors = ["#d4af37", "#b8942a", "#fdeef5", "#f6c9dc", "#2b2b2b", "#ffffff", "#e8c877"];
      for (var i = 0; i < 110; i++) {
        var p = document.createElement("span");
        p.className = "confetti";
        p.style.left = Math.random() * 100 + "%";
        p.style.background = colors[i % colors.length];
        p.style.setProperty("--dur", (2.4 + Math.random() * 2.4).toFixed(2) + "s");
        p.style.setProperty("--delay", (Math.random() * 0.9).toFixed(2) + "s");
        p.style.setProperty("--drift", Math.round((Math.random() * 2 - 1) * 140) + "px");
        p.style.setProperty("--rot", Math.round(360 + Math.random() * 720) + "deg");
        if (i % 3 === 0) p.style.borderRadius = "50%";
        canvas.appendChild(p);
      }
      /* Take the pieces back out once they've fallen. */
      setTimeout(function () { canvas.innerHTML = ""; }, 7000);
    }

    $$("[data-celebrate-close]").forEach(function (b) {
      b.addEventListener("click", closeCelebrate);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !celebrate.hidden) closeCelebrate();
    });

    if (!already) setTimeout(openCelebrate, 700);
  }
})();
