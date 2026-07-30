/* Koeltekaart data dashboard — vanilla, no libs, CSP-safe (script-src 'self').
 * Reads the same live static CSVs the map serves, computes dataset-health
 * stats, and renders them as work-guiding panels. Nothing here is cached in
 * the repo: every load re-fetches, so the numbers track the 15-min refresh. */
(function () {
  "use strict";

  // --- Amsterdam Design System category colours (match the map legend) ------
  var CAT_COLOR = {
    library: "#004699", supermarket: "#00893c", hotel: "#009de6",
    church: "#a00078", museum: "#bed200", theater: "#e50082",
    "café": "#ec0000", cafe: "#ec0000", community_center: "#ff9100",
    other: "#767676"
  };
  var AMENITY_LABEL = {
    seating: "Seating", toilets: "Toilets", free_water: "Free water",
    food_to_buy: "Food nearby", own_food_ok: "Own food OK", airco: "A/C",
    wheelchair_accessible: "Wheelchair", games: "Activities",
    pets_ok: "Pets OK", wifi: "Wi-Fi"
  };
  var AMENITY_KEYS = Object.keys(AMENITY_LABEL);
  var HEAT_DAYS = ["heat_mon","heat_tue","heat_wed","heat_thu","heat_fri","heat_sat","heat_sun"];
  // Amsterdam's own eight stadsdelen — anything else (Diemen, Weesp) is a
  // neighbouring municipality, tracked separately.
  var AMS_DISTRICTS = ["Centrum","Nieuw-West","Noord","Oost","West","Zuid","Zuidoost","Weesp"];

  // --- tiny CSV parser (quoted fields, CRLF tolerant) -----------------------
  function parseCSV(text) {
    var rows = [], row = [], field = "", i = 0, inq = false, c;
    text = text.replace(/^﻿/, "");
    while (i < text.length) {
      c = text[i];
      if (inq) {
        if (c === '"') { if (text[i+1] === '"') { field += '"'; i++; } else inq = false; }
        else field += c;
      } else if (c === '"') inq = true;
      else if (c === ",") { row.push(field); field = ""; }
      else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
      else if (c === "\r") { /* skip */ }
      else field += c;
      i++;
    }
    if (field.length || row.length) { row.push(field); rows.push(row); }
    return rows;
  }
  function toObjects(text) {
    var rows = parseCSV(text).filter(function (r) { return r.some(function (v) { return v !== ""; }); });
    if (!rows.length) return [];
    var head = rows[0].map(function (h) { return h.trim(); });
    return rows.slice(1).map(function (r) {
      var o = {}; head.forEach(function (h, j) { o[h] = (r[j] || "").trim(); }); return o;
    });
  }
  var truthy = function (v) { return ["true","yes","1","x","ja"].indexOf(String(v).trim().toLowerCase()) >= 0; };
  var has = function (v) { return String(v || "").trim() !== ""; };
  function titleCase(s) {
    return String(s).replace(/_/g, " ").replace(/\b\w/g, function (m) { return m.toUpperCase(); });
  }

  // --- DOM helpers ----------------------------------------------------------
  var $ = function (id) { return document.getElementById(id); };
  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) {
    return { "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;" }[c]; }); }

  // --- shared tooltip -------------------------------------------------------
  var tip = $("tip");
  function bindTip(node, html) {
    node.addEventListener("mousemove", function (e) {
      tip.innerHTML = html; tip.style.opacity = "1";
      var x = e.clientX + 14, y = e.clientY + 14;
      if (x + tip.offsetWidth > window.innerWidth) x = e.clientX - tip.offsetWidth - 14;
      tip.style.left = x + "px"; tip.style.top = y + "px";
    });
    node.addEventListener("mouseleave", function () { tip.style.opacity = "0"; });
  }

  // --- bar list component ---------------------------------------------------
  // items: [{label, value, max, color, valText, sub, hot, tip}]
  function barList(items) {
    var box = el("div", "bars");
    items.forEach(function (it) {
      var row = el("div", "bar-row" + (it.hot ? " hot" : ""));
      row.appendChild(el("div", "b-label", esc(it.label)));
      var track = el("div", "bar-track");
      var fill = el("div", "bar-fill");
      fill.style.background = it.color || "var(--blue)";
      track.appendChild(fill);
      row.appendChild(track);
      var val = el("div", "b-val", esc(it.valText != null ? it.valText : String(it.value)) +
        (it.sub ? ' <span class="b-sub">' + esc(it.sub) + "</span>" : ""));
      row.appendChild(val);
      box.appendChild(row);
      // animate width after insert
      requestAnimationFrame(function () {
        fill.style.width = (it.max > 0 ? Math.max(2, (it.value / it.max) * 100) : 0) + "%";
      });
      if (it.tip) bindTip(row, it.tip);
    });
    return box;
  }

  function section(title, why) {
    var s = el("section", "block");
    var h = el("div", "sec-head");
    h.appendChild(el("h2", null, esc(title)));
    if (why) h.appendChild(el("span", "why", esc(why)));
    s.appendChild(h);
    s.appendChild(el("div", "sec-rule"));
    return s;
  }
  function card(title, why) {
    var c = el("div", "card");
    c.appendChild(el("h3", null, esc(title)));
    if (why) c.appendChild(el("p", "card-why", esc(why)));
    return c;
  }
  function todoDetails(label, names, statusClass) {
    var d = el("details");
    var sm = el("summary");
    sm.innerHTML = '<span class="pill ' + statusClass + '">' + names.length + "</span> " +
      esc(label) + '<span class="chev">›</span>';
    d.appendChild(sm);
    if (names.length) {
      var wrap = el("div", "names");
      names.forEach(function (n) { wrap.appendChild(el("span", null, esc(n))); });
      d.appendChild(wrap);
    } else {
      d.appendChild(el("div", "names", '<span class="allgood">✓ all complete</span>'));
    }
    return d;
  }

  // --- fetch ----------------------------------------------------------------
  function fetchText(url) {
    return fetch(url, { cache: "no-store" }).then(function (r) {
      if (!r.ok) throw new Error(url + " → " + r.status);
      return r.text().then(function (t) { return { text: t, lastModified: r.headers.get("Last-Modified") }; });
    });
  }

  function fmtWhen(iso) {
    try {
      var d = iso ? new Date(iso) : new Date();
      var mins = Math.round((Date.now() - d.getTime()) / 60000);
      var ago = mins < 1 ? "just now" : mins < 60 ? mins + " min ago"
        : Math.round(mins / 60) + " h ago";
      return d.toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) + " (" + ago + ")";
    } catch (e) { return "unknown"; }
  }

  // --- geometry for the access map -----------------------------------------
  var EXCLUDE_STADSDEEL = ["Westpoort", "Weesp"]; // industrial + detached exclave
  function metresBetween(aLat, aLon, bLat, bLon) {
    var k = 111320, dLat = (aLat - bLat) * k,
        dLon = (aLon - bLon) * k * Math.cos((aLat + bLat) / 2 * Math.PI / 180);
    return Math.sqrt(dLat * dLat + dLon * dLon);
  }
  // even-odd ray cast over a set of [lon,lat] rings
  function inRings(lon, lat, rings) {
    var inside = false;
    for (var r = 0; r < rings.length; r++) {
      var ring = rings[r];
      for (var i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        var xi = ring[i][0], yi = ring[i][1], xj = ring[j][0], yj = ring[j][1];
        if (((yi > lat) !== (yj > lat)) &&
            (lon < (xj - xi) * (lat - yi) / (yj - yi) + xi)) inside = !inside;
      }
    }
    return inside;
  }

  // Access section: a priority choropleth over the PDOK basemap + a complete
  // ranked list, switchable between stadsdeel / wijk / buurt (default wijk).
  // Priority of an area = residents × mean distance to the nearest cool spot.
  // The coverage headline is always computed at buurt resolution (most precise).
  function renderAccessSection(locs, geos) {
    if (typeof L === "undefined" || !geos || !geos.wijk) return null;
    var spots = locs.map(function (r) {
      return { name: r.name || "(unnamed)", lat: parseFloat(r.latitude), lon: parseFloat(r.longitude) };
    }).filter(function (s) { return isFinite(s.lat) && isFinite(s.lon); });
    if (spots.length < 2) return null;

    var GRIDN = 240;  // grid columns (~90 m cells) — fine enough for buurt detail

    function nearestSpot(lat, lon) {
      var best = Infinity;
      for (var s = 0; s < spots.length; s++) {
        var d = metresBetween(lat, lon, spots[s].lat, spots[s].lon);
        if (d < best) best = d;
      }
      return best;
    }

    // Grid-sample one level's polygons: nearest-spot distance per area + the
    // residents-within-500 m / 1 km buckets. A centroid fallback guarantees even
    // an area too small to catch a grid cell is still counted.
    function computeUnits(geo) {
      var units = [], minLon = 999, maxLon = -999, minLat = 999, maxLat = -999;
      geo.features.forEach(function (f) {
        var p = f.properties || {};
        if (EXCLUDE_STADSDEEL.indexOf(p.stadsdeel) >= 0) return;
        var polys = f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates;
        var rings = [], bb = [999, 999, -999, -999], cx = 0, cy = 0, cn = 0;
        polys.forEach(function (poly) { poly.forEach(function (r) {
          rings.push(r);
          r.forEach(function (pt) {
            if (pt[0] < bb[0]) bb[0] = pt[0]; if (pt[1] < bb[1]) bb[1] = pt[1];
            if (pt[0] > bb[2]) bb[2] = pt[0]; if (pt[1] > bb[3]) bb[3] = pt[1];
          });
        }); });
        rings[0].forEach(function (pt) { cx += pt[0]; cy += pt[1]; cn++; });
        units.push({ geom: f.geometry, name: p.name || "?", sd: p.stadsdeel || "", wijk: p.wijk || "",
          pop: (typeof p.pop === "number" ? p.pop : null), rings: rings, bb: bb, cx: cx / cn, cy: cy / cn,
          sum: 0, cnt: 0, spots: 0, c500: 0, c1000: 0 });
        if (bb[0] < minLon) minLon = bb[0]; if (bb[1] < minLat) minLat = bb[1];
        if (bb[2] > maxLon) maxLon = bb[2]; if (bb[3] > maxLat) maxLat = bb[3];
      });
      function unitAt(lon, lat) {
        for (var i = 0; i < units.length; i++) {
          var u = units[i], b = u.bb;
          if (lon < b[0] || lon > b[2] || lat < b[1] || lat > b[3]) continue;
          if (inRings(lon, lat, u.rings)) return u;
        }
        return null;
      }
      spots.forEach(function (s) { var u = unitAt(s.lon, s.lat); if (u) u.spots++; });
      var cosLat = Math.cos((minLat + maxLat) / 2 * Math.PI / 180);
      var stepLon = (maxLon - minLon) / GRIDN, stepLat = stepLon * cosLat;
      for (var lat = minLat; lat <= maxLat; lat += stepLat) {
        for (var lon = minLon; lon <= maxLon; lon += stepLon) {
          var u = unitAt(lon, lat);
          if (!u) continue;
          var best = nearestSpot(lat, lon);
          u.sum += best; u.cnt++;
          if (best <= 500) u.c500++;
          if (best <= 1000) u.c1000++;
        }
      }
      var maxScore = 0, totPop = 0, in500 = 0, in1000 = 0;
      units.forEach(function (u) {
        if (u.cnt === 0) {
          var b = nearestSpot(u.cy, u.cx);
          u.sum = b; u.cnt = 1;
          if (b <= 500) u.c500 = 1;
          if (b <= 1000) u.c1000 = 1;
        }
        u.mean = u.sum / u.cnt;
        u.score = u.pop ? u.pop * u.mean : null;
        if (u.score != null && u.score > maxScore) maxScore = u.score;
        if (u.pop) { totPop += u.pop; in500 += u.pop * (u.c500 / u.cnt); in1000 += u.pop * (u.c1000 / u.cnt); }
      });
      var fc = { type: "FeatureCollection", features: units.map(function (u) {
        return { type: "Feature", geometry: u.geom,
          properties: { name: u.name, sd: u.sd, pop: u.pop, mean: u.mean, score: u.score, spots: u.spots } };
      }) };
      var ranked = units.filter(function (u) { return u.score != null; })
        .sort(function (a, b) { return b.score - a.score; });
      return { fc: fc, ranked: ranked, maxScore: maxScore, totPop: totPop, in500: in500, in1000: in1000 };
    }

    var cache = {};
    function level(key) { if (!cache[key]) cache[key] = computeUnits(geos[key]); return cache[key]; }

    var fmtM = function (m) { return m >= 1000 ? (m / 1000).toFixed(1) + " km" : Math.round(m / 10) * 10 + " m"; };
    var fmtPop = function (p) { return p >= 10000 ? Math.round(p / 1000) + "k" : p >= 1000 ? (p / 1000).toFixed(1) + "k" : String(p); };
    function fillOpacityFor(score, maxScore) {
      if (score == null || maxScore <= 0) return 0.05;
      return 0.12 + 0.74 * Math.pow(score / maxScore, 0.55);
    }
    var NOUN = { stadsdeel: "stadsdelen", wijk: "wijken", buurt: "buurten" };

    // Coverage headline is always buurt-resolution (falls back to wijk if absent).
    var cov = level(geos.buurt ? "buurt" : "wijk");

    // ---- DOM ----
    var sec = section("Where to add spots", "");

    var covRow = el("div", "access-cov");
    function covTile(label, x) {
      var k = el("div", "kpi");
      k.appendChild(el("div", "k-label", esc(label)));
      k.appendChild(el("div", "k-val", (cov.totPop > 0 ? Math.round(x / cov.totPop * 100) : 0) + "%"));
      k.appendChild(el("div", "k-note", "≈ " + fmtPop(Math.round(x)) + " of " + fmtPop(cov.totPop) + " residents"));
      return k;
    }
    covRow.appendChild(covTile("Residents within 1 km of a spot", cov.in1000));
    covRow.appendChild(covTile("Residents within 500 m", cov.in500));
    sec.appendChild(covRow);

    var toggle = el("div", "level-toggle");
    var levelBtns = {};
    ["stadsdeel", "wijk", "buurt"].forEach(function (key) {
      if (!geos[key]) return;
      var b = el("button", null, key.charAt(0).toUpperCase() + key.slice(1));
      b.type = "button"; b.setAttribute("data-level", key);
      toggle.appendChild(b); levelBtns[key] = b;
    });
    sec.appendChild(toggle);

    var box = el("div", "access");
    var mapCard = card("Priority map",
      "Redder = higher priority: more residents, further from a spot. Dots are spots.");
    mapCard.className += " map-card";
    var mapDiv = el("div"); mapDiv.id = "accessMap";
    mapCard.appendChild(mapDiv);
    mapCard.appendChild(el("div", "heat-scale", 'lower<span class="ramp"></span>higher priority'));
    box.appendChild(mapCard);

    var listCard = card("Priority list", "…");
    listCard.className += " list-card";
    var listSub = listCard.querySelector(".card-why");
    var rank = el("div", "rank");
    listCard.appendChild(rank);
    box.appendChild(listCard);
    sec.appendChild(box);

    // ---- Leaflet + level switching (init once the container is in the DOM) ----
    setTimeout(function () {
      if (!document.getElementById("accessMap")) return;
      var map = L.map("accessMap", { scrollWheelZoom: false, zoomControl: true });
      L.tileLayer("https://service.pdok.nl/brt/achtergrondkaart/wmts/v2_0/grijs/EPSG:3857/{z}/{x}/{y}.png",
        { maxZoom: 19, attribution: '&copy; <a href="https://www.pdok.nl">Kadaster / PDOK</a>' }).addTo(map);
      map.fitBounds(L.latLngBounds(spots.map(function (s) { return [s.lat, s.lon]; })), { padding: [24, 24] });
      spots.forEach(function (s) {
        L.circleMarker([s.lat, s.lon], { radius: 3, color: "#101010", weight: 1,
          fillColor: "#101010", fillOpacity: 0.85, opacity: 0.9 })
          .bindTooltip(esc(s.name), { className: "wtip", direction: "top" }).addTo(map);
      });
      map.on("click", function () { map.scrollWheelZoom.enable(); });

      var choLayer = null;
      function zoomTo(bb) { map.fitBounds([[bb[1], bb[0]], [bb[3], bb[2]]], { maxZoom: 15, padding: [20, 20] }); }

      function drawLevel(key) {
        var data = level(key);
        if (choLayer) map.removeLayer(choLayer);
        choLayer = L.geoJSON(data.fc, {
          style: function (f) {
            return { fillColor: "#e24a2a", fillOpacity: fillOpacityFor(f.properties.score, data.maxScore),
                     color: "#ffffff", weight: 0.6, opacity: 0.7 };
          },
          onEachFeature: function (f, lyr) {
            var p = f.properties;
            var mtxt = p.mean != null ? "avg " + fmtM(p.mean) + " to nearest" : "";
            var poptxt = p.pop ? fmtPop(p.pop) + " residents · " : "";
            lyr.bindTooltip("<b>" + esc(p.name) + "</b><br>" + esc(p.sd) + "<br>" + poptxt + p.spots +
              " spot" + (p.spots === 1 ? "" : "s") + "<br>" + mtxt, { sticky: true, className: "wtip" });
            lyr.on("mouseover", function () { lyr.setStyle({ weight: 2, color: "#111111", opacity: 1 }); });
            lyr.on("mouseout", function () { lyr.setStyle({ weight: 0.6, color: "#ffffff", opacity: 0.7 }); });
          }
        }).addTo(map);
        choLayer.bringToBack();

        listSub.textContent = data.ranked.length + " " + NOUN[key] + " · residents × distance, highest first · click to zoom";
        rank.innerHTML = "";
        data.ranked.forEach(function (u, idx) {
          var rowE = el("div", "r-row click");
          rowE.appendChild(el("div", "r-n", String(idx + 1)));
          rowE.appendChild(el("div", "r-name", esc(u.name) +
            ' <small>' + esc(u.sd) + " · " + fmtPop(u.pop) + " res." + (u.spots ? "" : " · no spots") + "</small>"));
          rowE.appendChild(el("div", "r-dist", esc(fmtM(u.mean))));
          rowE.addEventListener("click", function () { zoomTo(u.bb); });
          rank.appendChild(rowE);
          bindTip(rowE, "<b>" + esc(u.name) + "</b>" + (u.wijk ? ' <span style="opacity:.7">(' + esc(u.wijk) + ")</span>" : "") +
            "<br>" + esc(u.sd) + " · " + fmtPop(u.pop) + " residents · " + u.spots + " spot" + (u.spots === 1 ? "" : "s") +
            "<br>avg " + esc(fmtM(u.mean)) + " to nearest · click to zoom");
        });

        Object.keys(levelBtns).forEach(function (k) { levelBtns[k].classList.toggle("on", k === key); });
      }

      Object.keys(levelBtns).forEach(function (k) {
        levelBtns[k].addEventListener("click", function () { drawLevel(k); });
      });
      drawLevel(geos.wijk ? "wijk" : (geos.buurt ? "buurt" : "stadsdeel"));
      setTimeout(function () { map.invalidateSize(); }, 0);
    }, 0);

    return sec;
  }

  // --- main -----------------------------------------------------------------
  function render(locs, lastMod, geo, geos) {
    var app = $("app");
    app.innerHTML = "";
    var n = locs.length;

    // ---- derived sets -----------------------------------------------------
    var byDistrict = {}, byCat = {};
    var amenityCount = {}; AMENITY_KEYS.forEach(function (k) { amenityCount[k] = 0; });
    var missDesc = [], missPhoto = [], missWeb = [], missHeat = [], noCoord = [], nonAms = [];

    locs.forEach(function (r) {
      var name = r.name || "(unnamed)";
      var sd = r.stadsdeel || "—";
      byDistrict[sd] = (byDistrict[sd] || 0) + 1;
      if (AMS_DISTRICTS.indexOf(sd) < 0) nonAms.push(name);
      var t = (r.type || "other").toLowerCase();
      byCat[t] = (byCat[t] || 0) + 1;
      AMENITY_KEYS.forEach(function (k) { if (truthy(r[k])) amenityCount[k]++; });
      if (!has(r.description)) missDesc.push(name);
      if (!has(r.photo_url)) missPhoto.push(name);
      if (!has(r.website_url)) missWeb.push(name);
      if (!HEAT_DAYS.some(function (d) { return has(r[d]); })) missHeat.push(name);
      if (!has(r.latitude) || !has(r.longitude)) noCoord.push(name);
    });

    // completeness fields (label, filledCount, missingNames)
    var fields = [
      { label: "Photo", miss: missPhoto },
      { label: "Website", miss: missWeb },
      { label: "Heat-plan hours", miss: missHeat },
      { label: "Description", miss: missDesc },
      { label: "Coordinates", miss: noCoord }
    ].map(function (f) {
      f.filled = n - f.miss.length; f.pct = n ? Math.round((f.filled / n) * 100) : 0;
      return f;
    });
    var overall = Math.round(fields.reduce(function (a, f) { return a + f.pct; }, 0) / fields.length);
    var todoTotal = missPhoto.length + missWeb.length + missHeat.length + missDesc.length + noCoord.length;

    // ---- KPI row ----------------------------------------------------------
    var amsCovered = AMS_DISTRICTS.filter(function (d) { return byDistrict[d]; }).length;
    var kpis = el("div", "kpis");
    function kpi(label, val, sub, note, noteCls) {
      var k = el("div", "kpi");
      k.appendChild(el("div", "k-label", esc(label)));
      k.appendChild(el("div", "k-val", esc(val) + (sub ? " <small>" + esc(sub) + "</small>" : "")));
      if (note) k.appendChild(el("div", "k-note " + (noteCls || ""), esc(note)));
      kpis.appendChild(k);
    }
    var missingDistricts = AMS_DISTRICTS.filter(function (d) { return !byDistrict[d]; });
    kpi("Cool spots", String(n), "", nonAms.length ? nonAms.length + " outside Amsterdam" : "", "");
    kpi("Districts", String(amsCovered), "of " + AMS_DISTRICTS.length,
      missingDistricts.length ? missingDistricts.join(", ") + " empty" : "",
      amsCovered < AMS_DISTRICTS.length ? "warn" : "good");
    kpi("Completeness", overall + "%", "", "",
      overall >= 90 ? "good" : overall >= 75 ? "warn" : "bad");
    kpi("Blank fields", String(todoTotal), "", "",
      todoTotal ? "warn" : "good");
    app.appendChild(kpis);

    // ---- Section: coverage ------------------------------------------------
    var secCov = section("Coverage", "");
    var covCards = el("div", "cards");

    // district bars: all 8 Amsterdam districts (even at 0) + neighbours, sorted
    var maxD = Math.max.apply(null, Object.values(byDistrict).concat([1]));
    var districtOrder = AMS_DISTRICTS.slice().concat(
      Object.keys(byDistrict).filter(function (d) { return AMS_DISTRICTS.indexOf(d) < 0; }));
    var target = Math.max(6, Math.round(n / AMS_DISTRICTS.length)); // even-spread reference
    var dCard = card("Per district", "Grey = neighbouring municipality.");
    dCard.appendChild(barList(districtOrder.map(function (d) {
      var v = byDistrict[d] || 0;
      var neighbour = AMS_DISTRICTS.indexOf(d) < 0;
      return {
        label: d, value: v, max: maxD,
        color: neighbour ? "var(--ink-3)" : (v < target ? "var(--warn)" : "var(--blue)"),
        valText: String(v), hot: !neighbour && v < target,
        tip: "<b>" + esc(d) + "</b><br>" + v + " spot" + (v === 1 ? "" : "s") +
          (neighbour ? " · neighbouring municipality" : v < target ? " · below target" : "")
      };
    })));
    covCards.appendChild(dCard);

    // category bars (brand colours), sorted desc; include settings categories at 0
    var settingsCats = ["library","supermarket","community_center","church","theater"];
    settingsCats.forEach(function (c) { if (!(c in byCat)) byCat[c] = 0; });
    var catEntries = Object.keys(byCat).map(function (k) { return [k, byCat[k]]; })
      .sort(function (a, b) { return b[1] - a[1]; });
    var maxC = Math.max.apply(null, catEntries.map(function (e) { return e[1]; }).concat([1]));
    var cCard = card("Per category", "");
    cCard.appendChild(barList(catEntries.map(function (e) {
      var key = e[0], v = e[1];
      return {
        label: titleCase(key === "cafe" ? "café" : key), value: v, max: maxC,
        color: CAT_COLOR[key] || CAT_COLOR.other, valText: String(v), hot: v === 0,
        tip: "<b>" + esc(titleCase(key)) + "</b><br>" + v + " spot" + (v === 1 ? "" : "s") +
          (v === 0 ? " · none yet" : "")
      };
    })));
    covCards.appendChild(cCard);
    secCov.appendChild(covCards);
    app.appendChild(secCov);

    // ---- Section: access (optional, needs wijk geometry) ------------------
    if (geos && geos.wijk) {
      try { var secAcc = renderAccessSection(locs, geos); if (secAcc) app.appendChild(secAcc); }
      catch (e) { /* geometry failure shouldn't break the rest */ }
    }

    // ---- Section: completeness -------------------------------------------
    var secComp = section("Completeness", "");
    var compCards = el("div", "cards");

    var fCard = card("Fields filled", "of " + n + " spots");
    fCard.appendChild(barList(fields.map(function (f) {
      var col = f.pct >= 90 ? "var(--good)" : f.pct >= 60 ? "var(--warn)" : "var(--bad)";
      return {
        label: f.label, value: f.filled, max: n, color: col,
        valText: f.pct + "%", sub: f.filled + "/" + n,
        tip: "<b>" + esc(f.label) + "</b><br>" + f.filled + " of " + n + " filled · " +
          f.miss.length + " missing"
      };
    })));
    compCards.appendChild(fCard);

    var tCard = card("What's missing", "Open a row for names.");
    var todo = el("div", "todo");
    todo.appendChild(todoDetails("Missing description", missDesc, missDesc.length > n * 0.25 ? "bad" : missDesc.length ? "warn" : "good"));
    todo.appendChild(todoDetails("Missing heat-plan hours", missHeat, missHeat.length ? "warn" : "good"));
    todo.appendChild(todoDetails("Missing photo", missPhoto, missPhoto.length ? "warn" : "good"));
    todo.appendChild(todoDetails("Missing website", missWeb, missWeb.length ? "warn" : "good"));
    todo.appendChild(todoDetails("Missing coordinates", noCoord, noCoord.length ? "bad" : "good"));
    tCard.appendChild(todo);
    compCards.appendChild(tCard);
    secComp.appendChild(compCards);
    app.appendChild(secComp);

    // ---- Section: amenities ----------------------------------------------
    var secAm = section("Amenities", "");
    var amCard = card("Spots offering each", "");
    var amEntries = AMENITY_KEYS.map(function (k) { return [k, amenityCount[k]]; })
      .sort(function (a, b) { return b[1] - a[1]; });
    amCard.appendChild(barList(amEntries.map(function (e) {
      var v = e[1], pct = n ? Math.round(v / n * 100) : 0;
      return {
        label: AMENITY_LABEL[e[0]], value: v, max: n, color: "var(--blue)",
        valText: pct + "%", sub: v + "/" + n,
        tip: "<b>" + esc(AMENITY_LABEL[e[0]]) + "</b><br>" + v + " of " + n + " spots (" + pct + "%)"
      };
    })));
    secAm.appendChild(amCard);
    app.appendChild(secAm);

    // ---- Section: geocoding quality (optional) ----------------------------
    if (geo && geo.length) {
      var good = 0, review = [];
      geo.forEach(function (r) {
        var conf = (r.confidence || "").toLowerCase();
        var reason = (r.reason || "").toLowerCase();
        var ok = ["exact","cache","bag","high"].indexOf(conf) >= 0 && reason.indexOf("approx") < 0;
        if (ok) good++; else review.push((r.name || "(unnamed)") + " — " + (r.reason || conf));
      });
      var secQ = section("Geocoding", "");
      var qCard = card("Pin confidence", geo.length + " addresses");
      qCard.appendChild(barList([
        { label: "Clean / exact", value: good, max: geo.length, color: "var(--good)",
          valText: good + "", sub: good + "/" + geo.length, tip: good + " pins geocoded cleanly" },
        { label: "Needs review", value: review.length, max: geo.length, color: review.length ? "var(--warn)" : "var(--track)",
          valText: review.length + "", tip: review.length + " pins to verify" }
      ]));
      var qtodo = el("div", "todo");
      qtodo.appendChild(todoDetails("Pins to verify", review.map(function (s) { return s; }),
        review.length ? "warn" : "good"));
      qCard.appendChild(qtodo);
      secQ.appendChild(qCard);
      app.appendChild(secQ);
    }

    // ---- freshness line ---------------------------------------------------
    $("freshness").innerHTML = "<b>" + n + "</b> spots · updated <b>" + esc(fmtWhen(lastMod)) + "</b>";
  }

  function boot() {
    $("app").innerHTML = '<div class="loading">Fetching data/locations.csv …</div>';
    var locP = fetchText("data/locations.csv");
    var geoP = fetchText("geocode_review.csv").catch(function () { return null; });
    var sdP = fetchText("data/geo/stadsdelen.geojson").catch(function () { return null; });
    var wjP = fetchText("data/geo/wijken.geojson").catch(function () { return null; });
    var buP = fetchText("data/geo/buurten.geojson").catch(function () { return null; });
    Promise.all([locP, geoP, sdP, wjP, buP]).then(function (res) {
      var locs = toObjects(res[0].text);
      var geo = res[1] ? toObjects(res[1].text) : null;
      var pj = function (r) { try { return r ? JSON.parse(r.text.replace(/^﻿/, "")) : null; } catch (e) { return null; } };
      var geos = { stadsdeel: pj(res[2]), wijk: pj(res[3]), buurt: pj(res[4]) };
      if (!locs.length) throw new Error("locations.csv had no rows");
      render(locs, res[0].lastModified, geo, geos);
    }).catch(function (e) {
      $("app").innerHTML = '<div class="err">Could not load data: ' + esc(e.message) +
        '<br>Serve with <code>python3 serve.py</code> — a <code>file://</code> open is blocked.</div>';
    });
  }

  // theme toggle (persisted)
  (function () {
    var saved = null;
    try { saved = localStorage.getItem("kk-dash-theme"); } catch (e) {}
    if (saved) document.documentElement.setAttribute("data-theme", saved);
    $("themeBtn").addEventListener("click", function () {
      var cur = document.documentElement.getAttribute("data-theme");
      var isDark = cur ? cur === "dark"
        : window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
      var next = isDark ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      try { localStorage.setItem("kk-dash-theme", next); } catch (e) {}
    });
    $("reloadBtn").addEventListener("click", boot);
  })();

  boot();
})();
