/* ============================================================
   PDP functionality — sit-stand desk configurator
   (multi-group options, live price, qty stepper, gallery,
    accordions, sticky buycard)
   ============================================================ */
(function () {
  "use strict";

  var BASE_PRICE = 340; // basisprijs in euro's (Elektrisch 'Basic' 120x80, excl. btw)

  var addBtn = document.getElementById("addBtn");
  var addBtnLabel = addBtn ? addBtn.querySelector(".btn-cart__label") : null;
  var livePrice = document.getElementById("livePrice");
  var selectedPrice = document.getElementById("selectedPrice");
  var leasePrice = document.getElementById("leasePrice");
  var LEASE_MONTHS = 60; // leasetermijn in maanden
  var mobileAddBtn = document.getElementById("mobileAddBtn");
  var mobileLivePrice = document.getElementById("mobileLivePrice");

  function setCartLabel(text) {
    if (addBtnLabel) addBtnLabel.textContent = text;
    else if (addBtn) addBtn.textContent = text;
  }

  /* ---- Configurator state ----
     Required groups must all be chosen before "In winkelwagen".
     Each chosen option carries a data-price delta; add-ons stack. */
  function collectRequiredGroups() {
    var groups = {};
    document.querySelectorAll("[data-group][data-required='1']").forEach(function (el) {
      groups[el.dataset.group] = false; // not yet chosen
    });
    return groups;
  }
  var requiredChosen = collectRequiredGroups();

  function recalcPrice() {
    var total = BASE_PRICE;

    // pill / swatch groups (active button carries data-price)
    document.querySelectorAll(".js-optgroup").forEach(function (group) {
      var active = group.querySelector(".pill--active, .swatch--active");
      if (active) total += parseInt(active.dataset.price || "0", 10);
    });

    // custom dropdowns (cselect)
    document.querySelectorAll(".js-cselect").forEach(function (cs) {
      var sel = cs.querySelector(".cselect__option.is-selected");
      if (sel && sel.dataset.price) total += parseInt(sel.dataset.price, 10);
    });

    // add-ons (checkboxes)
    document.querySelectorAll(".js-addon:checked").forEach(function (cb) {
      total += parseInt(cb.dataset.price || "0", 10);
    });

    if (livePrice) livePrice.textContent = total;
    if (selectedPrice) selectedPrice.textContent = total;
    if (mobileLivePrice) mobileLivePrice.textContent = total;
    if (leasePrice) leasePrice.textContent = Math.ceil(total / LEASE_MONTHS);
    // incl. btw bedrag (21%), met 2 decimalen NL-notatie
    var incl = document.getElementById("livePriceIncl");
    if (incl) incl.textContent = (total * 1.21).toFixed(2).replace(".", ",");
    return total;
  }

  function allRequiredChosen() {
    return Object.keys(requiredChosen).every(function (k) {
      return requiredChosen[k] === true;
    });
  }

  function validate() {
    if (!addBtn) return;
    var ok = allRequiredChosen();
    addBtn.disabled = !ok;
    setCartLabel(ok ? "In het winkelmandje" : "Kies eerst je opties");
    if (mobileAddBtn) {
      mobileAddBtn.disabled = !ok;
      mobileAddBtn.textContent = ok ? "In het winkelmandje" : "Kies eerst je opties";
    }
  }

  /* ---- Pill & swatch groups (single choice per group) ---- */
  document.querySelectorAll(".js-optgroup").forEach(function (group) {
    var groupName = group.dataset.group;
    var cls = group.classList.contains("swatches") ? "swatch" : "pill";
    group.addEventListener("click", function (e) {
      var btn = e.target.closest("." + cls);
      if (!btn) return;
      if (btn.classList.contains("swatch--more")) return; // 'meer' opent drawer, geen kleuzekeuze
      e.preventDefault();
      group.querySelectorAll("." + cls).forEach(function (b) {
        if (b.classList.contains("swatch--more")) return;
        b.classList.remove(cls + "--active");
      });
      btn.classList.add(cls + "--active");
      // update label if present
      var label = document.querySelector('.js-val[data-for="' + groupName + '"]');
      if (label) label.textContent = btn.dataset.value;
      if (group.dataset.required === "1") requiredChosen[groupName] = true;
      recalcPrice();
      validate();
    });
  });

  /* ---- Custom dropdowns (cselect) ---- */
  function closeAllCselects(except) {
    document.querySelectorAll(".js-cselect.is-open").forEach(function (cs) {
      if (cs === except) return;
      cs.classList.remove("is-open");
      var trg = cs.querySelector(".js-cselect-trigger");
      var lst = cs.querySelector(".cselect__list");
      if (trg) trg.setAttribute("aria-expanded", "false");
      if (lst) lst.hidden = true;
    });
  }

  document.querySelectorAll(".js-cselect").forEach(function (cs) {
    var trigger = cs.querySelector(".js-cselect-trigger");
    var list = cs.querySelector(".cselect__list");
    var valueEl = cs.querySelector(".cselect__value");
    var groupName = cs.dataset.group;

    trigger.addEventListener("click", function (e) {
      e.stopPropagation();
      var willOpen = !cs.classList.contains("is-open");
      closeAllCselects(cs);
      cs.classList.toggle("is-open", willOpen);
      trigger.setAttribute("aria-expanded", String(willOpen));
      list.hidden = !willOpen;
    });

    list.addEventListener("click", function (e) {
      var opt = e.target.closest(".cselect__option");
      if (!opt) return;
      list.querySelectorAll(".cselect__option").forEach(function (o) {
        o.classList.remove("is-selected");
        o.setAttribute("aria-selected", "false");
      });
      opt.classList.add("is-selected");
      opt.setAttribute("aria-selected", "true");
      valueEl.textContent = opt.textContent;
      cs.classList.remove("is-open");
      trigger.setAttribute("aria-expanded", "false");
      list.hidden = true;
      if (cs.dataset.required === "1") requiredChosen[groupName] = true;
      recalcPrice();
      validate();
    });
  });

  // klik buiten een dropdown sluit alles
  document.addEventListener("click", function () { closeAllCselects(null); });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeAllCselects(null);
  });

  /* ---- Add-ons (stackable checkboxes) ---- */
  document.querySelectorAll(".js-addon").forEach(function (cb) {
    cb.addEventListener("change", function () { recalcPrice(); });
  });

  /* ---- Accessoires in-/uitklappen ---- */
  document.querySelectorAll(".js-addon-toggle").forEach(function (btn) {
    var list = btn.parentNode.querySelector(".js-addon-list");
    btn.addEventListener("click", function () {
      var open = btn.getAttribute("aria-expanded") === "true";
      btn.setAttribute("aria-expanded", String(!open));
      if (list) list.hidden = open;
    });
  });

  /* ---- Add-to-cart ---- */
  function addToCart() {
    if (!addBtn || addBtn.disabled) return;
    setCartLabel("Toegevoegd \u2713");
    if (mobileAddBtn) mobileAddBtn.textContent = "Toegevoegd \u2713";
    setTimeout(function () {
      setCartLabel("In het winkelmandje");
      if (mobileAddBtn) mobileAddBtn.textContent = "In het winkelmandje";
    }, 1500);
  }
  if (addBtn) addBtn.addEventListener("click", addToCart);
  if (mobileAddBtn) mobileAddBtn.addEventListener("click", addToCart);

  /* ---- Kolom-uitlijning: de sticky rechterkolom (buycard) moet exact gelijk
     met de onderkant van de linkerkolom (gallery + actieve tab) stoppen.
     We meten beide kolommen en zetten de buycard via translateY zo dat zijn
     onderkant nooit voorbij de linkerkolom-bodem komt. ---- */
  var colLeft = document.querySelector(".pdp-col-left");
  var buycard = document.querySelector(".pdp-buycard");
  var STICKY_TOP = 130;          // moet matchen met de gewenste afstand vanaf de bovenkant

  // Document-absolute posities (onafhankelijk van scrollpositie), gemeten met
  // transform op 0 zodat we de natuurlijke layout krijgen.
  var geom = { leftBottom: 0, cardTop: 0, cardBottom: 0, gridTop: 0 };

  function measure() {
    if (!colLeft || !buycard) return;
    buycard.style.transform = "";          // reset voor een schone meting
    var y = window.pageYOffset;
    var lr = colLeft.getBoundingClientRect();
    var cr = buycard.getBoundingClientRect();
    geom.gridTop = lr.top + y;
    geom.leftBottom = lr.bottom + y;
    geom.cardTop = cr.top + y;
    geom.cardBottom = cr.bottom + y;
  }

  function onScroll() {
    if (!colLeft || !buycard) return;
    if (window.matchMedia("(max-width: 768px)").matches) {
      buycard.style.transform = "";
      return;
    }
    var y = window.pageYOffset;
    // gewenste document-positie van de buycard-bovenkant: STICKY_TOP onder de
    // viewport-top, maar nooit zo ver dat zijn onderkant voorbij de
    // linkerkolom-bodem komt.
    var maxCardTop = geom.leftBottom - (geom.cardBottom - geom.cardTop);
    var wantTop = Math.min(y + STICKY_TOP, maxCardTop);
    var offset = Math.max(0, wantTop - geom.cardTop);
    buycard.style.transform = "translateY(" + offset + "px)";
  }

  function equalizeColumns() {
    measure();
    onScroll();
  }

  /* ---- Info-tabs (Over dit bureau / Specs / Montagevideo) ---- */
  document.querySelectorAll(".js-tabs").forEach(function (tabsEl) {
    var tabs = tabsEl.querySelectorAll(".js-tab");
    var panels = tabsEl.querySelectorAll(".js-tab-panel");
    tabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        var name = tab.dataset.tab;
        tabs.forEach(function (t) {
          var active = t === tab;
          t.classList.toggle("is-active", active);
          t.setAttribute("aria-selected", String(active));
        });
        panels.forEach(function (p) {
          p.removeAttribute("hidden");
          p.classList.toggle("is-active", p.dataset.panel === name);
        });
        // hoogtes opnieuw meten na tabwissel (na reflow)
        equalizeColumns();
        requestAnimationFrame(equalizeColumns);
      });
    });
  });

  equalizeColumns();
  window.addEventListener("resize", equalizeColumns);
  window.addEventListener("load", equalizeColumns);
  window.addEventListener("scroll", onScroll, { passive: true });

  /* ---- Quantity stepper ---- */
  var qty = document.getElementById("qtyInput");
  var minus = document.getElementById("qtyMinus");
  var plus = document.getElementById("qtyPlus");
  function getQty() { return Math.max(1, parseInt(qty.value, 10) || 1); }
  if (minus) minus.addEventListener("click", function () { qty.value = Math.max(1, getQty() - 1); });
  if (plus) plus.addEventListener("click", function () { qty.value = getQty() + 1; });
  if (qty) qty.addEventListener("input", function () { qty.value = qty.value.replace(/[^0-9]/g, ""); });
  if (qty) qty.addEventListener("blur", function () { qty.value = getQty(); });

  /* ---- Gallery: thumbnails + pijlen + stipjes (foto's + sfeervideo) ---- */
  var thumbs = document.getElementById("thumbs");
  var mainImage = document.getElementById("mainImage");
  var mainVideo = document.getElementById("mainVideo");
  var galleryDots = document.getElementById("galleryDots");
  if (thumbs && mainImage) {
    var thumbList = Array.prototype.slice.call(thumbs.querySelectorAll(".thumb"));
    var current = 0;

    // bouw de stipjes op basis van het aantal thumbnails
    if (galleryDots) {
      thumbList.forEach(function (_, i) {
        var dot = document.createElement("button");
        dot.type = "button";
        dot.className = "gallery__dot" + (i === 0 ? " gallery__dot--active" : "");
        dot.addEventListener("click", function () { showImage(i); });
        galleryDots.appendChild(dot);
      });
    }

    function showImage(i) {
      if (i < 0) i = thumbList.length - 1;
      if (i >= thumbList.length) i = 0;
      current = i;
      var t = thumbList[i];
      thumbList.forEach(function (x) { x.classList.remove("thumb--active"); });
      t.classList.add("thumb--active");

      var isVideo = t.dataset.type === "video";
      if (mainVideo) {
        mainVideo.classList.toggle("is-hidden", !isVideo);
        if (isVideo) { mainVideo.play && mainVideo.play().catch(function () {}); }
        else { mainVideo.pause && mainVideo.pause(); }
      }
      mainImage.classList.toggle("is-hidden", isVideo);
      if (!isVideo && t.dataset.img) mainImage.src = t.dataset.img;

      if (galleryDots) {
        galleryDots.querySelectorAll(".gallery__dot").forEach(function (d, di) {
          d.classList.toggle("gallery__dot--active", di === i);
        });
      }
    }

    thumbs.addEventListener("click", function (e) {
      var t = e.target.closest(".thumb");
      if (!t) return;
      showImage(thumbList.indexOf(t));
    });

    var prev = document.querySelector(".js-gallery-prev");
    var next = document.querySelector(".js-gallery-next");
    if (prev) prev.addEventListener("click", function () { showImage(current - 1); });
    if (next) next.addEventListener("click", function () { showImage(current + 1); });
  }

  /* ---- Accordions ---- */
  document.querySelectorAll(".js-accordion").forEach(function (acc) {
    var head = acc.querySelector(".accordion__head");
    var body = acc.querySelector(".accordion__body");
    head.addEventListener("click", function () {
      var open = head.getAttribute("aria-expanded") === "true";
      head.setAttribute("aria-expanded", String(!open));
      if (body) body.hidden = open;
    });
  });

  /* ---- Subnav flyout menus ---- */
  document.querySelectorAll(".js-flyout").forEach(function (item) {
    item.addEventListener("click", function (e) { e.preventDefault(); });
  });

  /* ---- Off-canvas drawer (omschrijving schuift vanaf rechts) ---- */
  var drawerOverlay = document.querySelector(".js-drawer-overlay");

  function openDrawer(id) {
    var drawer = document.getElementById("drawer-" + id);
    if (!drawer || !drawerOverlay) return;
    drawerOverlay.hidden = false;
    // force reflow so the transition runs
    void drawerOverlay.offsetWidth;
    drawerOverlay.classList.add("is-open");
    drawer.classList.add("is-open");
    drawer.setAttribute("aria-hidden", "false");
    document.body.classList.add("drawer-open");
  }

  function closeDrawer() {
    var openDrawerEl = document.querySelector(".js-drawer.is-open");
    if (openDrawerEl) {
      openDrawerEl.classList.remove("is-open");
      openDrawerEl.setAttribute("aria-hidden", "true");
    }
    if (drawerOverlay) {
      drawerOverlay.classList.remove("is-open");
      setTimeout(function () { drawerOverlay.hidden = true; }, 250);
    }
    document.body.classList.remove("drawer-open");
  }

  document.querySelectorAll(".js-drawer-open").forEach(function (btn) {
    btn.addEventListener("click", function () { openDrawer(btn.dataset.drawer); });
  });
  document.querySelectorAll(".js-drawer-close").forEach(function (btn) {
    btn.addEventListener("click", closeDrawer);
  });
  if (drawerOverlay) drawerOverlay.addEventListener("click", closeDrawer);
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeDrawer();
  });

  /* ---- Productvideo (play-knop verbergt overlay, start video) ---- */
  document.querySelectorAll(".js-video").forEach(function (fig) {
    var video = fig.querySelector(".product-video__el");
    var playBtn = fig.querySelector(".js-video-play");
    if (!video || !playBtn) return;
    playBtn.addEventListener("click", function () {
      playBtn.classList.add("is-hidden");
      fig.classList.add("is-playing");
      if (typeof video.play === "function") {
        var p = video.play();
        if (p && typeof p.catch === "function") { p.catch(function () {}); }
      }
    });
    video.addEventListener("pause", function () {
      if (!video.ended) playBtn.classList.remove("is-hidden");
    });
    video.addEventListener("ended", function () {
      playBtn.classList.remove("is-hidden");
      fig.classList.remove("is-playing");
    });
  });

  /* ---- Register pre-selected defaults (active pills/swatches) ---- */
  document.querySelectorAll(".js-optgroup[data-required='1']").forEach(function (group) {
    if (group.querySelector(".pill--active, .swatch--active")) {
      requiredChosen[group.dataset.group] = true;
    }
  });
  /* ---- Required custom dropdowns met een vooraf gekozen optie (bv. bladmaat) ---- */
  document.querySelectorAll(".js-cselect[data-required='1']").forEach(function (cs) {
    if (cs.querySelector(".cselect__option.is-selected")) {
      requiredChosen[cs.dataset.group] = true;
    }
  });

  recalcPrice();
  validate();
})();
