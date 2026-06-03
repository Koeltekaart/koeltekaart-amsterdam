# Unified Analysis Plan — Koeltekaart Amsterdam Policy Dashboard

**Date:** June 2026  
**Scope:** Datasets we have, datasets we can access, research questions answered and open, and what outputs are displayable on the map/dashboard.

---

## 1. Datasets we have

### 1a. Core datasets (in repo / already processed)

| Dataset | File | Key variables | Source | Status |
|---|---|---|---|---|
| **Klimaatrisicokaarten (cleaned)** | `charlie/analysis/cleaned_climate_risk_data.csv` | `HI_TOTAAL_S.0` (total heat risk), `DR_AV_MATE_VAN_VERHARDING_V.0` (impervious surface), `DR_BS_GROEN_PUBLIEK_V.0` (public green), `DR_BS_GROEN_PRIVAAT_V.0` (private green), `WO_GV_OPPERVLAKTE_WATER_V.0` (surface water area), `HI_BS_SCHADUW_OP_LOOPGEBIEDEN_V.0` (sidewalk shade), `HI_AV_TOEGANG_TOT_TUIN_V.0` (garden access), + 120 more variables across HI/DR/WO/WV risk domains | Gemeente Amsterdam | ✅ Ready |
| **Klimaatrisicokaarten (GDB)** | `charlie/Klimaatrisicokaarten/Risicokaarten definitief.gdb` | Same 132 columns + buurt geometry (500 buurten, EPSG:28992) | Gemeente Amsterdam | ✅ Ready |
| **Amsterdam buurt features** | `charlie/ams_features.gpkg` / `charlie/ams_features.csv` | `temp_mean` (daytime surface LST from GEE), `ndvi_mean`, `water_prc`, `road_prc`, `buurt_area`, 200+ CBS Buurtmonitor variables (demographics, income, distances) | CBS + GEE | ✅ Ready (481 buurten) |
| **CBS PC6 2024** | `data/raw/2025-cbs_pc6_2024_v1/cbs_pc6_2024_v1.gpkg` | Postcode-6 level socioeconomic data — more granular than buurt; spatial join to buurten yields finer SVI | CBS | ✅ Ready (543 MB) |
| **HVI scores (computed)** | `charlie/hvi_scores.csv`, `Data_analysis/outputs/` | `hvi`, `hvi_tier` (1–5), `hi_norm`, `svi_pca`, `cooling_access`, `quadrant`, `lisa_cluster` | Computed | ✅ Ready |
| **Intervention priority scores (computed)** | `charlie/analysis/intervention_priority.csv` | `name`, `HI_TOTAAL_S.0`, `DR_AV_MATE_VAN_VERHARDING_V.0`, `intervention_priority`, `priority_class` | Computed (drivers_of_heat.ipynb) | ✅ Ready |
| **Surface temperature layer** | `frontend/data/stakeholders/temp_mean.geojson` | `buurtnaam`, `temp_mean`, geometry | GEE pipeline | ✅ Live on map |
| **NDVI layer** | `frontend/data/stakeholders/ndvi.geojson` | `buurtnaam`, `ndvi_mean`, geometry | GEE pipeline | ✅ Live on map |
| **Cooling asset distance** | `frontend/data/stakeholders/cooling_asset_distance.geojson` | Standardised index of distances to library/pool/museum | Computed | ✅ Live on map |
| **Healthcare distance** | `frontend/data/stakeholders/healthcare_distance.geojson` | Standardised index of distances to GP/hospital | Computed | ✅ Live on map |
| **HVI map** | `frontend/data/hvi_map.geojson`, `charlie/hvi_map.geojson` | Full HVI scores + geometry | Computed | ✅ Live on map |
| **Shade data** | `frontend/data/shade/*.geojson` (~100 files) | Sidewalk segments: `shade_percent_at_1000/1300/1530/1800`, `shade_availability_index_30/40/50`, `CBS_Buurtcode` | Gemeente Amsterdam | ✅ Live on map |
| **Parks / water taps / swimming** | `frontend/data/raw/` | Point and polygon layers for community view | Gemeente Amsterdam | ✅ Live on map |
| **Koelteplekken** | Google Sheet (live) | Name, type, address, hours, amenities, coordinates | GGD Amsterdam | ✅ Live on map |

### 1b. What drivers_of_heat.ipynb established

Charlie's `drivers_of_heat.ipynb` (RQ3 + RQ4) runs on `cleaned_climate_risk_data.csv` and establishes:

- **OLS regression**: `HI_TOTAAL_S.0 ~ impervious + public_green + private_green + surface_water` — all significant, R²≈0.30
- **Key correlations with heat risk**: Impervious surface (+0.381), Public green (–0.363), Private green (–0.215), Surface water (–0.160), Sidewalk shade (–0.072), Garden access (–0.002)
- **Intervention priority score** = `heat_norm + impervious_norm − green_norm` — ranks which buurten would benefit most from environmental intervention (more green, less impervious)

This is a *physical environment* model of heat risk, distinct from the HVI which adds social vulnerability. It answers a fundamentally different policy question: *where should the city plant trees and permeable pavement, not just where should koelteplekken go*.

---

## 2. Datasets we can access now

### 2a. Tree canopy — Amsterdam WFS

**Endpoint:** `https://api.data.amsterdam.nl/v1/wfs/bomen`  
**Feature type:** `app:stamgegevens`  
**Total records:** ~300,000 trees (paginated, no official count exposed by API)  
**Key fields:** `gbd_buurt_id` (direct buurt linkage), `boomhoogteklasse_actueel` (height class a–g: <6m to >24m), `soortnaam` (species), `jaar_van_aanleg` (year planted), `soortnaam_top` (genus)

**What this adds that NDVI doesn't:**
- NDVI captures all vegetation (grass, shrubs, rooftops with moss) — tree canopy is the specific mechanism of urban cooling via shade and evapotranspiration
- Tree height class maps to canopy area — tall mature trees (>12m) provide dramatically more cooling than saplings
- Tree age / planting year enables urban forestry equity analysis (older greener areas vs recently invested areas)

**Buurt-level aggregates to compute:**
- `tree_count`, `tree_density_per_km2` (count ÷ buurt_area)
- `pct_mature_trees` (height class ≥ d, i.e. ≥12m)
- `mean_height_score` (map classes to numeric: a=3, b=6, c=10.5, d=13.5, e=16.5, f=21, g=26)
- `tree_species_richness` (number of distinct soortnaam_top per buurt)

**Map display:** Tree density choropleth (new policy layer).

### 2b. OSMnx — pedestrian network

**Package:** `pip install osmnx`  
**Data source:** OpenStreetMap, fetched on demand  
**Usage:** `osmnx.graph_from_place("Amsterdam, Netherlands", network_type="walk")` — returns a networkx graph of the pedestrian network (~1–2 min to download, ~100 MB)

**What this enables:**
- Actual walking distances from buurt centroids to nearest koelteplek (vs Euclidean)
- RQ6: shade-weighted routing — assign heat stress weight `1 − shade_pct_at_1300` to each edge, compute least-stressful routes
- "Effective access" metric: actual walking distance × mean shade on route → single number per buurt-spot pair

**Status:** Code written in pipeline; requires one-time network download. Cached as `outputs/amsterdam_walk.graphml` after first run.

### 2c. Nighttime LST — Google Earth Engine

**Note:** Daytime `temp_mean` already in `ams_features.gpkg` IS surface LST from GEE (Landsat 8/9 Band 10, daytime passes). This covers peak afternoon heat (13:00–15:00 CEST satellite overpass).

**For nighttime LST** (relevant because heat stress for elderly peaks at night when buildings have absorbed heat):
- Requires `pip install earthengine-api` + `ee.Authenticate()` + GEE project
- Pipeline includes the full GEE Python code (`MODIS/061/MOD11A2` or Landsat nighttime filter) but wrapped in try/except
- **KNMI fallback:** KNMI Open Data API provides hourly weather station data which can be interpolated to buurt level as a proxy for nighttime ambient temperature

**Status:** Code in pipeline, conditional on GEE auth. Not blocking — daytime LST sufficient for primary analysis.

### 2d. Multi-year CBS data

**What you have:** CBS Buurtmonitor data for multiple years (2020–2024)

**Does it add value?** Yes — for three reasons:

1. **Vulnerability trend score** (Δ SVI over time): A buurt whose social vulnerability is rising is a different policy target than one holding steady or improving. Gentrification pressure, aging-in-place patterns, and post-COVID income changes are detectable here.

2. **Regression to the mean check**: If a buurt scored Tier 5 in 2020 and is now Tier 3, an intervention may already be working (or the population changed). Treating it as current top-priority based on 2024 data alone would miss this.

3. **Validating HVI stability**: If rankings are stable across years, the HVI is robust. If they flip a lot, the weights may be over-fitting to one year's data.

**Implementation:** Compute SVI for each year separately → merge on `buurtcode` → create `svi_trend` (OLS slope of SVI vs year). Include in final export and map display.

---

## 3. Datasets we cannot access (and proxies)

### Health outcomes proxy

**Why we can't access outcomes directly:** GGD Amsterdam ambulance/ER heat-related admission data requires institutional data agreement. OSIRIS mortality data is not open. Direct validation of HVI against deaths is blocked.

**Proxies we can compute from data we have:**

| Proxy | Variable | Justification | Limitation |
|---|---|---|---|
| **WMO care dependency rate** | `aantalWmoClientenPer1000Inwoners` | People receiving municipal care are registered as frail/vulnerable; heat causes acute decompensation in exactly this group | Captures chronic frailty, not heat-specific events |
| **Heat stress exposure index** | `temp_mean × pct_65plus × population_density` (normalised) | Combines physical heat burden with the most heat-vulnerable demographic at local density; predicts total heat stress events better than temp alone | Non-linear interactions not captured |
| **CBS perceived health** | `percentagePersonenMetErvaringsGezondheidGoed` (if in PC6 data) | Community-level self-reported health is a validated predictor of all-cause and heat-related mortality in Dutch literature | Self-report bias; not heat-specific |
| **Medication sensitivity index** | `aantalPersonenMetEenAowUitkeringTotaal ÷ aantalInwoners` (elderly on pension = elderly living alone, likely not working) | Proxy for elderly living independently without daily care check-ins | Very rough proxy |

**Recommended composite health proxy:** `heat_stress_exposure = normalise(temp_mean) × normalise(pct_65plus) × normalise(population_density) × normalise(wmo_rate)` — use as a fifth validation dimension for HVI tier assignments.

---

## 4. Research questions — status

### RQ1 — Is heat exposure socially stratified? ✅ Partially answered

**Answered:** Spatial autocorrelation (Moran's I) confirms heat is not randomly distributed. Charlie's GWR shows NDVI cooling is spatially non-stationary.

**Not yet run:** The social stratification regression — `temp_mean ~ physical_controls + pct_65plus + pct_low_income + pct_nonwestern`. Now can be run with tree canopy density added as a better physical control.

**With new data:** Add `tree_density_per_km2` as physical control. Test whether socioeconomic residuals persist after controlling for trees + NDVI + impervious surface.

**Map output:** Residual layer (buurten hotter than their physical profile predicts).

---

### RQ2 — Do vulnerable neighbourhoods have worst cooling access? ✅ Answered (with refinements possible)

**Answered:** HVI gap analysis identifies 251 double-disadvantaged buurten.

**Refinement available:** OSMnx walking distances replace Euclidean, making the access score more realistic near water/rail barriers.

**Map output:** HVI choropleth (live), bivariate SVI × access choropleth (pending export).

---

### RQ3 — What physical environment drives heat risk? ✅ Answered (drivers_of_heat.ipynb)

**Answered:** OLS on klimaatrisicokaarten physical variables. Impervious surface (+), public green (–), private green (–), surface water (–) all significant. Together explain ~30% of heat risk variance.

**Enhancement:** Add tree canopy density (trees per km², pct_mature) as predictor. This is the mechanistically correct variable — current model uses broad green space categories.

**Map output:** Intervention priority layer (new) — ranks buurten by combination of high heat + high impervious surface + low green.

---

### RQ4 — Which buurten have greatest potential for environmental intervention? ✅ Answered (drivers_of_heat.ipynb)

**Answered:** `intervention_priority = heat_norm + impervious_norm − green_norm`. Priority classes (Very Low → Very High) exported.

**Enhancement:** Update formula to use tree density as additional modifier: `intervention_priority = heat_norm + impervious_norm − green_norm − tree_density_norm`. This distinguishes heavily paved buurten with no trees (priority for tree planting) from equally impervious buurten that already have dense street trees.

**Map output:** Intervention priority choropleth (new policy layer).

---

### RQ5 — Does green infrastructure compensate where cooling spots are absent? ⬜ Not run

**Data now available:** `ndvi_mean`, `tree_density_per_km2` (new), `DR_BS_GROEN_PUBLIEK_V.0`, spot locations.

**Method:**
1. Stratify buurten into "served" (spot within 1km) vs "unserved"
2. OLS within unserved: `temp_mean ~ ndvi + tree_density + water + impervious`
3. Interaction model: `temp_mean ~ ndvi * served + tree_density * served + controls`
4. Test: is the compensation effect larger in tree-dense unserved buurten?

**New question enabled by tree data:** Which unserved high-vulnerability buurten have *both* low NDVI *and* low tree density? Those are the true green deserts — highest priority for both koelteplekken AND tree planting.

---

### RQ6 — Are walking routes to cooling spots heat-stressful? ⬜ Ready to run

**All data available:** Shade files in `frontend/data/shade/`, koelteplekken coordinates, OSMnx network (needs one download).

**Method:**
1. Build Amsterdam pedestrian network via OSMnx
2. Match shade segments to OSM edges by geometry proximity
3. Assign heat stress weight = `1 − shade_pct_at_1300` to each edge
4. Find shade-optimal route (not shortest) from top-20 HVI buurt centroids to nearest spot
5. Compute: route distance, % shaded, max consecutive unshaded metres
6. Equity test: does `svi_pca` predict route shade quality?

**New enhancement:** Incorporate tree canopy — streets with dense mature trees (boomhoogteklasse ≥ d) get reduced heat stress weight even where shade sensors are unavailable.

---

### RQ7 (NEW) — Are social vulnerability trends identifying emerging hotspots? ⬜ Enabled by multi-year CBS

**Question:** Are there buurten with rapidly *worsening* vulnerability trends that do not yet score in the top tier on 2024 data alone?

**Method:**
1. Compute SVI for each available CBS year (2020, 2021, 2022, 2023, 2024)
2. OLS slope of SVI vs year per buurt → `svi_trend` coefficient
3. Flag: buurten in tier 2–3 HVI but with strongly positive SVI trend (worsening fast)
4. Contrast with tier 4–5 buurten where SVI is improving (may be lower priority than their current score suggests)

**Map output:** Vulnerability trend layer (rising/stable/falling).

---

## 5. Unified pipeline (revised)

```
INPUT DATASETS
│
├── cleaned_climate_risk_data.csv          (klimaatrisicokaarten, 500 buurten, all 132 cols)
├── ams_features.gpkg / .csv              (buurt-level physical + CBS summary)
├── data/raw/2025-cbs_pc6_2024_v1/        (PC6-level CBS, 543 MB, spatial join)
├── [WFS fetch] tree stamgegevens          (300k trees → buurt aggregates)
├── [OSMnx] Amsterdam walk graph          (pedestrian network)
└── [optional] multi-year CBS             (trend scores)
│
PROCESSING (pipeline.ipynb)
│
├── Section A: Data loading, cleaning, CBS missing-code removal
├── Section B: Tree data fetch + buurt aggregation (density, height, species)
├── Section C: CBS PC6 spatial join → buurt-level SVI inputs
├── Section D: EDA, normality tests, outlier detection
├── Section E: Correlation, VIF, multicollinearity
├── Section F: PCA → SVI (from CBS PC6 variables)
├── Section G: RQ3 physical drivers OLS (from klimaatrisicokaarten variables)
│             └── enhanced with tree_density_per_km2
├── Section H: RQ4 intervention priority scoring (from drivers_of_heat, enhanced)
├── Section I: Heat stratification (RQ1): full model with trees + social
├── Section J: Spatial autocorrelation (Moran's I + LISA)
├── Section K: RQ2 cooling access gap analysis + quantile regression
├── Section L: Composite HVI (weights, tiers, validation)
├── Section M: Health proxy computation
├── Section N: RQ5 green infrastructure compensation analysis
├── Section O: RQ6 shade-weighted routing (OSMnx, conditional)
├── Section P: Multi-year vulnerability trends (conditional)
├── Section Q: Bootstrap + sensitivity analysis
└── Section R: Export all geojsons + CSVs
│
MAP/DASHBOARD OUTPUTS
├── hvi_map.geojson          → HVI choropleth + detail panel (already live)
├── temp_mean.geojson        → Surface temperature (already live)
├── ndvi.geojson             → NDVI (already live)
├── cooling_asset_distance.geojson (already live)
├── healthcare_distance.geojson    (already live)
├── tree_canopy.geojson      → Tree density choropleth (NEW)
├── intervention_priority.geojson → Environmental intervention priority (NEW)
└── vuln_trend.geojson       → Vulnerability trend layer (NEW, if multi-year available)
```

---

## 6. Data quality & known issues

| Issue | Impact | Resolution |
|---|---|---|
| `ams_features.gpkg` has 481 buurten; klimaatrisicokaarten has 500 | 19 buurten (mostly Weesp) lack CBS data | Merge by buurtnaam with fuzzy match; leave CBS-missing fields null |
| Tree WFS does not expose total count | Pagination requires probing; dataset ~300k | Loop from offset 0 in batches of 10,000 until empty response |
| CBS PC6 (543 MB) too large to load in full on low-RAM machines | Spatial join may fail | Load with bounding box filter for Amsterdam municipality; project to EPSG:28992 |
| `drivers_of_heat.ipynb` uses hardcoded `../Klimaatrisicokaarten/Excel ruwe data klimaatrisicokaarten.xlsx` with `header=6` (data starts row 7) | Notebook only runs from its own directory | Pipeline uses `cleaned_climate_risk_data.csv` which is already exported |
| LISA cluster field sparse (`Not computed`) in existing HVI outputs | LISA labels in dashboard often blank | Verify `libpysal` Queen weights construction; fall back to KNN if Queen fails |
| `temp_mean` is daytime LST only | Misses nighttime peak heat stress | Write GEE nighttime code (conditional on auth); flag in outputs |
| No validated health outcomes | HVI tiers cannot be externally validated | Use WMO rate + composite heat-stress exposure index as proxies |
| Multi-year CBS years not yet aligned to repo | Trend analysis not yet runnable | User to deposit additional year files in `data/raw/cbs_[year]/`; pipeline reads all matching pattern |

---

## 7. What to tell a policy maker

After running the full pipeline, clicking any buurt in Policy View gives:

| Panel element | Source | What it tells the policy maker |
|---|---|---|
| HVI score + tier | pipeline.ipynb Section L | Overall vulnerability priority |
| Dominant driver | Pipeline analytics | Heat, social vulnerability, or poor access — directs the right intervention |
| Nearest cooling spot distance | Live computation | Whether a new koelteplek is needed |
| Intervention priority class | RQ4 / Section H | Whether *environmental* intervention (trees, permeable paving) would move the needle |
| Tree canopy density | Section B | Whether the buurt is a green desert |
| What-if analysis | Dashboard panel | How much each intervention shifts the tier |
| Vulnerability trend | Section P | Whether the situation is getting worse year-on-year |
| LISA cluster | Section J | Whether this is a structural area problem or an isolated case |
| Health proxy exposure index | Section M | Rough relative risk compared to city average |
