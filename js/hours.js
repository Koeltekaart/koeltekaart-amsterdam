// ── Opening-hours logic (pure, no DOM) ───────────────────────────────────────
// Extracted into its own file so it can be unit-tested in Node against the exact
// code the browser runs (see tests/hours.test.mjs). This is the module that
// decides whether a location reads as open/closed/unknown — the bug that sent
// people to "closed" locations lived here, so it gets its own test suite.
//
// Loaded as a plain <script> before app.js (shared global scope), and also
// importable in Node via the module.exports shim at the bottom.

const _CSV_DAY_COLS      = ["hours_mon","hours_tue","hours_wed","hours_thu","hours_fri","hours_sat","hours_sun"];
const _CSV_HEAT_DAY_COLS = ["heat_mon","heat_tue","heat_wed","heat_thu","heat_fri","heat_sat","heat_sun"];

// Per-day slot value is one of:
//   "HH:MM-HH:MM"  → open during that range
//   null           → explicitly/known closed (empty cell, "gesloten", "closed", …)
//   HOURS_UNKNOWN  → the cell had content we could not parse. We deliberately do
//                    NOT treat this as "closed": a typo must never make an open
//                    location look shut (people were showing up to "closed"
//                    places). It renders as "unknown — check website" instead.
const HOURS_UNKNOWN = "?";
const _CLOSED_WORDS = new Set(["", "-", "–", "—", "gesloten", "closed", "dicht", "x", "n/a", "na"]);

function parseMinutes(str) { const [h,m] = str.split(":").map(Number); return h*60+m; }

/**
 * Normalise one opening-hours cell. Tolerant by design — partners hand-type
 * these, so we auto-repair the common slips instead of silently failing:
 *   "13:00-17"        → "13:00-17:00"   (missing close minutes)
 *   "9:00 - 17:00"    → "09:00-17:00"   (spaces, single-digit hour)
 *   "11:00–18:00 AM"  → "11:00-18:00"   (en-dash, stray trailing letters)
 *   "13.00-17.00"     → "13:00-17:00"   (dots for colons)
 *   "gesloten" / ""   → null            (closed)
 *   "open 24h" (etc.) → HOURS_UNKNOWN   (had content, truly unparseable)
 */
function _normaliseSlot(raw) {
  const trimmed = (raw || "").trim();
  if (_CLOSED_WORDS.has(trimmed.toLowerCase())) return null;
  // Collapse common variants down to digits, colons and a single dash.
  let text = trimmed.toLowerCase()
    .replace(/[–—]/g, "-")      // en/em dash → hyphen
    .replace(/\s+/g, "")        // drop all whitespace
    .replace(/\./g, ":")        // 13.00 → 13:00
    .replace(/[^0-9:-]/g, "");  // strip stray letters ("am", "uur", …)
  const m = text.match(/^(\d{1,2})(?::(\d{2}))?-(\d{1,2})(?::(\d{2}))?$/);
  if (!m) return HOURS_UNKNOWN;
  const oh = +m[1], om = m[2] ? +m[2] : 0, ch = +m[3], cm = m[4] ? +m[4] : 0;
  if (oh > 23 || ch > 24 || om > 59 || cm > 59) return HOURS_UNKNOWN;
  const pad = (h, mi) => `${String(h).padStart(2, "0")}:${String(mi).padStart(2, "0")}`;
  return `${pad(oh, om)}-${pad(ch, cm)}`;
}

function _parseHoursFromRow(row, cols) {
  const daycols = cols || _CSV_DAY_COLS;
  // No hours given at all (every cell blank) → hours unknown for the location.
  if (!daycols.some(col => (row[col] || "").trim() !== "")) return null;
  return daycols.map(col => _normaliseSlot(row[col] || ""));
}

/** True when a parsed slot represents real open hours (not closed/unknown). */
function _isOpenSlot(slot) { return !!slot && slot !== HOURS_UNKNOWN; }

/**
 * Determine whether a location is currently open, closed, or has unknown hours.
 * @param {string[]|null} hours - 7-element array of "HH:MM-HH:MM" slots indexed
 *   Mon=0…Sun=6, or null/undefined if hours are unknown.
 * @param {Date} [now] - reference time (defaults to real now; injectable for tests).
 * @returns {{status: "open"|"closed"|"unknown", closesAt?: string, opensAt?: string, nextDay?: number}}
 */
function getOpenStatus(hours, now = new Date()) {
  if (!hours || !Array.isArray(hours)) return { status: "unknown" };
  const dow = (now.getDay()+6)%7;
  const today = hours[dow], nowM = now.getHours()*60+now.getMinutes();
  // Today's cell was present but unparseable → don't guess open/closed.
  if (today === HOURS_UNKNOWN) return { status:"unknown" };
  const nextOpenDay = () => {
    for (let i=1;i<=7;i++) { const d=(dow+i)%7; if(_isOpenSlot(hours[d])) return d; }
    return null;
  };
  if (!today) return { status:"closed", today:null, nextDay: nextOpenDay() };
  const [openStr,closeStr] = today.split("-");
  const openM = parseMinutes(openStr), closeM = parseMinutes(closeStr);
  if (nowM < openM) return { status:"closed", opensAt:openStr, today };
  if (nowM >= closeM) return { status:"closed", today, nextDay: nextOpenDay() };
  return { status:"open", closesAt:closeStr, today };
}

// Node test shim (ignored in the browser).
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    HOURS_UNKNOWN, _CSV_DAY_COLS, _CSV_HEAT_DAY_COLS,
    parseMinutes, _normaliseSlot, _parseHoursFromRow, _isOpenSlot, getOpenStatus,
  };
}
