# Research Plan — Heat Access & Vulnerability (Amsterdam)
**Project:** Koeltekaart Amsterdam — Policy Dashboard  
**Approach:** Computational Social Science  
**Date:** May 2026

---

## Theoretical Framework

The four research questions together build a single argument through an environmental justice lens:

> *In Amsterdam, social disadvantage predicts both greater heat exposure and worse access to cooling relief. Passive infrastructure (green space, shade) partially compensates, but is unevenly distributed. Existing cooling spot provision has not been allocated according to need.*

**RQ1** establishes the background condition (heat burden is socially stratified).  
**RQ2** shows the access deficit compounds it (double exposure).  
**RQ5** tests whether green infrastructure substitutes where spots are absent.  
**RQ6** tests whether the routes to existing spots are themselves stressful for vulnerable groups.

---

## RQ1 — Is heat exposure socially stratified in Amsterdam?

### Refined question
Do socially disadvantaged groups — low-income households, elderly residents, and residents with a non-western migration background — live in systematically hotter neighborhoods, after controlling for physical land-cover characteristics (vegetation, water, road surface, density)?

### Why this matters
If heat burden is socially stratified, it is an environmental injustice, not a random spatial pattern. This is the foundational claim the other RQs build on.

### Data available
| Variable | Source | Notes |
|---|---|---|
| `temp_mean` | `ams_features.csv` / `heat_features_clean.csv` | Mean surface temperature per buurt (Google Earth Engine) |
| `ndvi_mean` | Same | Vegetation density |
| `water_prc` | Same | % surface water |
| `road_prc` | Same | % road surface |
| `bevolkingsdichtheidInwonersPerKm2` | `ams_features.csv` | Population density |
| `percentagePersonenMetLaagInkomen` | `ams_features.csv` | Low income % |
| `percentagePersonen65JaarEnOuder` | `ams_features.csv` | Elderly % |
| `percentageNietWesterseMigratieachtergrond` | `ams_features.csv` | Non-western migration background % |
| `percentageHuishoudensOnderOfRondSociaalMinimum` | `ams_features.csv` | Households at/below social minimum |
| Buurt geometry | `heat_ams.gpkg` | **Currently 0 rows — needs fixing** |

### Data missing / needed
- **Buurt polygons** (fix `heat_ams.gpkg` or source from PDOK/gemeente Amsterdam open data) — needed for spatial lag model
- Ideally: nighttime temperature (LST) separately from daytime — heat stress is worst at night for the elderly

### Method
1. **OLS baseline:** `temp_mean ~ NDVI + water_prc + road_prc + density + income_low% + age65% + nonwestern%`
2. **Spatial lag model** (if Moran's I on residuals is significant): replace OLS with `spreg.OLS` + queen contiguity weights — accounts for the fact that neighboring buurten affect each other's temperature
3. Report standardised β coefficients as effect sizes; compute partial R² for social vs physical predictors
4. **Residual map:** buurten where temp is higher than the model predicts — unexplained urban heat island

### Visualisation on site
- **Choropleth:** `temp_mean` by buurt, with toggle to overlay social vulnerability indicators
- **Scatter panel:** temp vs income / temp vs % 65+ with regression line (interactive tooltip showing buurt name)
- **Residual layer:** "underexplained heat" map — where is it hotter than the vegetation/water/road profile would predict?

---

## RQ2 — Do socially vulnerable neighborhoods also have the worst cooling access?

### Refined question
Is social vulnerability spatially correlated with low cooling infrastructure access — and is this relationship stronger at the tails of the distribution (i.e., the most vulnerable neighborhoods face the steepest access deficit)?

### Why this matters
Separate from heat exposure, this tests whether the distribution of relief infrastructure compensates for or amplifies existing inequality. The combination of RQ1 + RQ2 defines "double exposure."

### Data available
| Variable | Source | Notes |
|---|---|---|
| Social vulnerability index (SVI) | Computed in notebook via PCA | PC1 of: single-person HH, WMO clients, low income, below social minimum, non-western background, 65+ |
| `bibliotheekGemiddeldeAfstandInKm` | `ams_features.csv` | Proxy for cooling shelter access |
| `zwembadGemiddeldeAfstandInKm` | `ams_features.csv` | |
| `treinstationGemiddeldeAfstandInKm` | `ams_features.csv` | Transit to reach spots |
| `koelteplekken.csv` | Site data | 12 active spots with coordinates, type, hours |
| HVI scores | Computed in notebook | Composite vulnerability index |

### Data missing / needed
- **Actual walking distance** (not Euclidean) from each buurt centroid to each of the 12 spots — needs OSMnx pedestrian network
- **Spot capacity / quality rating** — currently all 12 spots are treated as equal; a supermarket and a library are not equivalent cooling resources
- GGD health outcomes per buurt (heat-related ER visits, excess mortality) — gold standard for validation; contact GGD Amsterdam research department

### Method
1. **Cooling access score** (already partially built): composite of inverted CBS distance variables, normalised 0–1
2. **Direct distance** to nearest of 12 active spots (Euclidean as first pass; OSMnx walking distance as refinement)
3. **Bivariate spatial autocorrelation** (Lee's L statistic or bivariate Moran's I): test whether high-SVI buurten cluster with low-access buurten — produces a bivariate LISA map
4. **Quantile regression** (`statsmodels.formula.api.quantreg`): `cooling_access ~ SVI` at τ = 0.25, 0.50, 0.75, 0.90 — tests whether the access deficit is worse at higher vulnerability levels
5. **Concentration curve / Gini:** rank buurten by SVI, plot cumulative cooling access — is it pro-poor or pro-rich?

### Visualisation on site
- **Bivariate choropleth:** 2×2 colour matrix (high/low SVI × high/low access) — the "double disadvantage" map; most actionable visual for policy makers
- **Bar chart:** mean cooling access score by SVI quintile — simple, legible, citable
- **Distance ring overlay:** show 800m walking circles from each of the 12 spots; show what % of tier-4/5 HVI buurten fall outside all circles

---

## RQ5 — Does green infrastructure compensate where cooling spots are absent?

### Refined question
In neighborhoods without a cooling spot within walkable distance, does higher vegetation density (NDVI) meaningfully reduce surface temperature — and is this compensatory effect large enough to matter, and distributed fairly across social groups?

### Why this matters
If green infrastructure substitutes for active cooling provision, it changes the policy prescription (plant trees vs open more spots). If it does not compensate — or compensates unevenly — the case for expanding koelteplekken strengthens.

### Data available
| Variable | Source | Notes |
|---|---|---|
| `ndvi_mean` | `ams_features.csv` | Buurt-level mean NDVI |
| `temp_mean` | `ams_features.csv` | Surface temperature |
| `water_prc` | `ams_features.csv` | |
| `parks.json` | Site data | Park name, stadsdeel, area (m²) |
| `zwemwater.geojson` | Site data | Swimming locations |
| SVI / HVI | Computed | Social vulnerability |
| Spot locations | `koelteplekken.csv` | 12 active spots |

### Data missing / needed
- **Tree canopy coverage per buurt** — NDVI includes all vegetation; tree canopy specifically is the relevant cooling mechanism. Available from gemeente Amsterdam BGT/bomenkaart
- **Park accessibility** — `parks.json` has location and area but not opening hours or shade quality
- **Nighttime LST** — green space cools afternoons but heat stress for elderly peaks at night when NDVI effect is minimal

### Method
1. **Stratified analysis:** split buurten into "served" (spot within 1km) vs "unserved" (no spot within 1km) using the 12 active spots
2. **Within unserved group:** OLS `temp_mean ~ NDVI + water_prc + road_prc` — what is the NDVI cooling coefficient in °C per 0.1 NDVI unit?
3. **Interaction model (full sample):** `temp_mean ~ NDVI * served + controls` — test whether NDVI's cooling effect differs between served and unserved areas
4. **Effect size check:** is the NDVI–temp relationship large enough to be thermally meaningful (>0.5°C per 0.1 NDVI)? Compare to benchmarks from urban heat island literature
5. **Equity test:** does NDVI vary by SVI within the unserved group? — are the most vulnerable unserved buurten also the least green?

### Visualisation on site
- **Scatter:** NDVI vs temp_mean, coloured by served/unserved, with regression lines for each group
- **Map:** NDVI quartile choropleth, with cooling spot 1km buffers overlaid — visually shows where green is present but spots are not, and vice versa
- **Summary stat callout:** "Buurten in the top NDVI quartile are X°C cooler on average — but Y% of the most vulnerable residents live in low-NDVI areas without a cooling spot"

---

## RQ6 — Are walking routes to cooling spots themselves heat-stressful for vulnerable groups?

### Refined question
For each of the 12 active cooling spots, how shaded are the pedestrian routes from nearby high-vulnerability neighborhoods — and do route shade levels systematically differ based on the social profile of the origin neighborhood?

### Why this matters
Proximity is not access. A cooling spot 600m away through an unshaded arterial road is functionally inaccessible during a 36°C heatwave for an elderly person or someone with reduced mobility. This operationalises "effective access" vs nominal access and is methodologically novel.

### Data available
| Variable | Source | Notes |
|---|---|---|
| `shade/*.geojson` | Site data | ~100+ files; sidewalk segments with `shade_percent_at_1000`, `shade_percent_at_1300`, `shade_percent_at_1530`, `shade_percent_at_1800`; `CBS_Buurtcode` attached |
| `shade_availability_index_30/40/50` | Same | Index at 30°, 40°, 50° sun angle |
| Spot coordinates | `koelteplekken.csv` | 12 active spots |
| HVI / SVI | Computed | To select origin neighborhoods |
| Buurt centroids | Derived from geometry | Starting points for routing |

### Data missing / needed
- **Pedestrian network** — OSMnx can fetch this from OpenStreetMap for Amsterdam; needed to compute actual routes (not straight-line)
- **Mobility profile of vulnerable population** — walking speed assumptions for elderly/mobility impaired (literature standard: 0.8 m/s vs 1.4 m/s for average adult)
- **Spot accessibility ratings** — `koelteplekken.csv` has `accessible` column (yes/no) but no detail on ramp access, step height etc.

### Method
1. **Load and merge shade files:** combine all `shade/*.geojson` into one GeoDataFrame; each segment has buurt code + time-of-day shade %
2. **Build pedestrian network:** `osmnx.graph_from_place('Amsterdam')` filtered to walk edges
3. **Weight edges by shade:** assign each network edge a "heat stress weight" = 1 − shade_percent_at_1300 (peak heatwave hour); optionally use `shade_availability_index_40` (40° sun angle ≈ Amsterdam summer peak)
4. **Route computation:** for top-20 HVI buurten, find shortest *shade-weighted* route to nearest active cooling spot; record: total distance, % of route shaded, max continuous unshaded segment
5. **Equity test:** correlate origin buurt SVI with route shade score — are vulnerable residents walking through less-shaded streets?
6. **Sensitivity:** repeat with 10:00 and 15:30 shade values; does the ranking of routes change by time of day?

### Visualisation on site
- **Route layer:** draw the actual shade-weighted walking routes from top-10 HVI buurten to nearest spot; colour each route segment by shade level (green = shaded, red = exposed)
- **Summary table:** for each of the 12 spots — catchment population, % vulnerable within 800m, mean route shade score
- **"Effective distance" metric:** display alongside nominal distance — "800m walk, but only 23% shaded at 13:00" — a single legible number for policy makers

---

## Implementation roadmap

### Phase 1 — Fix geometry & complete existing notebook (prerequisite for all RQs)
- Fix `heat_ams.gpkg` (0-row issue) or replace with PDOK buurt polygons
- Re-run cells 22–31 (LISA, maps, export)
- Export `hvi_scores.csv` and `hvi_map.geojson`

### Phase 2 — RQ1 & RQ2 (no new data needed, ~1 week)
- Spatial regression for RQ1 (`spreg`, `libpysal`)
- Bivariate LISA and quantile regression for RQ2
- Export results as GeoJSON layers for site

### Phase 3 — RQ5 (no new data needed, ~3 days)
- Stratified NDVI–temp analysis
- Interaction model
- Equity check within unserved group

### Phase 4 — RQ6 (requires OSMnx setup, ~1–2 weeks)
- Merge shade files, build pedestrian graph
- Shade-weighted routing for top-20 HVI buurten
- Route export as GeoJSON for site overlay

### Phase 5 — Policy dashboard build
- Separate site route (e.g. `/beleid` or `/dashboard`)
- Map layers toggled by RQ theme
- Summary statistics panel (not just map)
- Dutch + English language toggle

---

## Data gaps summary

| Gap | Impact | How to fill |
|---|---|---|
| Buurt geometry (`heat_ams.gpkg` empty) | Blocks spatial models + maps for all RQs | Download from PDOK or Amsterdam open data |
| Pedestrian network | Blocks RQ6 routing | `osmnx.graph_from_place()` — free, ~10 min to fetch |
| Tree canopy per buurt | Improves RQ5 | Gemeente Amsterdam bomenkaart (open) |
| GGD heat health outcomes | Validates HVI against real outcomes | Contact GGD Amsterdam research |
| Spot capacity / quality | Improves RQ2 access score | Manual data collection / gemeente |
| Nighttime LST | Improves RQ1 & RQ5 | Google Earth Engine (same pipeline as daytime) |
