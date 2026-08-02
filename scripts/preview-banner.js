/**
 * Internal preview strip — injected ONLY into the GitHub Pages preview build
 * (see .github/workflows/pages.yml), never into the production site.
 *
 * Two jobs, both deliberately plain: say "this isn't the real site", and let the
 * team flip the heat plan on and off to compare both states without touching the
 * sheet. It's an internal reminder, not a warning label — keep it to one quiet
 * line; it must not compete with the page.
 */
(function () {
  var NL = (navigator.language || "").toLowerCase().indexOf("en") !== 0;
  var T = NL
    ? { label: "Interne testversie — hitteplan:", on: "aan", off: "uit",
        title: "Alleen in deze testversie: zet het hitteplan aan of uit" }
    : { label: "Internal preview — heat plan:", on: "on", off: "off",
        title: "Preview only: switch the heat plan on or off" };

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
    "#preview-heat-toggle{margin-left:6px;padding:1px 9px;border-radius:9px;" +
    "border:1px solid rgba(0,0,0,.18);background:#fff;color:#5b5344;cursor:pointer;" +
    "font:600 12px/1.4 inherit;font-family:inherit}" +
    "#preview-heat-toggle:hover{border-color:rgba(0,0,0,.34)}" +
    "#preview-heat-toggle[aria-pressed='true']{background:#c8102e;border-color:#c8102e;color:#fff}" +
    "body{padding-top:var(--preview-ribbon-h,0px)}";
  document.head.appendChild(css);

  var bar = document.createElement("div");
  bar.id = "preview-ribbon";
  bar.appendChild(document.createTextNode(T.label));

  var btn = document.createElement("button");
  btn.id = "preview-heat-toggle";
  btn.type = "button";
  btn.title = T.title;
  bar.appendChild(btn);

  // null = follow the sheet; true/false = forced by the button. The site polls
  // settings every 5 minutes, so without this the poll would quietly undo the
  // toggle a few minutes after it was clicked.
  var override = null;

  function heatIsOn() {
    return typeof state !== "undefined" && state.heatPlanActive === true;
  }
  function syncButton() {
    var on = heatIsOn();
    btn.textContent = on ? T.on : T.off;
    btn.setAttribute("aria-pressed", String(on));
  }

  // Force the override into every settings application, including the periodic
  // poll. _applySettings is a plain global function in app.js (classic script),
  // so wrapping the global is enough — fetchSettings resolves it at call time.
  if (typeof window._applySettings === "function") {
    var applySettings = window._applySettings;
    window._applySettings = function (rows) {
      var effective = rows;
      if (override !== null) {
        effective = (rows || []).filter(function (r) {
          return String((r && r.key) || "").trim().toLowerCase() !== "heat_plan_active";
        });
        effective.push({ key: "heat_plan_active", value: override ? "TRUE" : "FALSE" });
      }
      var out = applySettings(effective);
      syncButton();
      return out;
    };

    btn.addEventListener("click", function () {
      override = !heatIsOn();
      // Route through _applySettings rather than poking state directly: it owns
      // the banner, the list badges and the open detail panel, so everything
      // that depends on the heat plan re-renders exactly as it does for real.
      window._applySettings([]);
    });
  } else {
    // App changed shape — show the reminder, hide a button that can't work.
    btn.hidden = true;
  }

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

    syncButton();
    // The first settings fetch lands shortly after load; reflect it once it has.
    setTimeout(syncButton, 1500);
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }

  document.title = (NL ? "[TEST] " : "[PREVIEW] ") + document.title;
})();
