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
          meta: [selected("color"), selected("length"), selected("density")].filter(Boolean).join(" · "),
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

  /* --- Shop filters ----------------------------------------- */
  var shop = $("[data-shop]");
  if (shop) {
    var cards = $$("[data-category]", shop);
    var countEl = $("[data-shop-count]");
    $$("[data-filter]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var cat = btn.getAttribute("data-filter");
        $$("[data-filter]").forEach(function (b) { b.setAttribute("aria-checked", String(b === btn)); });
        var shown = 0;
        cards.forEach(function (card) {
          var match = cat === "all" || card.getAttribute("data-category") === cat;
          card.style.display = match ? "" : "none";
          if (match) shown++;
        });
        if (countEl) countEl.textContent = shown + (shown === 1 ? " style" : " styles");
      });
    });

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

  /* --- Footer year ------------------------------------------ */
  $$("[data-year]").forEach(function (el) { el.textContent = String(new Date().getFullYear()); });
})();
