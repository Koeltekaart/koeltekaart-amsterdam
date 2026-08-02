/**
 * Internal preview ribbon — injected ONLY into the GitHub Pages preview build
 * (see .github/workflows/pages.yml), never into the production site.
 *
 * The preview ships data/settings.csv with heat_plan_active=TRUE so the team can
 * rehearse the activated state before the plan is really switched on. That makes
 * the page indistinguishable from a genuine activation at a glance, and the
 * Pages URL is publicly reachable — so this ribbon is a hard requirement, not
 * decoration: it must be obvious to anyone who lands here that the heat plan is
 * NOT actually active and this is not the real site.
 */
(function () {
  var NL = (navigator.language || "").toLowerCase().indexOf("en") !== 0;

  var css = document.createElement("style");
  css.textContent = [
    "#preview-ribbon{position:sticky;top:0;z-index:100000;background:repeating-linear-gradient(",
    "45deg,#7a1f1f,#7a1f1f 14px,#5e1616 14px,#5e1616 28px);color:#fff;",
    "font:600 14px/1.45 system-ui,-apple-system,'Segoe UI',sans-serif;",
    "padding:9px 14px;text-align:center;letter-spacing:.01em;",
    "box-shadow:0 2px 8px rgba(0,0,0,.35)}",
    "#preview-ribbon b{font-weight:800;text-transform:uppercase;letter-spacing:.06em}",
    // Margin, not a plain text space: the site's language switcher re-renders
    // text nodes and collapses the whitespace around the link.
    "#preview-ribbon a{color:#fff;text-decoration:underline;margin:0 .28em}",
    "#preview-ribbon .pr-sub{display:block;font-weight:500;opacity:.92;font-size:12.5px}",
    "@media print{#preview-ribbon{position:static}}",
  ].join("");
  document.head.appendChild(css);

  var bar = document.createElement("div");
  bar.id = "preview-ribbon";
  bar.setAttribute("role", "alert");

  var strong = document.createElement("b");
  strong.textContent = NL ? "Interne testversie" : "Internal preview";
  bar.appendChild(strong);
  bar.appendChild(document.createTextNode(
    NL
      ? " — het hitteplan is hier kunstmatig op ACTIEF gezet om te oefenen."
      : " — the heat plan is artificially set to ACTIVE here for rehearsal."
  ));

  var sub = document.createElement("span");
  sub.className = "pr-sub";
  var liveUrl = "https://koeltekaartamsterdam.nl";
  sub.textContent = NL
    ? "Dit is NIET de echte status en NIET de officiële site. Kijk op"
    : "This is NOT the real status and NOT the official site. See";
  var a = document.createElement("a");
  a.href = liveUrl;
  a.textContent = "koeltekaartamsterdam.nl";
  a.rel = "noopener";
  sub.appendChild(a);
  sub.appendChild(document.createTextNode(NL ? "voor de actuele situatie." : "for the live situation."));
  bar.appendChild(sub);

  function mount() {
    if (document.getElementById("preview-ribbon") === bar) return;
    document.body.insertBefore(bar, document.body.firstChild);
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }

  // Make it unmistakable in the tab strip too.
  document.title = (NL ? "[TEST] " : "[PREVIEW] ") + document.title;
})();
