#!/usr/bin/env node
// Builds 4 merged shade GeoJSON files (one per time snapshot) for one-shot loading.
// Output: frontend/data/shade_1000.geojson
//         frontend/data/shade_1300.geojson
//         frontend/data/shade_1530.geojson
//         frontend/data/shade_1800.geojson
//
// Strategy:
//   1. Douglas-Peucker at DP_EPSILON removes redundant vertices.
//   2. Rings with fewer than MIN_AREA_DEG2 area are dropped (sub-pixel at zoom 13).
//   3. Coordinates are rounded to 5 decimal places (~1 m).
//   4. Only the shade value for that time slot is kept (property "s", integer).
// This produces one compact file per slot that the browser loads once at startup.

const fs   = require("fs");
const path = require("path");

const IN_DIR  = path.join(__dirname, "raw", "shade");
const OUT_DIR = path.join(__dirname, "..", "frontend", "data");

const SHADE_SLOTS = [
  { key: "1000", prop: "shade_percent_at_1000" },
  { key: "1300", prop: "shade_percent_at_1300" },
  { key: "1530", prop: "shade_percent_at_1530" },
  { key: "1800", prop: "shade_percent_at_1800" },
];

const DP_EPSILON   = 0.00005;  // ~5 m — sub-pixel detail removed at zoom 14
const MIN_AREA     = 5e-9;     // drop rings with area < ~0.5 m² (genuine noise)

// ── Helpers ───────────────────────────────────────────────────────────────────
function dpDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  if (dx === 0 && dy === 0) return Math.hypot(px - ax, py - ay);
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - ax - t * dx, py - ay - t * dy);
}

function dpSimplify(pts, eps) {
  if (pts.length <= 2) return pts;
  let maxD = 0, idx = 0;
  const last = pts.length - 1;
  for (let i = 1; i < last; i++) {
    const d = dpDist(pts[i][0], pts[i][1], pts[0][0], pts[0][1], pts[last][0], pts[last][1]);
    if (d > maxD) { maxD = d; idx = i; }
  }
  if (maxD > eps) {
    const a = dpSimplify(pts.slice(0, idx + 1), eps);
    const b = dpSimplify(pts.slice(idx), eps);
    return [...a.slice(0, -1), ...b];
  }
  return [pts[0], pts[last]];
}

// Shoelace area (absolute value)
function ringArea(ring) {
  let a = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    a += (ring[j][0] + ring[i][0]) * (ring[j][1] - ring[i][1]);
  }
  return Math.abs(a) / 2;
}

function roundCoord([lng, lat]) {
  return [Math.round(lng * 1e5) / 1e5, Math.round(lat * 1e5) / 1e5];
}

function simplifyRing(ring) {
  const s = dpSimplify(ring, DP_EPSILON).map(roundCoord);
  if (s.length < 4) return null;
  if (s[0][0] !== s[s.length-1][0] || s[0][1] !== s[s.length-1][1]) s.push(s[0]);
  if (ringArea(s) < MIN_AREA) return null;
  return s;
}

function simplifyGeom(geom) {
  if (geom.type === "Polygon") {
    const rings = geom.coordinates.map(simplifyRing).filter(Boolean);
    return rings.length ? { type: "Polygon", coordinates: rings } : null;
  }
  if (geom.type === "MultiPolygon") {
    const polys = geom.coordinates
      .map(poly => { const rings = poly.map(simplifyRing).filter(Boolean); return rings.length ? rings : null; })
      .filter(Boolean);
    return polys.length ? { type: "MultiPolygon", coordinates: polys } : null;
  }
  return geom;
}

// ── Load & simplify once (geometry is shared across all 4 slots) ─────────────
const files = fs.readdirSync(IN_DIR).filter(f => f.endsWith(".geojson"));
console.log(`Reading ${files.length} neighbourhood files…`);

const allRaw = [];
for (const file of files) {
  const gj = JSON.parse(fs.readFileSync(path.join(IN_DIR, file), "utf8"));
  for (const feat of gj.features) {
    if (feat.geometry) allRaw.push(feat);
  }
}
console.log(`Total raw features: ${allRaw.length}`);

console.log("Simplifying…");
const simplified = [];
for (const feat of allRaw) {
  const geom = simplifyGeom(feat.geometry);
  if (geom) simplified.push({ geom, props: feat.properties });
}
console.log(`Retained: ${simplified.length} features (${(simplified.length/allRaw.length*100).toFixed(1)}%)`);

// ── Write one file per time slot ─────────────────────────────────────────────
for (const { key, prop } of SHADE_SLOTS) {
  const features = simplified.map(({ geom, props }) => ({
    type: "Feature",
    properties: { s: Math.round(props[prop] ?? 0) },
    geometry: geom,
  }));

  const outPath = path.join(OUT_DIR, `shade_${key}.geojson`);
  fs.writeFileSync(outPath, JSON.stringify({ type: "FeatureCollection", features }));

  const kb = fs.statSync(outPath).size / 1024;
  console.log(`shade_${key}.geojson — ${features.length} features, ${kb.toFixed(0)} KB`);
}
