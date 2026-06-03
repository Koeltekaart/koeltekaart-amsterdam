# Unified Analysis Plan — Koeltekaart Amsterdam Policy Dashboard

**Date:** June 2026  
**Scope:** Datasets we have, datasets we could access, research questions answered and open, and what can be displayed on the map/dashboard.

---

## 1. Datasets we have

### 1a. In the repo / already processed

| Dataset | File | Key variables | Source |
|---|---|---|---|
| **Klimaatrisicokaarten GDB** | `charlie/Klimaatrisicokaarten/Risicokaarten definitief.gdb` | `HI_TOTAAL_S` (composite heat risk), `HI_BLOOTSTELLING_S` (exposure), `HI_GEVOELIGHEID_S` (sensitivity), `HI_AANPASSINGSVERMOGEN_S` (adaptive capacity), buurt geometry (498 buurten, EPSG:28992) | Gemeente Amsterdam |
| **Amsterdam buurt features** | `charlie/ams_features.gpkg` + `charlie/ams_features.csv` | `temp_mean` (surface temperature), `ndvi_mean`, `water_prc`, `road_prc`, `buurt_area`, population density, CBS distance variables (library, pool, GP, hospital, train station), socioeconomic indicators | CBS Buurtmonitor 2024 + Google Earth Engine |
| **HVI scores (computed)** | `charlie/hvi_scores.csv`, `Data_analysis/hvi_scores.csv` | `hvi`, `hvi_tier` (1–5), `hi_norm`, `svi_pca`, `cooling_access`, `quadrant`, `lisa_cluster` | Computed (heat_vulnerability_analysis.ipynb) |
| **HVI map (computed)** | `frontend/data/hvi_map.geojson`, `charlie/hvi_map.geojson` | All HVI score fields + buurt geometry | Computed |
| **Priority neighbourhoods** | `charlie/priority_neighborhoods.csv`, `Data_analysis/priority_neighborhoods.csv` | Top-20 urgent (high HVI + poor access) buurten ranked | Computed |
| **Surface temperature layer** | `frontend/data/stakeholders/temp_mean.geojson` | `buurtnaam`, `temp_mean`, geometry | Derived from ams_features.gpkg |
| **NDVI layer** | `frontend/data/stakeholders/ndvi.geojson` | `buurtnaam`, `ndvi_mean`, geometry | Derived from ams_features.gpkg |
| **Cooling asset distance** | `frontend/data/stakeholders/cooling_asset_distance.geojson` | `cooling_asset_distance_index`, `cooling_asset_priority`, distances to library/pool/museum | Computed (charlie.ipynb cell 20) |
| **Healthcare distance** | `frontend/data/stakeholders/healthcare_distance.geojson` | `healthcare_distance_index`, `healthcare_priority`, distances to GP/hospital | Computed (charlie.ipynb cell 20) |
| **Shade data** | `frontend/data/shade/*.geojson` (~100 files) | Sidewalk segments with `shade_percent_at_1000/1300/1530/1800`, `shade_availability_index_30/40/50`, `CBS_Buurtcode` | Gemeente Amsterdam |
| **Parks** | `frontend/data/raw/parks.json` | Name, stadsdeel, area (m²) | Gemeente Amsterdam open data |
| **Swimming spots** | `frontend/data/raw/zwemwater.geojson` | Category (Binnenzwembad, etc.), coordinates | Gemeente Amsterdam |
| **Water taps** | `frontend/data/raw/water_taps.geojson` | Display name, address, status | Gemeente Amsterdam |
| **Koelteplekken** | Google Sheet (live) | Name, type, address, hours, amenities, lat/lon | GGD Amsterdam |

### 1b. Charlie's analysis inputs (heat stratification, GWR)

Charlie's `charlie.ipynb` runs:
1. OLS regression: `temp_mean ~ ndvi_mean + water_prc + road_prc` (RQ1 baseline)
2. Spatial OLS with Moran's I check on residuals
3. **GWR (Geographically Weighted Regression)**: same variables but spatially varying coefficients — produces per-buurt NDVI cooling coefficients and GWR residuals
4. Exports `temp_mean.geojson` and `ndvi.geojson` for the web map

Key findings from charlie's notebook: strong spatial autocorrelation (Moran's I significant), GWR reveals NDVI cooling effect varies spatially — stronger in outer districts, weaker in the city centre.

### 1c. heat_vulnerability_analysis.ipynb (composite HVI)

This notebook (caution: built by Claude, verify against original data):
1. Loads klimaatrisicokaarten GDB + CBS PC6 2024 data
2. PCA on 6 social variables → Social Vulnerability Index (SVI)
3. Composite cooling access score from CBS distances
4. HVI = 40% × heat exposure + 40% × SVI + 20% × cooling access gap
5. Gap analysis (4-quadrant: high/low HVI × good/poor access)
6. Global Moran's I + LISA clustering
7. Exports `hvi_map.geojson`, `hvi_scores.csv`, `priority_neighborhoods.csv`

**Known issue:** The original `heat_ams.gpkg` had 0 rows (broken geometry source); the notebook pivoted to using the klimaatrisicokaarten GDB directly, which works. Verify outputs against independent buurt polygon source if spatial precision matters.

---

## 2. Datasets we could access (not yet in repo)

| Dataset | What it adds | How to get | Priority |
|---|---|---|---|
| **CBS PC6 2024 full release** | More granular socioeconomic data at postcode level (more precise than buurt-level) | CBS microdata portal / CBS StatLine | High — improves SVI precision |
| **Pedestrian network (OSMnx)** | Walking distances instead of Euclidean; enables shade-weighted routing (RQ6) | `osmnx.graph_from_place('Amsterdam, Netherlands')` — ~10 min fetch | High — transforms RQ6 from theoretical to computable |
| **GGD heat health outcomes** | Validates HVI against real excess mortality or heat-related ER visits | Contact GGD Amsterdam research dept. (ask for ambulance call / OSIRIS data per CBS buurtcode) | High — only way to validate the model |
| **Gemeente Amsterdam bomenkaart (tree canopy)** | Tree-specific canopy vs general NDVI; much better predictor of local cooling | Amsterdam open data portal (BGT/bomenkaart) | Medium — improves RQ5 |
| **Nighttime LST (Google Earth Engine)** | Heat stress for elderly peaks at night; daytime surface temp misses this | Same GEE pipeline as `temp_mean`, filter to 22:00–04:00 | Medium — important for elderly vulnerability |
| **Spot capacity / quality data** | All 12 koelteplekken treated as equal; a supermarket ≠ a library for dwell time | Manual or from GGD — add fields to koelteplekken CSV | Medium — improves access score realism |
| **Multi-year CBS data (2020–2024)** | Temporal trends in vulnerability; shows whether interventions helped | CBS StatLine longitudinal pull | Low — nice-to-have once pipeline is stable |
| **KNMI heat warning history** | Match heat events to data for retrospective validation | KNMI open data API | Low |

---

## 3. Research questions — what's answered, what's open

### RQ1 — Is heat exposure socially stratified? ✅ Partially answered

**What charlie.ipynb does:** OLS and GWR of `temp_mean` on vegetation/water/road physical predictors. Confirms significant spatial clustering. Establishes the physical heat surface.

**What's missing:** The social stratification part — the OLS in charlie uses physical predictors only (NDVI, water, road). The regression of temp on socioeconomic variables (income, age65+, non-western background) controlling for physical factors has not been run yet.

**To close RQ1:**
1. Add socioeconomic variables to the regression: `temp_mean ~ ndvi + water + road + pct_low_income + pct_65plus + pct_nonwestern`
2. Report standardised β for social vs physical predictors
3. Map residuals: buurten where temp is higher than the physical profile predicts (unexplained UHI)

**Map display:** Surface temperature choropleth (already live). Residual layer (not yet exported).

---

### RQ2 — Do vulnerable neighbourhoods also have worst cooling access? ✅ Answered (HVI gap analysis)

**What heat_vulnerability_analysis.ipynb does:** Computes composite HVI, classifies buurten into 4 quadrants (high/low HVI × good/poor access), identifies the 251 "double disadvantaged" buurten.

**What's missing:** Bivariate LISA map (high-SVI clusters with low-access clusters), quantile regression to test whether access deficit is worse at the vulnerability tails.

**Map display:** HVI choropleth (live), gap quadrant as tooltip label. Bivariate choropleth (not yet exported — would require 2×2 colour ramp).

---

### RQ5 — Does green infrastructure compensate where cooling spots are absent? ⬜ Not run

**Required analysis:**
1. Split buurten into "served" (spot within 1km) vs "unserved"
2. Within unserved: OLS `temp_mean ~ ndvi + water + road`
3. Interaction model: `temp_mean ~ ndvi * served + controls`
4. Equity test: does NDVI vary by SVI within unserved group?

**Why it matters for policy:** If NDVI cools effectively even without koelteplekken, tree planting is an efficient complement. If it doesn't — or does so inequitably — the case for more spots strengthens.

**Map display:** Scatter (NDVI vs temp_mean by served/unserved), NDVI quartile choropleth with 1km spot buffers overlaid.

**Data needed:** All already in repo (`ndvi.geojson`, `temp_mean.geojson`, koelteplekken coordinates). Can run now.

---

### RQ6 — Are walking routes to cooling spots heat-stressful? ⬜ Not run (requires OSMnx)

**Required analysis:**
1. Load all `shade/*.geojson` (100+ files) into one GeoDataFrame
2. Fetch Amsterdam pedestrian network via OSMnx
3. Assign shade-based heat stress weight to each edge
4. Compute shade-weighted routes from top-20 HVI buurten to nearest spot
5. Equity test: SVI vs route shade score

**Why it matters:** A spot 600m away through unshaded arterials is functionally inaccessible during a 36°C heatwave for an elderly person.

**Map display:** Route layer (line geometries coloured by shade level), summary table per spot.

**Data needed:** OSMnx network (30 min to fetch). All shade data already in repo.

---

## 4. What's live on the map/dashboard (Policy View)

| Layer | Status | Detail panel |
|---|---|---|
| Heat Vulnerability Index (HVI) | ✅ Live | Full dashboard: score, tier, rank, LISA cluster, nearest spot distance, what-if analysis, similar buurten, radar + distribution charts |
| Surface temperature | ✅ Live | Hover: buurt name + temp_mean |
| Vegetation index (NDVI) | ✅ Live | Hover: buurt name + NDVI value |
| Cooling asset distance | ✅ Live | Hover: buurt name + index value |
| Healthcare distance | ✅ Live | Hover: buurt name + index value |

---

## 5. Unified pipeline (recommended)

The current pipeline has a partial overlap between charlie.ipynb (RQ1 physical analysis, produces temp + NDVI geojsons) and heat_vulnerability_analysis.ipynb (RQ2 composite HVI). Both use `ams_features.gpkg` as the primary data source. The recommended pipeline:

```
ams_features.gpkg  ──────────────────────────────────────────────────────────┐
                                                                              │
  charlie.ipynb                                                               │
  ├── OLS/GWR: temp_mean ~ physical                       → temp_mean.geojson │
  ├── [ADD] OLS: temp_mean ~ physical + social            → social_stratification.csv
  └── [ADD] Residual map export                           → temp_residual.geojson
                                                                              │
  heat_vulnerability_analysis.ipynb                                           │
  ├── PCA → SVI                                                               │
  ├── Cooling access score                                                     │
  ├── HVI = 40% heat + 40% SVI + 20% access gap          → hvi_map.geojson   │
  ├── Gap analysis (4 quadrants)                          → hvi_scores.csv    │
  ├── LISA clustering                                     → priority_neighborhoods.csv
  ├── [ADD] Bivariate LISA map export                     → bivariate_lisa.geojson
  └── [TODO] RQ5 NDVI compensation analysis               → ndvi_compensation.csv
                                                                              │
  charlie.ipynb cell 20 (OR merge into unified notebook)                     │
  └── Distance indices (cooling assets, healthcare)       → cooling_asset_distance.geojson
                                                              healthcare_distance.geojson
                                                                              │
  [NEW] rq6_routing.ipynb  (requires OSMnx)                                  │
  └── Shade-weighted routes                               → routes.geojson    │
```

**Recommended action:** Move charlie.ipynb's cell 20 (distance index computation) into `heat_vulnerability_analysis.ipynb` so all composite scores are computed in one place. Charlie's analysis focus remains on the spatial regression (GWR).

---

## 6. Next steps by priority

### Immediate (no new data needed)
1. **RQ1 social stratification**: Add socioeconomic predictors to charlie's OLS/GWR, export residual layer
2. **RQ5 NDVI compensation**: Run stratified analysis (served vs unserved buurten), export results as geojson for map
3. **Bivariate LISA export**: Export bivariate HVI × access choropleth geojson from `heat_vulnerability_analysis.ipynb`
4. **Validate HVI outputs**: Cross-check `hvi_map.geojson` fields against `hvi_scores.csv` — ensure LISA cluster labels are populated (currently `Not computed` for many buurten due to spatial weights issues)

### Medium term (OSMnx setup required, ~1–2 weeks)
5. **RQ6 routing**: Fetch Amsterdam pedestrian network, merge shade files, compute shade-weighted routes

### Longer term (new data required)
6. **GGD health outcome validation**: Contact GGD Amsterdam for ambulance/ER data to validate HVI against actual heat mortality
7. **Tree canopy layer**: Request bomenkaart from Gemeente Amsterdam open data for improved RQ5

---

## 7. Known data quality issues

| Issue | Impact | Status |
|---|---|---|
| `heat_ams.gpkg` originally had 0 rows | HVI notebook was rewritten to use klimaatrisicokaarten GDB directly | Workaround in place |
| LISA cluster field largely `Not computed` | LISA labels in HVI dashboard are often blank or "Not significant" | Fix: check spatial weights matrix construction in cell 24–26 of heat_vulnerability_analysis.ipynb |
| CBS cooling variables use Euclidean distances | Underestimates access deficit near water/rail barriers | Acceptable for now; replace with OSMnx walking distances in RQ6 |
| Only 12 active koelteplekken | Access gap likely underestimated | Expand dataset when GGD activates more spots |
| charlie.ipynb paths hardcoded to `c:\Users\charl\...` | Notebook only runs on Charlie's machine as-is | Refactor to use relative paths (`Path(__file__).parent`) |
