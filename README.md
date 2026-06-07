# Koeltekaart Amsterdam — Heat Vulnerability Dashboard

An interactive web tool that maps heat in Amsterdam at the neighbourhood (*buurt*) level. It
serves two audiences from one map:

- **Bewonerskaart (Community view)** — residents find nearby cooling spots (*koelteplekken*),
  drinking-water taps, parks, swimming spots and shade, with opening hours, facilities and photos.
- **Beleidskaart (Policy view)** — a heat-vulnerability dashboard for policymakers, built around a
  transparent **Heat Vulnerability Index (HVI)** per neighbourhood.

The whole product is **static** (HTML/CSS/JS). The analysis that produces the policy data lives in a
separate, reproducible Python notebook.

## Live version

A live deployment is available at **http://koeltekaart-amsterdam-uva.onrender.com/**. The tool is
intended to move to its permanent municipal home at **amsterdam.nl/koeltekaart**, which may already be
live at the time of reading. (This repository remains the complete, self-contained static product; the
live links are provided for reference only.)

---

## The four research questions (Policy view)

The Policy view is organised as four top-level views, one per research question, selectable from the
tab strip above the map:

1. **Heat exposure** — *Which physical characteristics drive a neighbourhood's heat?*
   Surface temperature; greenery, water and street trees as the cooling levers.
2. **Social vulnerability** — *Are socially vulnerable neighbourhoods also those with the worst access
   to cooling?* The "double disadvantage".
3. **Heat Vulnerability Index** — *Can heat, social vulnerability and cooling access be combined into
   one robust, tiered index?* The composite.
4. **Priority for action** — *Where do cooling measures deliver the most?* Intervention ranking,
   spatial clusters and "green deserts".

---

## Methodology — the HVI

The HVI follows the IPCC **hazard × sensitivity × adaptive-capacity** framing as three **independent**
0–1 pillars (no indicator is counted twice):

```
HVI = 0.40 · heat exposure  +  0.40 · social vulnerability  +  0.20 · (1 − cooling access)
```

| Pillar | What it is | Source |
|---|---|---|
| **Heat exposure** | Pure hazard | Landsat surface temperature (2023 summer median) blended with the Klimaatrisicokaart exposure + perceived-temperature (PET) sub-scores |
| **Social vulnerability** | Who is sensitive | Klimaatrisicokaart official sensitivity score (65+, low-education, chronically ill, limited mobility, low income) + CBS single-person households & migration background |
| **Cooling access** | Adaptive capacity | CBS distance to 8 cool/AC public refuges (pool, library, supermarket, department store, cinema, museum, theatre, ice rink) + private garden access |

Neighbourhoods are split into five tiers by Fisher–Jenks natural breaks. The index is validated against
the city's official heat-risk score, stays stable under ±10% reweighting, and its clustering is
confirmed with Moran's I / LISA. Full derivation, statistics and figures are in the notebook.

> **Design note:** an earlier version used the Klimaatrisicokaart's *total* heat-risk score as the heat
> pillar, which silently double-counted social vulnerability and adaptive capacity. The pillars were
> re-derived to be independent — see `Data_analysis/pipeline.ipynb` §5, §8–9.

---

## Data sources

| Dataset | Provider | Use |
|---|---|---|
| Klimaatrisicokaart / Klimaateffectatlas (heat module) | Klimaateffectatlas | Heat exposure + social sensitivity |
| Kerncijfers wijken en buurten 2022 | CBS (via PDOK) | Demographics, income, amenity distances |
| Surface temperature & NDVI | Landsat 8 C2 L2 (Google Earth Engine) | Heat exposure, greenery |
| Street-tree register (~322k trees) | Gemeente Amsterdam open data | Tree density / canopy |
| Koelteplekken | GGD Amsterdam (`data/koeltekaart_data.csv`) | Cooling-spot locations |
| Basemap tiles, address search | PDOK | Map background, geocoding |
| Live weather | Open-Meteo | Landing weather widget |

Map tiles, address search and weather are **live external services**; everything else is bundled
locally as the replication sample (`frontend/data/`). The product is fully usable as static files; only
the basemap, search and weather widget require an internet connection.

---

## Run it

**Website** — any static server from the `frontend/` folder:
for mac user:
```bash
cd frontend
python3 -m http.server 8000
# open http://localhost:8000
```
for windows user:
```bash
cd frontend
python -m http.server 8000
# open http://localhost:8000
```
Deep-link a view with `?view=policy` or `?view=community`.

**Analysis pipeline** — regenerates `hvi_dashboard.geojson` and all figures:

```bash
cd Data_analysis
pip install -r requirements.txt
jupyter lab pipeline.ipynb     # run all cells
```

The notebook writes to `Data_analysis/outputs/`; copy `hvi_dashboard.geojson` into `frontend/data/` to
update the dashboard.

---

## Repository layout

```
frontend/              Static site (HTML/CSS/JS) — the deliverable product
  index.html
  css/app.css
  js/app.js
  data/                Bundled datasets: koelteplekken CSV, GeoJSON layers, photos
Data_analysis/         Reproducible analysis
  pipeline.ipynb       Full HVI derivation (RQ1–RQ4)
  requirements.txt
  inputs/  outputs/    Source tables and generated scores/figures
```

