/* ==========================================================================
   RK s VILLA — PREMIUM UX ENGINE (theme.js)
   Features:
     1. Scroll-Triggered Section Animations (IntersectionObserver)
     2. Smooth Page Transition Animations (fade-out/fade-in)
     3. Gold Progress Bar on Header
   ========================================================================== */

(function () {
  "use strict";

  /* FEATURE 1: SCROLL ANIMATIONS */
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

  /* FEATURE 2: PAGE TRANSITIONS */
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

  /* FEATURE 3: HEADER GOLD PROGRESS BAR */
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
    initScrollAnimations();
    initPageTransitions();
    initHeaderEnhancements();
  }

  function scheduleInit() {
    if ("requestIdleCallback" in window) {
      requestIdleCallback(init, { timeout: 1200 });
    } else {
      setTimeout(init, 50);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scheduleInit);
  } else {
    scheduleInit();
  }

})();
