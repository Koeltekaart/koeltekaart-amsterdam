/**
 * Koeltekaart Amsterdam — sheet → site instant refresh trigger.
 *
 * When an editor changes the sheet, this pings GitHub (repository_dispatch:
 * sheet-updated), which runs .github/workflows/refresh-data.yml: read the sheet
 * (service account) → validate → deploy. Edits go live in ~1 minute.
 *
 * RELIABILITY: GitHub's own cron schedule is unreliable on low-traffic repos —
 * it gets delayed by hours or dropped entirely, so it is NOT a real safety net.
 * Instead we install a time-driven trigger here (Google's scheduler, which is
 * reliable) that pings every 5 minutes. So even if an on-edit is ever missed or
 * throttled, the site is at most ~5 minutes stale — never hours.
 *
 * This is the ONLY thing the Apps Script does. It does NOT read or write data —
 * the GitHub Action reads the sheet itself via the service account.
 *
 * ── One-time setup ──────────────────────────────────────────────────────────
 * 1. In the Google Sheet: Extensions → Apps Script. Paste this whole file in,
 *    replacing the default Code.gs. Save.
 * 2. Create a GitHub token (see docs/DATA_PIPELINE.md → "Instant updates"):
 *    a fine-grained PAT, scoped to ONLY Koeltekaart/koeltekaart-amsterdam,
 *    with permission "Contents: Read and write".
 * 3. In Apps Script: Project Settings (gear) → Script properties →
 *    Add property: name = GITHUB_TOKEN, value = <the token>. Save.
 * 4. Run the `setup` function once (top toolbar → select `setup` → Run) and
 *    approve the authorization prompt. This installs the edit triggers.
 * 5. Run `testDispatch` once to confirm — it should log "GitHub dispatch OK".
 *    Check GitHub → Actions for a "Refresh data" run.
 *
 * To rotate the token later, just update the GITHUB_TOKEN script property.
 */

const GITHUB_REPO = 'Koeltekaart/koeltekaart-amsterdam';
const THROTTLE_MS = 60 * 1000; // coalesce edit bursts: at most one edit-ping per minute
const HEARTBEAT_MIN = 5;       // reliable Google-scheduled poll, independent of GitHub cron
const HANDLERS = ['onSheetEdit', 'heartbeat'];

/** Run ONCE to install the triggers. Safe to re-run (clears duplicates first). */
function setup() {
  const ss = SpreadsheetApp.getActive();
  ScriptApp.getProjectTriggers().forEach(t => {
    if (HANDLERS.includes(t.getHandlerFunction())) ScriptApp.deleteTrigger(t);
  });
  // Instant updates: installable edit triggers (unlike simple onEdit, these may
  // call external URLs).
  ScriptApp.newTrigger('onSheetEdit').forSpreadsheet(ss).onEdit().create();
  ScriptApp.newTrigger('onSheetEdit').forSpreadsheet(ss).onChange().create();
  // Reliability floor: a guaranteed ping every 5 min from Google's scheduler, so
  // a missed/throttled edit can never leave the site stale for more than ~5 min.
  ScriptApp.newTrigger('heartbeat').timeBased().everyMinutes(HEARTBEAT_MIN).create();
  console.log(`Triggers installed: on-edit (instant) + heartbeat every ${HEARTBEAT_MIN} min.`);
}

/** Edit handler — throttled so a burst of edits coalesces into one refresh.
 * If an edit is throttled away, the 5-min heartbeat below still catches it. */
function onSheetEdit() {
  const props = PropertiesService.getScriptProperties();
  const now = Date.now();
  if (now - Number(props.getProperty('lastDispatch') || 0) < THROTTLE_MS) return;
  props.setProperty('lastDispatch', String(now));
  notifyGitHub();
}

/** Time-driven safety net: ping every HEARTBEAT_MIN minutes regardless of edits.
 * The refresh workflow only commits/deploys when the sheet actually changed, so
 * an unchanged poll is a cheap no-op. */
function heartbeat() {
  PropertiesService.getScriptProperties().setProperty('lastDispatch', String(Date.now()));
  notifyGitHub();
}

/** POST the repository_dispatch that kicks off the refresh workflow. */
function notifyGitHub() {
  const token = PropertiesService.getScriptProperties().getProperty('GITHUB_TOKEN');
  if (!token) throw new Error('Missing GITHUB_TOKEN script property (see setup step 3).');
  const res = UrlFetchApp.fetch(`https://api.github.com/repos/${GITHUB_REPO}/dispatches`, {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json' },
    payload: JSON.stringify({ event_type: 'sheet-updated' }),
    muteHttpExceptions: true,
  });
  const code = res.getResponseCode();
  if (code === 204) console.log('GitHub dispatch OK');
  else console.error(`GitHub dispatch failed: ${code} ${res.getContentText()}`);
}

/** Manual test — run this to verify the token + dispatch work. */
function testDispatch() {
  notifyGitHub();
}
