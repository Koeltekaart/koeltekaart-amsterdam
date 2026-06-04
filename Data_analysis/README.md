# Heat-Vulnerability Analysis — Amsterdam

This folder contains the data-analysis component of the Koeltekaart project: a single,
reproducible notebook that builds a neighbourhood-level **Heat Vulnerability Index (HVI)**
for Amsterdam and the figures/exports that feed the policy dashboard.

## Contents

| Path | What it is |
|---|---|
| `pipeline.ipynb` | **The deliverable.** A self-contained, narrated analysis answering four research questions (drivers of heat risk, the social-vulnerability/cooling-access double disadvantage, the composite HVI, and where to intervene). |
| `inputs/` | The cleaned input tables the pipeline reads: `ams_features.csv` (CBS + remote-sensing features), `climate_risk_scores.csv` (official heat-risk scores), `trees_raw.json` (≈322k street trees) and `buurten_geometry.geojson` (buurt boundaries). |
| `requirements.txt` | Pinned Python dependencies. |
| `outputs/` | Generated artefacts only: figures (`fig_*.png`), the per-buurt score table (`hvi_scores.csv`) and the dashboard layer (`hvi_dashboard.geojson`). |

> Other exploratory notebooks from group members remain in the repository for reference but
> are **not** part of this pipeline and are not required to reproduce any result here.

## How to run

```bash
python -m venv .venv && source .venv/bin/activate     # or: python3 -m venv .venv
pip install -r Data_analysis/requirements.txt
jupyter lab Data_analysis/pipeline.ipynb              # then: Run All
```

The notebook locates the repository root automatically, so it runs whether launched from
the repo root or from `Data_analysis/`. It executes top-to-bottom with no manual steps and
writes all outputs to `Data_analysis/outputs/`.

## Datasets and provenance

Everything *downstream* of the feature table is reproduced from scratch in the notebook
(joins, tree aggregation, every index and model). The remote-sensing layers were produced
upstream in Google Earth Engine / QGIS and are documented rather than regenerated (the GEE
script is in the notebook appendix; full provenance is in the notebook's Section 3).

| Dataset | Source | Used for |
|---|---|---|
| CBS *Kerncijfers wijken en buurten 2022* | Statistics Netherlands, via PDOK WFS | demographics, income, amenity distances |
| Surface temperature & NDVI | Landsat 8 C2-L2, summer-2023 median, Google Earth Engine | heat exposure, greenness |
| Water / road surface share | PDOK BGT `waterdeel` & `wegdeel` WFS (QGIS) | physical drivers |
| Climate-risk (heat) scores | Gemeente Amsterdam *Klimaatrisicokaarten* (Klimaateffectatlas) | official heat-risk index `HI_TOTAAL_S.0` |
| Street trees (≈322k) | Gemeente Amsterdam open data — *Bomen* | tree density, maturity, species richness |
| Cooling spots (koelteplekken) | official location list (`data/koeltekaart_data.csv`) | shelter-gap analysis + map |
| Buurt boundaries | CBS/PDOK *Wijk- en buurtkaart 2022* | spatial join, centroids, contiguity, mapping |

## Method summary

- **RQ1** — OLS with HC3-robust errors regressing official heat risk on physical drivers;
  VIF check; standardised coefficients; bootstrap CIs.
- **RQ2** — equal-weight standardised Social Vulnerability Index (PCA was tested and
  rejected: KMO ≈ 0.37); Spearman association and quantile regression of the
  vulnerability–access gap. Cooling access is proxied by distance to the nearest swimming
  pool, public library and large supermarket (the dominant real-world cool-refuge types).
- **RQ3** — HVI = 0.40·heat + 0.40·social + 0.20·(poor access); convergent validity,
  ±10 % weight-sensitivity, and bootstrapped boundaries. Tiers are assigned by **Fisher–Jenks
  natural breaks**, so class sizes reflect real gaps in the distribution rather than forced
  quintiles.
- **RQ4** — global Moran's *I* and local LISA clusters (Queen contiguity); an
  intervention-priority ranking and the "green-desert" / shelter-gap shortlists.
