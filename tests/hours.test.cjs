// Unit tests for the opening-hours logic that decides open/closed/unknown.
// Runs the EXACT browser code (js/hours.js) in Node — no copies to drift.
//   Run:  node tests/hours.test.cjs
//
// This is the regression net for the bug that sent people to "closed"
// locations: a malformed hours cell must auto-repair when sane, and otherwise
// fall back to "unknown" — never a false "Closed".

const assert = require("assert");
const H = require("../js/hours.js");
const { _normaliseSlot, _parseHoursFromRow, effectiveHours, getOpenStatus, HOURS_UNKNOWN, _CSV_DAY_COLS } = H;

let passed = 0;
function ok(name, fn) {
  try { fn(); passed++; }
  catch (e) { console.error(`✗ ${name}\n   ${e.message}`); process.exitCode = 1; }
}

// Mon=0 … Sun=6. Build a Date that getOpenStatus reads as the given weekday/time.
// 2024-06-03 is a Monday; add `dow` days and set the clock.
function at(dow, hh, mm) { return new Date(2024, 5, 3 + dow, hh, mm); }

// ── _normaliseSlot: auto-repair + fail-safe ─────────────────────────────────
ok("valid passes through (zero-padded)", () =>
  assert.strictEqual(_normaliseSlot("08:00-22:00"), "08:00-22:00"));
ok("single-digit hour is padded", () =>
  assert.strictEqual(_normaliseSlot("9:00-17:00"), "09:00-17:00"));
ok("missing close minutes are repaired (the live bug)", () =>
  assert.strictEqual(_normaliseSlot("13:00-17"), "13:00-17:00"));
ok("stray AM and spaces are stripped (the live bug)", () =>
  assert.strictEqual(_normaliseSlot("11:00-18:00 AM"), "11:00-18:00"));
ok("en-dash is accepted", () =>
  assert.strictEqual(_normaliseSlot("09:00–17:00"), "09:00-17:00"));
ok("dots become colons", () =>
  assert.strictEqual(_normaliseSlot("13.00-17.00"), "13:00-17:00"));
ok("surrounding whitespace tolerated", () =>
  assert.strictEqual(_normaliseSlot("  9:00 - 17:00  "), "09:00-17:00"));

ok("empty cell → unset (undefined), distinct from closed", () =>
  assert.strictEqual(_normaliseSlot(""), undefined));
ok("'gesloten' → closed (null)", () =>
  assert.strictEqual(_normaliseSlot("gesloten"), null));
ok("'Closed' (any case) → closed (null)", () =>
  assert.strictEqual(_normaliseSlot("Closed"), null));
ok("dash placeholder → closed (null)", () =>
  assert.strictEqual(_normaliseSlot("-"), null));

ok("non-empty garbage → UNKNOWN, never closed", () =>
  assert.strictEqual(_normaliseSlot("open 24h"), HOURS_UNKNOWN));
ok("out-of-range hour → UNKNOWN", () =>
  assert.strictEqual(_normaliseSlot("25:00-26:00"), HOURS_UNKNOWN));
ok("dangling range → UNKNOWN", () =>
  assert.strictEqual(_normaliseSlot("13:-"), HOURS_UNKNOWN));

// ── _parseHoursFromRow ──────────────────────────────────────────────────────
const rowFrom = vals => Object.fromEntries(_CSV_DAY_COLS.map((c, i) => [c, vals[i] || ""]));
ok("all-blank week → null (whole-location unknown)", () =>
  assert.strictEqual(_parseHoursFromRow(rowFrom([])), null));
ok("mixed week parses per-day (blank=unset, gesloten=closed)", () => {
  const h = _parseHoursFromRow(rowFrom(["08:00-22:00","","gesloten","13:00-17","x","9:00-17:00","open 24h"]));
  assert.deepStrictEqual(h, ["08:00-22:00", undefined, null, "13:00-17:00", null, "09:00-17:00", HOURS_UNKNOWN]);
});

// ── getOpenStatus (time injected) ───────────────────────────────────────────
const week = ["09:00-17:00","09:00-17:00","09:00-17:00","09:00-17:00","09:00-17:00","gesloten","gesloten"]
  .map(_normaliseSlot);
ok("open during hours", () =>
  assert.strictEqual(getOpenStatus(week, at(0, 12, 0)).status, "open"));
ok("closed before opening, reports opensAt", () => {
  const s = getOpenStatus(week, at(0, 8, 0));
  assert.strictEqual(s.status, "closed");
  assert.strictEqual(s.opensAt, "09:00");
});
ok("closed after closing, points to next open day", () => {
  const s = getOpenStatus(week, at(4, 18, 0)); // Friday after close
  assert.strictEqual(s.status, "closed");
  assert.strictEqual(s.nextDay, 0);            // → Monday
});
ok("explicitly closed day → closed", () =>
  assert.strictEqual(getOpenStatus(week, at(5, 12, 0)).status, "closed"));
ok("unparseable today → unknown, NOT closed (the safety guarantee)", () => {
  const h = [...week]; h[0] = HOURS_UNKNOWN;
  assert.strictEqual(getOpenStatus(h, at(0, 12, 0)).status, "unknown");
});
ok("no hours array → unknown", () =>
  assert.strictEqual(getOpenStatus(null, at(0, 12, 0)).status, "unknown"));

// ── effectiveHours: heat plan resolution (the koelteplek bug) ───────────────
const reg  = _parseHoursFromRow(rowFrom(["09:00-17:00","09:00-17:00","","","","",""]));
const heat = _parseHoursFromRow(rowFrom(["11:00-20:00","","gesloten","","","",""]));

ok("plan OFF → regular week is used verbatim", () =>
  assert.deepStrictEqual(effectiveHours(reg, heat, false), reg));
ok("plan ON → heat range overrides that day", () =>
  assert.strictEqual(effectiveHours(reg, heat, true)[0], "11:00-20:00"));
ok("plan ON → blank heat day inherits the regular hours", () =>
  assert.strictEqual(effectiveHours(reg, heat, true)[1], "09:00-17:00"));
ok("plan ON → 'gesloten' heat day forces closed (does NOT inherit)", () =>
  assert.strictEqual(effectiveHours(reg, heat, true)[2], null));

// Heat-only venue: no regular hours at all, only heat-plan hours.
const heatOnly = _parseHoursFromRow(rowFrom(["12:00-18:00","12:00-18:00","12:00-18:00","12:00-18:00","12:00-18:00","",""]));
ok("heat-only venue, plan ON → uses heat hours (was wrongly 'unknown')", () =>
  assert.strictEqual(getOpenStatus(effectiveHours(null, heatOnly, true), at(0, 13, 0)).status, "open"));
ok("heat-only venue, plan OFF → closed, never 'unknown'", () =>
  assert.strictEqual(getOpenStatus(effectiveHours(null, heatOnly, false), at(0, 13, 0)).status, "closed"));
ok("heat-only venue, plan ON, blank heat day → closed", () =>
  assert.strictEqual(getOpenStatus(effectiveHours(null, heatOnly, true), at(5, 13, 0)).status, "closed"));
ok("no regular and no heat → unknown", () =>
  assert.strictEqual(effectiveHours(null, null, true), null));

console.log(`\n${passed} hours assertions passed${process.exitCode ? " (with failures above)" : ""}.`);
