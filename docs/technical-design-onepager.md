# Koeltekaart Amsterdam — Technical Design (One Page)

*A public map of cool refuge places ("koelteplekken") during heat, built for the
GGD / Gemeente Amsterdam. This brief is for another municipality that wants to
join the pilot or reuse the design.*

## Design principles
- **Fully static, no backend, no runtime database.** The site is HTML + CSS + one
  JavaScript file plus static data files. It can be hosted anywhere that serves
  files (Azure Static Web Apps today) and can be handed to a city CMS as a `.zip`
  with `index.html` at the root — no server to operate, patch, or scale.
- **Same-origin by default.** The public page makes almost no third-party calls:
  location data is served as static CSVs from the same origin; only weather, the
  basemap, and address search touch external (Dutch-government / open) APIs.
- **Privacy-friendly.** Cookieless analytics; geolocation used only on the user's
  action and never stored; a strict Content-Security-Policy locks down what the
  page may load or connect to.
- **Accessible & bilingual.** NL/EN toggle, keyboard/skip-link navigation, ARIA
  live regions, and the Amsterdam Design System look-and-feel.

## Front-end
- **Map:** Leaflet (vendored, self-hosted — no CDN).
- **Basemap:** PDOK *BRT Achtergrondkaart (grijs)* WMTS — official Dutch national
  map, no API key.
- **Address search:** PDOK Locatieserver (suggest + lookup), scoped to the city.
- **Weather:** Open-Meteo (free, keyless) for the live heat context.
- **Shade overlay:** sidewalk-shade as **PMTiles vector tiles** (built with
  tippecanoe, rendered via protomaps-leaflet). The browser fetches only the tiles
  in view (~tens of KB) instead of a 29 MB GeoJSON — smooth, GPU-composited zoom.
- Features: category & amenity filters, "near me", per-location opening hours with
  a fault-tolerant parser, photos, and an optional **heat-plan** banner toggle.

## Data model
One row per location in `data/locations.csv` (name, district, type, address,
lat/long, active flag, website, photo, description, and boolean amenity columns:
seating, toilets, free water, A/C, wheelchair access, etc., plus per-weekday
opening hours). A small `data/settings.csv` carries only the heat-plan toggle.
Category/amenity **labels** are in code, not data.

## Data pipeline (kept live-fresh, still 100% static to the public)
1. Editors maintain a private source sheet (Google Sheet today; a de-Google path
   to Excel + MS Forms in SharePoint is planned).
2. A **GitHub Action** reads the sheet **server-side via a service account**
   (official API — never a public link), on every edit + a periodic heartbeat.
3. A **column allow-list** copies only the agreed *public* columns into the
   committed CSV — internal columns (contacts, approval notes) can never leak.
4. `validate_data.py` gates the run (e.g. blocks unparseable opening hours);
   photos are mirrored from Drive, optimised to ≤1200px JPEG, and served
   same-origin.
5. A race-proof commit triggers the Static Web Apps deploy → live within minutes.
Test runs on non-main branches upload an artifact instead of deploying, so
verifying the pipeline never touches the live site.

## Hosting & security
- **Azure Static Web Apps** (Free tier), chosen so an eventual handoff stays
  inside the municipality's Microsoft tenant. Domain: koeltekaartamsterdam.nl.
- `staticwebapp.config.json` sets HSTS, `X-Content-Type-Options`,
  `X-Frame-Options: DENY`, `Referrer-Policy`, a scoped `Permissions-Policy`, and a
  strict **CSP** allow-listing exactly the few external hosts above.
- **Supports HTTP Range requests** (required by PMTiles).

## What another municipality needs to reuse this
- The static site (this repo) — mostly rebranding: logos, colours, text, city name.
- A **basemap & address source** for your country (PDOK is NL-specific; swap the
  tile URL and search API, and update the CSP `connect-src`/`img-src`).
- A **source spreadsheet** of local cool places following the CSV schema above.
- A place to run the refresh Action (GitHub Actions) and a static host that
  supports Range requests.
- Optional: your own shade dataset to rebuild the PMTiles overlay.

*Stack at a glance: HTML/CSS/JS · Leaflet · PMTiles/protomaps · PDOK · Open-Meteo ·
Python (GitHub Actions) · Azure Static Web Apps. No servers, no databases, no
API keys shipped to the browser.*
