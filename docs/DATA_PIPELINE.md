# Data pipeline & opening-hours reliability

How the map gets its location data and opening hours, why it's built this way,
and how to change or stress-test it **without risking the live site**.

## Architecture

The site is fully client-side, and the public path is **static only**:

- **Public → static files** (`data/locations.csv`, `data/settings.csv`)
  Same-origin, served from the host's CDN. Fast, rock-solid under heavy traffic,
  and it makes **zero third-party calls** — visitors never touch Google and the
  spreadsheet is never exposed. This is the only path the site needs to work.

- **Ingestion → private GitHub Action** (`scripts/fetch_sheet.py`,
  `.github/workflows/refresh-data.yml`)
  A scheduled + edit-triggered Action reads the sheet **server-side** with a
  Google **service account** (official Sheets API, a live read — not the cached
  `/pub` snapshot), validates it, and regenerates the static files. The
  spreadsheet is shared **only** to the service account, so it stays fully
  private; nothing about the source reaches the public.

> A non-blocking client-side live-fetch path also exists in `js/app.js`
> (`DATA_SOURCE.liveSheet`) but is **intentionally disabled** here
> (`sheetId: ""`). Enabling it would put the real sheet id in public JS and
> require sharing the sheet publicly — not acceptable for a city-wide site. It
> is kept only for local/preview testing against a throwaway staging sheet.

### Why this fixes the old bug

Two causes, both addressed:

1. **Stale hours.** The old pipeline read the **"Publish to web"** snapshot
   (`/spreadsheets/d/e/<2PACX…>/pub?output=csv`), which is CDN-cached and lagged
   edits by minutes — so shortened hours kept showing the old times and sent
   people to closed locations. The Action now does a **live** Sheets-API read,
   so the static file reflects edits within the refresh interval (≈1 min on an
   edit trigger, a few minutes on the schedule fallback).
2. **A typo read as "Closed."** A malformed cell (`13:00-17`, `11:00-18:00 AM`)
   used to render as **Closed**. It now auto-repairs or shows "unknown" — see
   "Opening-hours parsing" below — and the validator blocks unparseable cells
   from deploying at all.

### Portability to municipal hosting

The static files are self-sufficient, so serving the site from municipal static
hosting needs **no code change** — the map works from the bundled files with
zero external dependencies. Only the *ingestion* (the GitHub Action) is
host-specific; on a new host you re-point whatever publishes to the same two
static files (Power Automate from SharePoint, a cron, etc.). The public contract
never changes.

## Opening-hours parsing (`js/hours.js`)

Each day cell becomes one of three things — this is the safety contract:

| Cell content | Result | Shown as |
|---|---|---|
| `09:00-17:00`, `9:00-17:00`, `13:00-17`, `11:00-18:00 AM`, `13.00-17.00` | auto-repaired to `HH:MM-HH:MM` | open/closed by clock |
| empty, `gesloten`, `closed`, `dicht`, `-`, `x`, `n/a` | **closed** | "Gesloten / Closed" |
| anything else non-empty (`open 24h`, `25:00-…`) | **unknown** | "unknown — check website" |

The key rule: **a cell we can't parse is never treated as "Closed."** A typo
must not make an open location look shut. The logic is pure and unit-tested.

## Settings tab (live switches, no deploy)

The **Instellingen** tab is a plain `key` / `value` sheet. Unlike the locations
tab it has **no column allow-list** (`fetch_sheet.py` emits it whole), so adding
a row here is all it takes — nothing to change in the Action. The site re-reads
it on the same ~5-minute poll, so a change goes live within a refresh cycle.

| key | value | meaning |
|---|---|---|
| `heat_plan_active` | `TRUE` / `FALSE` | flips the banner, the map pulse and heat-plan opening hours |
| `hours_display` | `today` / `week` | one row for today, or the full Mo–Su grid |
| `banner_active_nl` | free text | banner sentence while the plan is **on**, Dutch |
| `banner_active_en` | free text | banner sentence while the plan is **on**, English |
| `banner_inactive_nl` | free text | banner sentence while the plan is **off**, Dutch |
| `banner_inactive_en` | free text | banner sentence while the plan is **off**, English |

Every key has a safe in-code default, so a missing row, a blank cell or a typo
never blanks the site — it falls back to the copy that shipped with the release.

**Rewording the banner.** The four `banner_*` rows let GGD retitle the site's
emergency-comms line mid-heatwave ("code oranje", extended hours) without a
deploy. The two languages are independent: fill only `banner_active_nl` and
English keeps its standard sentence rather than showing Dutch to EN visitors.
Empty the cell again to return to the shipped copy.

These rows are the deliberate exception to the rule that display labels live in
code (`TYPE_DISPLAY_*`, `AMENITY_LABELS`) — fewer live moving parts means fewer
ways for the public site to break, and category labels change rarely enough to
ride a release. The banner is the one string that has to change *during* an
incident, so it earns the live path.

## One-time setup (service-account ingestion)

Done once, then hands-off. The spreadsheet stays **private** the whole time.

1. **Create a service account** (a "robot" Google identity):
   - Google Cloud Console → create/pick a project → **Enable** the *Google
     Sheets API*.
   - IAM & Admin → **Service Accounts** → Create. No roles/permissions needed.
   - On the new service account → **Keys** → Add key → **JSON** → download it.
     Note the account's email (looks like `name@project.iam.gserviceaccount.com`).
2. **Share the sheet to the robot, privately:** open the Google Sheet → Share →
   paste the service-account email → **Viewer** → Send. Do **not** enable
   "anyone with the link". This is the only access the robot needs.
3. **Add two GitHub secrets** (repo → Settings → Secrets and variables →
   Actions → **Secrets**):
   - `SHEET_ID` — the real id from the editing URL
     `https://docs.google.com/spreadsheets/d/`**`THIS`**`/edit` (not the `2PACX…`
     publish id).
   - `GOOGLE_SERVICE_ACCOUNT_KEY` — paste the **entire JSON** key file contents.
4. **Run it:** Actions → *Refresh data from Google Sheet* → **Run workflow**.
   A green run that commits/deploys data means it's working. The service-account
   key does not expire, so this keeps running untouched.

### Instant updates (Apps Script trigger)

The GitHub schedule alone is best-effort (often delayed 15–45 min). For ~1-minute
updates, an Apps Script pings GitHub on every sheet edit. Script + setup steps are
in `docs/apps-script-trigger.gs`. It needs a GitHub token:

1. GitHub → Settings → Developer settings → **Fine-grained personal access tokens**
   → Generate. **Resource owner:** Koeltekaart. **Repository access:** Only select
   repositories → `koeltekaart-amsterdam`. **Permissions:** Repository →
   **Contents: Read and write** (the minimum `repository_dispatch` needs). Set an
   expiration (e.g. 1 year) and note the renewal date.
2. Put it in the Apps Script as the `GITHUB_TOKEN` script property and run `setup`
   (see the .gs file). The schedule stays as a self-healing backup.

If the Apps Script is ever removed, nothing breaks — updates just fall back to the
schedule until it's restored.

The frontend needs **no** sheet configuration — it serves the static files the
Action produces. `DATA_SOURCE.liveSheet.sheetId` stays `""` in production.

## Testing safely (the live site stays untouched)

### 1. Unit tests — the hours logic
```
node tests/hours.test.cjs
```
Runs the exact `js/hours.js` the browser uses. Covers the live regressions
(`13:00-17`, `11:00-18:00 AM`), `gesloten` → closed, and unparseable → unknown.

### 2. Data validation — the deploy gate
```
python3 scripts/validate_data.py data/locations.csv
```
Mirrors the browser parser. **Fails** on any unparseable hours cell (blocking the
refresh workflow from deploying it) and **warns** on auto-repaired cells to tidy
at the source. Runs automatically in `refresh-data.yml` before commit/deploy.

### 3. End-to-end on a **staging copy** — never production
1. Make a **copy** of the production sheet (File → Make a copy). Share it
   "Anyone with the link → Viewer". This is your blast radius.
2. Open a PR with these changes → Azure builds a **preview URL**
   (`…azurestaticapps.net`).
3. Point the preview at the staging sheet **from the URL** (overrides are gated
   to localhost / `*.azurestaticapps.net`, ignored on the production domain):
   - `?sheet=<STAGING_SHEET_ID>` — use the staging sheet for live refresh
   - `?datasrc=static` — disable live refresh (verify pure-static behavior)
   - `?livefail=1` — force every live fetch to fail (verify graceful fallback)
4. In the staging sheet, run the **stress scenarios** and watch the preview:
   - Shorten a location's hours → it updates within the refresh interval.
   - Type a malformed cell (`13:00-17`, `11:00-18:00 AM`) → still shows correct
     hours (auto-repair); type real garbage (`open 24h`) → shows "unknown",
     **not** "Closed".
   - Set a day to `gesloten` → that day shows Closed.
   - Empty the sheet / break sharing → preview keeps the last good data
     (no blank map). `?livefail=1` reproduces this on demand.

Locally you can do the same with `python3 serve.py` and
`http://localhost:8000/?sheet=<STAGING_SHEET_ID>`.

### 4. Load / heavy-traffic probe
```
# Guaranteed path must be 100% under burst:
node tests/load-probe.cjs https://koeltekaartamsterdam.nl/data/locations.csv 500 50
# Inspect live-sheet behaviour under load (keep counts modest — third party):
node tests/load-probe.cjs "https://docs.google.com/spreadsheets/d/<ID>/gviz/tq?tqx=out:csv&gid=0" 100 10
```
The static probe should report 0 failures. If the gviz probe shows throttling
(429s/timeouts) under load, that's expected and exactly why the live layer is
non-blocking with a static fallback.
