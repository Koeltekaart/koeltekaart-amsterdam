/**
 * Internal preview reminder — injected ONLY into the GitHub Pages preview build
 * (see .github/workflows/pages.yml), never into the production site.
 *
 * The preview ships data/settings.csv with heat_plan_active=TRUE so the team can
 * rehearse the activated state. This is a deliberately plain one-liner: it's an
 * internal reminder that the heat plan isn't really on, not a warning label.
 * Keep it to a single unobtrusive line — it must not compete with the page.
 */
(function () {
  var NL = (navigator.language || "").toLowerCase().indexOf("en") !== 0;

  // Fixed at the very top, with the site's own fixed header (z-index 500) and
  // the whole page pushed down by exactly the strip's height — so the reminder
  // is always readable but never sits on top of any content.
  var css = document.createElement("style");
  css.textContent =
    "#preview-ribbon{position:fixed;top:0;left:0;right:0;z-index:600;" +
    "background:#f4f0e6;color:#5b5344;" +
    "font:500 12px/1.4 system-ui,-apple-system,'Segoe UI',sans-serif;" +
    "padding:5px 12px;text-align:center;" +
    "border-bottom:1px solid rgba(0,0,0,.10)}" +
    "body{padding-top:var(--preview-ribbon-h,0px)}";
  document.head.appendChild(css);

  var bar = document.createElement("div");
  bar.id = "preview-ribbon";
  bar.textContent = NL
    ? "Interne testversie — hitteplan staat hier altijd aan."
    : "Internal preview — heat plan is always on here.";

  function mount() {
    document.body.insertBefore(bar, document.body.firstChild);
    // The site header is fixed at top:0 and is NOT a direct child of <body>, so
    // it has to be nudged down by the strip's height explicitly — set inline so
    // we don't have to out-specify whatever rule positions it.
    var header = document.querySelector("header");
    var setH = function () {
      var h = bar.offsetHeight;
      document.documentElement.style.setProperty("--preview-ribbon-h", h + "px");
      if (header && getComputedStyle(header).position === "fixed") {
        header.style.top = h + "px";
      }
    };
    setH();
    // The strip wraps to two lines on narrow screens, changing its height.
    if (window.ResizeObserver) new ResizeObserver(setH).observe(bar);
    else window.addEventListener("resize", setH);
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }

  document.title = (NL ? "[TEST] " : "[PREVIEW] ") + document.title;
})();
