/* ==========================================================================
   RK s VILLA — PREMIUM UX ENGINE (theme.js)
   Features:
     1. Dark / Warm Cream Theme Toggle (persisted via localStorage)
     2. Scroll-Triggered Section Animations (IntersectionObserver)
     3. Smooth Page Transition Animations (fade-out/fade-in)
     4. Glassmorphism Header Enhancement + Gold Progress Bar
   ========================================================================== */

(function () {
  "use strict";

  /* FEATURE 1: THEME TOGGLE */
  function initThemeToggle() {
    var savedTheme = localStorage.getItem("rkv-theme") || "dark";
    document.documentElement.setAttribute("data-theme", savedTheme);

    function moonIcon() {
      return '<svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
    }
    function sunIcon() {
      return '<svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>';
    }

    var btn = document.createElement("button");
    btn.id = "theme-toggle-btn";
    btn.setAttribute("aria-label", "Toggle light/dark theme");
    btn.innerHTML = savedTheme === "light" ? moonIcon() : sunIcon();

    btn.addEventListener("click", function () {
      var current = document.documentElement.getAttribute("data-theme");
      var next = current === "light" ? "dark" : "light";
      document.documentElement.setAttribute("data-theme", next);
      localStorage.setItem("rkv-theme", next);
      btn.innerHTML = next === "light" ? moonIcon() : sunIcon();
      var mobileBtn = document.getElementById("theme-toggle-btn-mobile");
      if (mobileBtn) mobileBtn.innerHTML = btn.innerHTML;
    });

    var mobileMenuBtn = document.getElementById("mobile-menu-btn");
    if (mobileMenuBtn && mobileMenuBtn.parentNode) {
      mobileMenuBtn.parentNode.insertBefore(btn, mobileMenuBtn);
    }

    var mobileDrawerCtas = document.querySelector(".mobile-ctas");
    if (mobileDrawerCtas) {
      var mobileBtn2 = document.createElement("button");
      mobileBtn2.id = "theme-toggle-btn-mobile";
      mobileBtn2.setAttribute("aria-label", "Toggle light/dark theme");
      mobileBtn2.innerHTML = savedTheme === "light" ? moonIcon() : sunIcon();
      mobileBtn2.addEventListener("click", function () { btn.click(); });
      mobileDrawerCtas.prepend(mobileBtn2);
    }
  }

  /* FEATURE 2: SCROLL ANIMATIONS */
  function initScrollAnimations() {
    var selectors = [
      ".amenity-item", ".floor-card", ".exp-card", ".rate-card",
      ".guide-card", ".gallery-item", ".contact-method", ".value-item",
      ".highlight-card", ".feature-row", ".info-row", ".stat-item",
      ".beach-feature-banner", ".section-header", ".form-section", ".map-section"
    ];

    var elements = document.querySelectorAll(selectors.join(", "));
    if (!elements.length) return;

    var parentGroups = new Map();
    elements.forEach(function(el) {
      el.classList.add("scroll-reveal");
      var key = el.parentElement || document.body;
      if (!parentGroups.has(key)) parentGroups.set(key, []);
      parentGroups.get(key).push(el);
    });

    parentGroups.forEach(function(children) {
      children.forEach(function(el, i) {
        el.style.transitionDelay = (i * 65) + "ms";
      });
    });

    if (!("IntersectionObserver" in window)) {
      elements.forEach(function(el) { el.classList.add("scroll-revealed"); });
      return;
    }

    var observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("scroll-revealed");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.07, rootMargin: "0px 0px -50px 0px" });

    elements.forEach(function(el) { observer.observe(el); });
  }

  /* FEATURE 3: PAGE TRANSITIONS */
  function initPageTransitions() {
    document.documentElement.classList.add("page-loading");
    window.addEventListener("load", function() {
      requestAnimationFrame(function() {
        document.documentElement.classList.remove("page-loading");
        document.documentElement.classList.add("page-loaded");
      });
    });

    document.addEventListener("click", function(e) {
      var link = e.target.closest("a[href]");
      if (!link) return;
      var href = link.getAttribute("href");
      if (!href) return;
      if (href.startsWith("http") || href.startsWith("//") || href.startsWith("#") ||
          href.startsWith("mailto:") || href.startsWith("tel:") ||
          link.hasAttribute("download") || link.getAttribute("target") === "_blank") return;

      e.preventDefault();
      document.documentElement.classList.remove("page-loaded");
      document.documentElement.classList.add("page-loading");
      setTimeout(function() { window.location.href = href; }, 300);
    });
  }

  /* FEATURE 4: HEADER PROGRESS BAR */
  function initHeaderEnhancements() {
    var header = document.getElementById("site-header");
    if (!header) return;

    var bar = document.createElement("div");
    bar.id = "scroll-progress-bar";
    header.appendChild(bar);

    var ticking = false;
    window.addEventListener("scroll", function() {
      if (!ticking) {
        requestAnimationFrame(function() {
          var scrollTop = window.scrollY;
          var docHeight = document.documentElement.scrollHeight - window.innerHeight;
          var pct = docHeight > 0 ? Math.min((scrollTop / docHeight) * 100, 100) : 0;
          bar.style.width = pct + "%";
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });
  }

  function init() {
    initThemeToggle();
    initScrollAnimations();
    initPageTransitions();
    initHeaderEnhancements();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

})();
