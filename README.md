# Koeltekaart Amsterdam

An interactive map that helps people find cool locations, drinking water,
parks, and swimming spots during hot weather in Amsterdam.

## Features

- Cooling spots with opening hours, amenities, and photos
- Public drinking water taps
- Parks and green spaces overlay
- Official swimming spots
- Sidewalk shade overlay
- Live weather context
- Heat plan status banner
- Bilingual: Dutch / English
- Mobile-responsive, built with the Amsterdam Design System

## Architecture

The site is fully static, built with plain HTML, CSS, and JavaScript with static data
files. There is no backend, no database, and no build step. All logic runs in
the browser, so it can be served from any static host.

| Concern | Solution |
|---|---|
| Location data | Static CSV files, served from the same origin |
| Weather | Open-Meteo (public, no API key) |
| Basemap | PDOK BRT Achtergrondkaart (Dutch national map, no API key) |
| Address search | PDOK Locatieserver |
| Shade overlay | Vector tiles (PMTiles), rendered on demand |
| Map library | Leaflet (self-hosted) |
| Typeface | Amsterdam Sans (self-hosted) |

Only the basemap, address search, and weather touch external services; all other
content is served from the same origin.

## Quick start (local development)

The shade overlay is served as vector tiles, which requires a server that
supports HTTP Range requests. Use the included helper:

```bash
python3 serve.py 8008
```

Then open `http://localhost:8008`.

## Deployment

Any static host that supports HTTP Range requests works. Point the host at the
repository root — `index.html` is the entry point. The site is currently served
on [koeltekaartamsterdam.nl](https://www.koeltekaartamsterdam.nl).

## Project structure

```
koeltekaart-amsterdam/
├── index.html              # Public map — application entry point
├── dashboard.html          # Internal data dashboard (GitHub Pages)
├── serve.py                # Local dev server (adds HTTP Range support)
├── staticwebapp.config.json  # Azure headers, CSP, routing
├── css/app.css             # All styles
├── js/
│   ├── app.js              # Application logic
│   ├── hours.js            # Opening-hours parsing (shared with tests)
│   └── dashboard.js        # Data dashboard logic
├── fonts/                  # Amsterdam Sans
├── images/                 # Logos and location photos
├── libs/
│   ├── leaflet/            # Map library (self-hosted)
│   └── protomaps/          # Vector-tile renderer (self-hosted)
├── data/
│   ├── locations.csv       # Cooling locations
│   ├── settings.csv        # Heat plan toggle + banner copy (NL/EN)
│   ├── shade.pmtiles       # Sidewalk shade vector tiles (served)
│   ├── shade.geojson       # Shade source for the tiles (never deployed)
│   ├── build-shade.py      # Rebuilds shade.geojson from open data
│   ├── geo/                # District/neighbourhood polygons
│   └── layers/             # Parks, water taps, swimming spots
├── scripts/                # Data pipeline (runs in CI, never in the browser)
├── tests/                  # Node tests + load probe
├── .github/workflows/      # Refresh, validate, deploy
└── docs/                   # Documentation
```

## Documentation

| Document | What it covers |
|---|---|
| [DATA_PIPELINE.md](docs/DATA_PIPELINE.md) | How location data gets from the source sheet to the live site |
| [technical-design-onepager.md](docs/technical-design-onepager.md) | One-page design brief for other municipalities |
| [DOMAIN_SETUP.md](docs/DOMAIN_SETUP.md) | DNS and custom-domain configuration |
| [DOMAIN_REGISTRATIE.nl.md](docs/DOMAIN_REGISTRATIE.nl.md) | Domeinregistratie (NL) |
| [location-template.csv](docs/location-template.csv) | Column template for bulk location import |

## Tests

```bash
node tests/hours.test.cjs
```

## Data model

Each cooling location is one row in `data/locations.csv`: name, district,
category, address, coordinates, website, photo, description, opening hours per
weekday, and boolean amenity columns (seating, toilets, free water, air
conditioning, wheelchair access, and more).

