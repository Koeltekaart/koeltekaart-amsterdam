# Koeltekaart Amsterdam

Interactive map for Amsterdam residents to find cooling spots, drinking water taps, parks, and swimming locations during heat waves. Built for and operated by GGD Amsterdam.

**Live features:**
- Cooling shelter locations with live opening hours, amenities, and photos
- 550+ public drinking water taps (Waternet)
- Parks and green spaces overlay
- Official swimming spots (Zwemwater)
- Sidewalk shade overlay (4 time-of-day snapshots)
- Real-time weather via Open-Meteo (no API key required)
- "Near me" geolocation with proximity sorting
- Heat plan status banner — controlled via Google Sheets
- Heat-plan-specific opening hours (separate from regular hours)
- Bilingual: Dutch / English
- Mobile-responsive, Amsterdam Design System compliant

---

## Architecture

**Fully static — no server required.** All application logic runs in the browser.

| Concern | Solution |
|---|---|
| Location data | Published Google Sheet (CSV export, polled every load) |
| Heat plan status | Same Google Sheet (`settings` tab) |
| Weather | Open-Meteo public API |
| Map tiles | CartoDB Light (free, no key) |
| Map library | Leaflet (bundled in `libs/`) |
| Typeface | Amsterdam Sans (bundled in `fonts/`) |

---

## Quick start (local development)

No build step is needed. Serve the repo root with any static file server:

```bash
# Python (built-in)
python3 -m http.server 8080

# Node (npx)
npx serve .
```

Open `http://localhost:8080`.

---

## Deployment

Any static hosting works: **GitHub Pages**, **Netlify**, **nginx**, **Apache**, or a simple S3 bucket.

Point the host to serve the repo root (`index.html` is the entry point).

---

## Google Sheets configuration

The app requires a published Google Sheet. See **[SHEETS_SETUP.md](SHEETS_SETUP.md)** for the full setup guide.

At minimum you need:
1. A Google Sheet with a `locations` tab and a `settings` tab.
2. The sheet published to the web (File → Share → Publish to web).
3. The published ID and tab GIDs entered in `js/app.js` under `SHEETS_SETUP`.

---

## Project structure

```
koeltekaart-amsterdam/
├── index.html              # Application entry point
├── css/app.css             # All styles (ADS-compliant)
├── js/app.js               # All application logic
├── fonts/                  # Amsterdam Sans (Regular, Bold, ExtraBold)
├── images/
│   ├── ggd-logo-nl.png     # GGD Amsterdam logo (Dutch)
│   ├── ggd-logo-en.png     # GGD Amsterdam logo (English)
│   ├── logo.png            # Koeltekaart mark
│   └── koelteplekken/      # Partner-supplied location photos
├── libs/leaflet/           # Leaflet map library (self-hosted)
├── data/
│   ├── shade-1000.geojson  # Sidewalk shade at 10:00
│   ├── shade-1300.geojson  # Sidewalk shade at 13:00
│   ├── shade-1530.geojson  # Sidewalk shade at 15:30
│   ├── shade-1800.geojson  # Sidewalk shade at 18:00
│   └── layers/
│       ├── parks.json              # Amsterdam parks (municipality open data)
│       ├── water-taps.geojson      # Drinking water taps (Waternet)
│       └── swimming-spots.geojson  # Swimming locations (Zwemwater)
└── docs/
    ├── README.md               # This file
    ├── PARTNER_GUIDE.nl.md     # Partner guide (Dutch)
    ├── PARTNER_GUIDE.en.md     # Partner guide (English)
    ├── SHEETS_SETUP.md         # Google Sheets setup instructions
    └── location-template.csv   # CSV template for bulk location import
```

---

## Adding or updating locations

Locations are managed exclusively through the Google Sheet — **no code changes required.**

See **[PARTNER_GUIDE.nl.md](PARTNER_GUIDE.nl.md)** (Dutch) or **[PARTNER_GUIDE.en.md](PARTNER_GUIDE.en.md)** (English) for field-by-field instructions.

---

## Activating the heat plan

1. Open the Google Sheet.
2. Go to the **settings** tab.
3. Set the value in the `heat_plan_active` row to `TRUE` or `FALSE`.

The banner updates within 5 minutes (the app polls the sheet on load and every 5 minutes).

---

## Contact

GGD Amsterdam — Leefomgeving@ggd.amsterdam.nl
