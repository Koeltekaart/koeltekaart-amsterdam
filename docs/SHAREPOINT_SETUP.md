# SharePoint / Microsoft 365 Setup

The recommended way to run the Koeltekaart's location data, heat-plan status, and
photos on Microsoft 365 — GGD edits a SharePoint List, the public website stays
**100% client-side** and reads only static files.

This guide describes **one** opinionated, best-practice setup (not a menu of
options) and is written so the same setup works on a **private server now** and
moves to an **amsterdam.nl municipality server later with zero app changes**.

---

## The one idea that makes everything else simple

The website never talks to SharePoint. It only ever fetches **two static files**
from its *own origin*:

```
  /data/koelteplekken.geojson   ← all locations (+ photo URLs)
  /data/settings.json           ← heat-plan switch + optional label overrides
```

```
  EDIT  (GGD, M365 login)                READ  (public browser, anonymous)
  ┌──────────────────────────┐  publish  ┌──────────────────────────────────┐
  │ SharePoint List           │  ───────► │ <site>/data/koelteplekken.geojson │
  │  • Koelteplekken (rows)    │  Power    │ <site>/data/settings.json         │
  │  • Instellingen (settings) │  Automate │ <site>/data/photos/<id>.jpg       │
  │  • photo attachments       │           └──────────────────────────────────┘
  └──────────────────────────┘                 ▲ the site fetches here
        ▲ GGD edits here                          (HTTPS, read-only, no auth, no CORS)
        (secure, private)
```

Because the two files live **next to the website** (same origin, relative paths),
there are **no secrets in the browser, no CORS, and no cross-domain trust**. The
*only* moving part that ever changes between hosts is **where the publish step
drops those two files** — never the app, never the config.

**Private-server → municipality move = copy the site + repoint the publish
step's upload target. The `data/*` contract is identical.**

---

## Why GeoJSON + JSON (and not CSV)

The app supports CSV too, but for this setup publish **GeoJSON** for locations
and **JSON** for settings:

- **One self-contained file** that is the native format for a map — no column
  ordering to keep in sync.
- **No CSV-escaping traps.** Descriptions with commas, quotes, or line breaks
  just work; CSV requires careful quoting in the flow.
- The app treats GeoJSON `feature.properties` exactly like a data row, so the
  field names below are the same ones the CSV template already uses.

---

## Part A — The SharePoint Lists

### List 1: "Koelteplekken" (the locations)

One column per template field (see [`location-template.csv`](location-template.csv)).
**Keep the internal column names identical to these field names** — the app maps
data by name, so matching them means zero code changes.

| Column | Type | Notes |
|---|---|---|
| `name` | Single line of text | reuse the built-in **Title** column |
| `latitude`, `longitude` | Number (8 decimals) | **required** |
| `type` | Choice | `library`, `church`, `supermarket`, `urban_farm`, `community_center`, `theater`, `sports` |
| `stadsdeel`, `wijk`, `address` | Single line of text | district / neighbourhood / street |
| `active` | Yes/No | controls visibility on the map (keeps the data when hidden) |
| `website_url` | Hyperlink | |
| `description`, `note` | Multiple lines of text | shown in the detail panel |
| `airco`, `seating`, `toilets`, `free_water`, `free_fruit`, `food_to_buy`, `own_food_ok`, `supervisor`, `accessible`, `games`, `pets_ok` | Yes/No | amenity chips |
| `hours_mon` … `hours_sun` | Single line of text | `HH:MM-HH:MM`, blank = closed |
| `heat_mon` … `heat_sun` | Single line of text | heat-plan-only hours (blank = same as regular) |
| **Attachments** | (built-in) | one photo per item — see Part B |

> New `type` values you invent later appear on the map automatically (a colour is
> auto-assigned from the Amsterdam palette). Add a label override in Part C if you
> want a nicer display name.

### List 2: "Instellingen" (settings)

A two-column List that drives the heat-plan banner and optional labels:

| Column | Type |
|---|---|
| `key` | Single line of text |
| `value` | Single line of text |

| key | value | meaning |
|---|---|---|
| `heat_plan_active` | `TRUE` / `FALSE` | **required** — flips the whole site into heat-plan mode |
| `category.<type>.nl` | e.g. `Museum` | optional Dutch label for a `type` |
| `category.<type>.en` | e.g. `Museum` | optional English label |
| `amenity.<key>.nl` / `.en` | e.g. `Kluisjes` / `Lockers` | optional amenity labels |

---

## Part B — Photos (no URLs for GGD)

GGD just clicks **Add attachment** on the location item — one image, no links, no
Drive. The publish flow copies that attachment to `data/photos/<id>.jpg` and
writes that **relative** path into the item's `photo_url` property. The app
accepts a relative photo path as-is, so this needs **no code change**.

**Recommended image specs:** landscape, ≥ 800 × 500 px, ≤ 2 MB, JPG or WebP.

*Lightweight alternative:* commit photos into the site's `data/photos/` folder
at deploy time and put just the filename in `photo_url`. Fine for rarely-changing
photos; attachments + flow is better for "GGD updates it themselves."

---

## Part C — The Power Automate publish flow

One flow turns the Lists into the three published artifacts. Build it once in
Power Automate (it runs under a GGD service account, never in the browser).

**Trigger — choose near-instant updates:**
- **When an item is created or modified** in *Koelteplekken* (recommended — the
  map reflects an edit within a minute), and a second copy of the flow on
  *Instellingen* so flipping the heat plan publishes immediately.
- The site itself re-polls every 5 minutes, so a *Recurrence (5 min)* trigger is
  an acceptable lower-effort alternative.

**Steps — locations + photos → `koelteplekken.geojson`:**
1. **Get items** from *Koelteplekken*.
2. For each item with an attachment: **Get attachments** → **Get attachment
   content** → upload to `data/photos/<id>.jpg` on the publish target. Remember
   the relative path `photos/<id>.jpg`.
3. **Select** — map each item into a GeoJSON Feature:
   - `type`: `"Feature"`
   - `geometry`: `{ "type": "Point", "coordinates": [ longitude, latitude ] }`
     *(longitude first)*
   - `properties`: every field from Part A, plus `photo_url` = the path from
     step 2 (omit if no photo). Yes/No columns can be emitted as real JSON
     `true`/`false` **or** the strings `"yes"`/`"no"` — both are accepted.
4. **Compose** — wrap the Select output:
   `{ "type": "FeatureCollection", "features": <select output> }`.
5. **Create file / upload** the Compose output as `data/koelteplekken.geojson`.

**Steps — settings → `settings.json`:**
6. **Get items** from *Instellingen*, **Select** into key/value pairs, **Compose**
   into a flat object, e.g. `{ "heat_plan_active": "TRUE", "category.museum.nl": "Museum" }`,
   and upload as `data/settings.json`.

When GGD edits a location or flips `heat_plan_active`, the flow republishes and
the live site reflects it on its next poll.

---

## Part D — Where the flow uploads (now vs. later)

The flow's *only* job is to put `koelteplekken.geojson`, `settings.json`, and the
photos into the site's **`/data/` folder**. Pick the upload connector that fits
the host; the app never changes.

**Best end-state — same origin as the site (no CORS, no absolute URLs):**
serve `data/*` from the very web root that serves `index.html`. Then the app's
default relative paths (`data/koelteplekken.geojson`) just work everywhere.

| Phase | Publish target | Flow action |
|---|---|---|
| **Private server (now)** | the server's web-root `data/` folder via **SFTP/FTP** | *SFTP – Create file* (premium connector) |
| **Private server (now), no file access** | **Azure Blob** public container, then a small scheduled pull onto the server's `data/` | *Create blob (V2)* |
| **Municipality (later)** | amsterdam.nl static-asset `data/` folder, same origin as the app | whatever their platform exposes (SFTP / Blob / SharePoint-synced web root) |

> **Connector note:** SFTP/FTP and Azure Blob are **premium** Power Automate
> connectors and need the matching license. The standard **SharePoint** /
> **OneDrive** "Create file" actions are free — usable if the host serves a
> synced SharePoint library as its `data/` folder.

If a host genuinely cannot serve the files same-origin, you can still use an
absolute URL (e.g. an Azure Blob public container) — see Part E — and add a CORS
rule allowing `GET` from the site's origin. Prefer same-origin; it is simpler and
more secure.

---

## Part E — Point the website at the files

One block in `js/app.js`, at the top (`DATA_SOURCE`). For the recommended
same-origin setup, use **relative** paths — these need no change when you move
hosts:

```js
const DATA_SOURCE = {
  type: "geojson",
  locationsUrl: "data/koelteplekken.geojson",
  settingsUrl:  "data/settings.json",
};
```

Only if you had to publish to a *different* origin (e.g. Azure Blob), use the
absolute URLs instead and add the CORS rule from Part D:

```js
const DATA_SOURCE = {
  type: "geojson",
  locationsUrl: "https://<account>.blob.core.windows.net/koeltekaart/koelteplekken.geojson",
  settingsUrl:  "https://<account>.blob.core.windows.net/koeltekaart/settings.json",
};
```

That is the entire cutover. Field mapping, filters, opening-hours logic, photos,
and the heat-plan banner all keep working unchanged.

---

## Security summary (for the amsterdam.nl review)

- **No credentials in the browser.** The site fetches only public, read-only files.
- **Writes are authenticated.** Editing happens in SharePoint behind GGD's M365
  (Azure AD) login; the public can never reach the List or the flow.
- **Same-origin, read-only output.** Only the three published artifacts are
  public; with same-origin hosting there is no CORS surface and nothing to list
  or write.
- **HTTPS everywhere** — the site and the published files.
- **No third-party data processors.** Replaces Google Sheets (data) and Google
  Drive (photos) with Microsoft 365 + Gemeente hosting.

---

## Day-to-day workflow for GGD

- **Add / edit a location:** open *Koelteplekken*, edit the row, attach a photo.
  It appears on the map within a minute (next poll).
- **Hide a location:** set `active` to **No** (data is kept, just hidden).
- **Activate the heat plan:** in *Instellingen*, set `heat_plan_active` to `TRUE`
  (or `FALSE`). The banner and heat-plan opening hours switch automatically.
- **External organisations** (libraries, churches, …) do **not** edit directly —
  they send details to GGD, who enters them in the List.
