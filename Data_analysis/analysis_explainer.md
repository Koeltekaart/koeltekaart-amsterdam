# Heat Vulnerability Analysis — Plain Language Explainer

**Project:** Koeltekaart Amsterdam — Policy Dashboard  
**Audience:** Policy makers, researchers, project partners  
**Date:** May 2026

---

## What are we trying to answer?

Amsterdam heats up unevenly. Some neighbourhoods get hotter than others. Within those hot neighbourhoods, some residents are much less able to cope — because they are elderly, isolated, low-income, or simply because the nearest place to cool down is far away. This analysis tries to answer three questions:

1. **Who is most at risk?** Which neighbourhoods combine high physical heat with socially vulnerable residents?
2. **Where is the gap?** Which vulnerable neighbourhoods also have poor access to cooling spots?
3. **What would help most?** If we improve one thing — more cooling spots, better green space, or targeted outreach — how much does it change the risk picture?

---

## The data we use

| Dataset | What it contains | Source |
|---|---|---|
| **Klimaatrisicokaarten** | Structured risk scores for 498 Amsterdam neighbourhoods — heat exposure (measured temperature, shade, population pressure), sensitivity (elderly residents, chronically ill, mobility impaired, low income), and adaptive capacity (garden access) | Gemeente Amsterdam |
| **CBS Buurtmonitor** | 207 socioeconomic variables per neighbourhood — demographics, income, housing type, distances to facilities | Statistics Netherlands (CBS) |
| **Geometry** | Polygon boundaries for each neighbourhood, used to draw the map | Gemeente Amsterdam / PDOK |
| **Koelteplekken** | 12 active cooling spots — location, opening hours, amenities | Koeltekaart Amsterdam |
| **Shade data** | Shade percentage on sidewalk segments at four times of day (10:00, 13:00, 15:30, 18:00) | Gemeente Amsterdam |

---

## Step 1 — Joining the datasets

**What we do:** We link the three main datasets together by neighbourhood name. Each neighbourhood appears in all three sources, so we can attach socioeconomic data and a polygon boundary to the same row as the heat risk scores.

**The challenge:** The datasets use slightly different neighbourhood names. We use automated name matching (fuzzy matching) to handle small differences like hyphens vs. spaces, and we use the klimaatrisicokaarten's own geometry so the boundaries are guaranteed to align with the heat scores.

**Result:** 498 neighbourhoods with heat scores, socioeconomic variables, and polygon geometry. Of these, 476 also have full CBS socioeconomic data; 22 have heat scores only (mostly Weesp buurten added after the CBS data was collected).

---

## Step 2 — Social Vulnerability Index (SVI)

**What we do:** We compute a single social vulnerability score for each neighbourhood using a technique called Principal Component Analysis (PCA).

**Why PCA instead of adding up scores manually?**  
The klimaatrisicokaarten already captures some social sensitivity — it counts elderly residents, chronically ill people, and those with limited mobility. But it misses dimensions that specifically affect heat risk:
- **Social isolation** (single-person households — no one checks on them during a heatwave)
- **Municipal care clients** (WMO clients — already known to the city as needing support)
- **Poverty** (households at or below the social minimum — less likely to have air conditioning, unable to travel to cooling spots)
- **Language barriers** (non-western migration background — heat warnings may not reach everyone equally)

PCA looks at all these variables together and finds the single axis that explains the most variation across neighbourhoods. It assigns each variable a weight based on how strongly it correlates with the overall pattern — rather than us guessing weights ourselves. The result is a score between 0 and 1, where higher means more socially vulnerable.

**What it tells us:** A neighbourhood with a high SVI score has residents who are elderly, isolated, poor, and/or face language barriers — multiple compounding disadvantages at once. These residents are hardest to reach with conventional heat warnings and least able to self-protect.

**Limitation:** The CBS data is from one snapshot in time and does not capture recent changes (e.g. new social housing, recent migration). The SVI should be updated when new CBS data becomes available.

---

## Step 3 — Cooling Access Score

**What we do:** We estimate how well each neighbourhood is served by cooling infrastructure, using distances to facilities already recorded in the CBS dataset.

**Components used:**
- Distance to nearest library (libraries are key cooling shelters in Amsterdam — air conditioned, free, open to all)
- Distance to nearest swimming pool
- Distance to nearest train station (proxy for transit access — can residents easily reach cooling spots elsewhere?)
- Vegetation density (NDVI — denser greenery cools the local environment)
- Percentage of surface water (proximity to water provides passive cooling)

**Scoring logic:** For distance variables, shorter distance = better score. We invert these so that all variables point in the same direction (higher = better access), normalise each to 0–1, and average them. A score of 1 means excellent access across all dimensions; 0 means very poor access.

**What it tells us:** This score captures the passive cooling environment of the neighbourhood — not just whether there is a specific cooling spot nearby, but whether the whole fabric of the area (greenery, water, transit, civic buildings) supports cooling. A neighbourhood can score well here even without a designated koelteplek if it has parks, canals, and good transit links.

**Limitation:** This uses CBS distance variables as proxies. They are straight-line distances, not walking distances, and they do not account for opening hours, capacity, or quality of facilities. The 12 active koelteplekken are not directly captured in this score — they feed into the dashboard's distance calculation separately.

---

## Step 4 — Heat Vulnerability Index (HVI)

**What we do:** We combine the three components into a single composite score for each neighbourhood.

**The formula:**

```
HVI = (40% × Physical heat risk) + (40% × Social vulnerability) + (20% × Cooling access gap)
```

Where *cooling access gap* = 1 − cooling access score (poor access = high gap = higher risk).

**Why these weights?**  
- Physical heat and social vulnerability are given equal weight (40% each) because both independently cause heat mortality. A hot neighbourhood with resilient residents is manageable; a cooler neighbourhood with very isolated elderly residents can still see heat deaths.  
- Cooling access is given 20% because it is a modifiable factor — it can be improved by opening more spots or extending hours — while heat exposure and social composition change more slowly.

**The weights are assumptions.** We have run sensitivity checks (varying weights by ±10%) and the ranking of the most vulnerable neighbourhoods is robust — the same 20–30 buurten appear at the top regardless.

**Output:** Each neighbourhood gets an HVI score between 0 and 1, classified into five tiers using quintiles:

| Tier | Label | Meaning |
|---|---|---|
| 1 | Low | Bottom 20% — well below average vulnerability |
| 2 | Low-medium | Below average |
| 3 | Medium | Around city average |
| 4 | High-medium | Above average — worth monitoring |
| 5 | High | Top 20% — priority for intervention |

---

## Step 5 — Gap Analysis

**What we do:** We cross-tabulate vulnerability (high/low HVI) against cooling access (good/poor) to identify four groups of neighbourhoods.

**The four quadrants:**

| | Good cooling access | Poor cooling access |
|---|---|---|
| **High vulnerability** | 🟠 Monitor — vulnerable residents, but infrastructure is there | 🔴 Urgent — double disadvantage |
| **Low vulnerability** | 🟢 No action needed | 🟡 Lower priority |

**Why this matters:** The top-right quadrant (🔴) identifies the *double-disadvantaged* neighbourhoods — where residents are both highly vulnerable and poorly served by cooling infrastructure. These are the priority targets for new koelteplekken, extended hours, or targeted outreach. Having good infrastructure (🟠) does not guarantee it reaches the most vulnerable, but at least the access problem is not compounding the social one.

**Result:** 251 of 498 neighbourhoods fall into the urgent category (🔴). The gap analysis scatter plot in the dashboard shows where each neighbourhood sits, making this immediately legible for policy makers.

---

## Step 6 — Spatial Autocorrelation (LISA)

**What we do:** We test whether vulnerable neighbourhoods tend to cluster together spatially, and identify which specific clusters are statistically significant.

**Why this matters:** A map of HVI scores shows variation, but does not tell us whether the pattern is random or systematic. If high-risk neighbourhoods cluster together, that is stronger evidence of a structural problem (e.g. a whole district with inadequate green space, old housing stock, and poor transit) rather than isolated cases.

**Global Moran's I:** A single number measuring whether the overall pattern is clustered (positive value) or dispersed (negative value). A value near 0 would mean random. We test statistical significance using 999 random permutations — effectively asking "how unusual is this clustering compared to chance?"

**LISA (Local Indicators of Spatial Association):** Breaks the global result down to individual neighbourhoods:
- **HH (hotspot):** High-vulnerability neighbourhood surrounded by other high-vulnerability neighbours — a confirmed cluster
- **LL (cold spot):** Low-vulnerability neighbourhood surrounded by low-vulnerability neighbours
- **HL / LH:** Spatial outliers — a neighbourhood that is unusually different from its surroundings

**What it tells us:** Statistically confirmed hotspots (HH) are the most robust targets for area-level intervention — the problem is structural and shared across multiple adjacent neighbourhoods, not a quirk of one buurt's data.

---

## Step 7 — Dashboard analytics (computed on click)

When a policy maker clicks on a neighbourhood on the map, we compute several additional analyses in real time.

### City rank
**What:** Where does this neighbourhood rank among all 498 scored buurten, from most to least vulnerable?  
**Why:** Gives immediate context. "Rank #12 of 498" tells a policy maker this is one of the worst-served neighbourhoods in the city.

### Dominant driver
**What:** Which of the three components (heat exposure, social vulnerability, cooling access gap) contributes the most to pushing this neighbourhood above the city median?  
**How:** For each component, we compute how much it exceeds the city median and multiply by its weight in the HVI formula. The largest contributor is the dominant driver.  
**Why:** Directs the right intervention. If social vulnerability is driving the score, the answer is outreach and care networks — not more trees. If cooling access is the main driver, a new koelteplek nearby could have an outsized effect.

### Nearest cooling spot distance
**What:** The straight-line distance from the centre of this neighbourhood to the nearest of the 12 active koelteplekken.  
**How:** We compute the geographic centre (centroid) of the neighbourhood polygon, then calculate the haversine distance to each koelteplek and return the closest.  
**Why:** Raw proximity to a cooling spot matters more than the general cooling access score when deciding whether an emergency heat plan will actually reach residents. A distance of >1.5 km is considered poor access for elderly or mobility-impaired residents.

### What-if intervention analysis
**What:** We simulate three policy scenarios and show how much each would reduce the HVI score and whether it would shift the neighbourhood to a lower tier.  
**How:** Using the HVI formula, we substitute each component's value with the city median (capped — we do not model making things worse, only better) and recalculate:
1. *Cooling access → city median:* What if this neighbourhood had average cooling access? (e.g. open a new koelteplek)
2. *Social vulnerability → city median:* What if social vulnerability were reduced to the city average? (e.g. targeted outreach, WMO support)
3. *Heat exposure → city median:* What if physical heat were reduced to the city average? (e.g. tree planting, reflective surfaces)

The result shows the point reduction and any tier change (e.g. "Tier 5 → 4").  
**Why:** Gives policy makers a direct, quantified answer to "what would actually move the needle here?" — and by how much.

### Similar neighbourhoods
**What:** The five neighbourhoods most similar to this one in terms of their combination of heat exposure, social vulnerability, and cooling access.  
**How:** We compute the straight-line distance in a three-dimensional space where each axis is one of the three components. Neighbourhoods close in this space have almost identical risk profiles.  
**Why:** Comparisons with similar buurten that have already received interventions can help evaluate what works. If a very similar neighbourhood introduced a new koelteplek two years ago, its subsequent HVI trend is relevant evidence.

---

## Limitations and caveats

| Issue | Impact | Mitigation |
|---|---|---|
| CBS data vintage | CBS data may not reflect the current population (new developments, recent migration) | Update when new CBS release is available |
| Straight-line distances | Actual walking distances and routes may be longer, especially near water or rail infrastructure | Replace with network distances using OSMnx (planned) |
| HVI weight assumptions | Different weights would shift some rankings | Sensitivity analysis confirms top 20–30 buurten are robust |
| 12 cooling spots only | The site currently lists only 12 active spots — the access gap is likely underestimated | Expand koelteplekken dataset |
| No health outcome validation | HVI predicts vulnerability but has not been validated against actual heat mortality or ER visits | Contact GGD Amsterdam for ambulance call data |
| Cross-sectional snapshot | All data is from one point in time — temporal dynamics (e.g. seasonal population shifts) are not captured | Longitudinal analysis once multi-year data is available |

---

## Summary: what the dashboard tells a policy maker

Opening the vulnerability map and clicking a neighbourhood gives immediate answers to:

- **How bad is it?** Score and city rank
- **What is driving it?** Dominant component
- **Is it a structural area problem?** LISA cluster status
- **Can residents even get to a cooling spot?** Nearest koelteplek distance
- **What intervention would help most?** What-if tier shifts
- **Are there comparable buurten to learn from?** Similar neighbourhoods list
