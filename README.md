# Koeltekaart Amsterdam

Interactive map for Amsterdam residents to find cooling spots during heat waves. Shows cooling shelters (koelteplekken), drinking water taps, and parks. Built for GGD Amsterdam.

**Features:**
- Cooling shelter locations with opening hours, amenities, and photos
- 550+ public drinking water taps
- Green space / parks overlay
- Real-time weather (Open-Meteo, no API key required)
- "Near me" geolocation with 1 km radius
- Heat plan banner — activatable via API
- Bilingual: Dutch / English
- Mobile-friendly

---

## Quick start

**Requirements:** Python 3.10+

```bash
cd backend
pip install -r requirements.txt
flask --app wsgi:app run
```

Open http://localhost:5000

---

## Docker (recommended for deployment)

```bash
docker-compose up --build
```

Open http://localhost:8000

To set the heat plan secret:
```bash
HEAT_PLAN_SECRET=your-secret docker-compose up
```

---

## Configuration

| Environment variable | Default | Description |
|---|---|---|
| `PORT` | `8000` | Port the server listens on |
| `HEAT_PLAN_SECRET` | *(none)* | Secret key to protect the heat plan toggle. If not set, anyone can toggle. |
| `COOLMAP_DATA_ROOT` | project root | Override path to the `data/` directory |

---

## Data files

All map data lives in `data/`. Partners only need to edit one file:

| File | Description |
|---|---|
| `data/koelteplekken.csv` | **Main file** — cooling shelter locations. Edit this to add/update locations. |
| `data/raw/parks.json` | Amsterdam parks (GeoJSON, from municipality open data) |
| `data/raw/water_taps.geojson` | Drinking water taps (GeoJSON, from Waternet) |

---

## API endpoints

| Endpoint | Description |
|---|---|
| `GET /api/health` | Health check |
| `GET /api/weather` | Current weather for Amsterdam |
| `GET /api/heat-plan` | Get heat plan status |
| `POST /api/heat-plan` | Toggle heat plan `{ "active": true, "secret": "..." }` |
| `GET /api/v1/geojson/koelteplekken` | Cooling shelters GeoJSON |
| `GET /api/v1/geojson/parks` | Parks GeoJSON |
| `GET /api/v1/geojson/water-taps` | Water taps GeoJSON |
| `GET /api/v1/nearest?lat=&lon=` | Nearest resources to a coordinate |
| `GET /api/v1/meta/layers` | Layer metadata and feature counts |

---

## Project structure

```
koeltekaart-amsterdam/
├── backend/               # Flask application
│   ├── wsgi.py            # Entry point
│   ├── requirements.txt
│   └── coolmap/
│       ├── __init__.py    # App factory
│       ├── config.py      # Paths and environment config
│       ├── geo.py         # Geospatial utilities
│       └── blueprints/
│           └── api.py     # All API routes
├── frontend/              # Static web application
│   ├── index.html
│   ├── css/app.css
│   ├── js/app.js
│   ├── fonts/             # Amsterdam Sans typeface
│   └── images/            # Logo and location photos
├── data/
│   ├── koelteplekken.csv  # ← Edit this to update cooling spots
│   └── raw/
│       ├── parks.json
│       └── water_taps.geojson
├── Dockerfile
├── docker-compose.yml
├── Procfile               # For Heroku / Railway deployment
└── GUIDE.md               # Non-technical partner guide
```
