# Rotation Strategies, Modeling & System Requirements

> Technical and functional criteria for the **Field Shift: Adapting Farms with NASA Data** challenge.

---

## 1. The Three-Strategy Comparison Requirement

The decision-support system **must evaluate and compare at least three distinct rotation strategies**, benchmarked against the grower's historical baseline:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        ROTATION STRATEGY MATRIX                        │
├──────────────────────────┬─────────────────────────┬───────────────────┤
│ 1. Current Baseline      │ 2. Adaptation Path A    │ 3. Adaptation Path│
│    (Historical Practice) │    (e.g. Water Savings) │    (e.g. Soil Gen)│
├──────────────────────────┼─────────────────────────┼───────────────────┤
│ • Typical local mono-    │ • Drought-hardy crops   │ • Legume N-fixing │
│   culture or 2-crop      │ • Short-cycle varieties │ • Deep taproots   │
│   annual cycle           │ • Deficit irrigation fit│ • Winter covers   │
│ • High input dependency  │ • Evaporative mitigation│ • Biomass addition│
└──────────────────────────┴─────────────────────────┴───────────────────┘
```

### Mandatory Reporting per Strategy
For every proposed rotation, the tool must provide:
1. **Rationale:** Transparent justification detailing why this crop sequence was suggested for the specific farm geography.
2. **Empirical Evidence:** Specific NASA Earth observations (e.g. historical SMAP soil moisture trends, NASA POWER growing degree days, ECOSTRESS evaporative stress index) backing the recommendation.
3. **Agronomic & Ecosystem Benefits:**
   * **Nitrogen Fixation & Nutrient Cycling:** Legume contributions reducing synthetic fertilizer requirements.
   * **Organic Matter & Soil Carbon:** Biomass incorporation enhancing soil microbial health.
   * **Water-Use Efficiency:** Reductions in total seasonal evapotranspiration and irrigation requirements.
   * **Erosion Reduction:** Living cover during critical wind/precipitation seasons.
   * **Pest & Disease Interruption:** Breaking host cycles for nematodes, fungi, and insect pests.
   * **Economic & Forage Value:** Grain yields, livestock grazing potential, or alternative cash revenue.
4. **Information Gaps & Assumptions:** Explicitly identify where data is interpolated, where local soil tests are needed, or where satellite resolution creates uncertainty.
5. **Agronomic Risks:** Critical failure modes requiring grower review (e.g., herbicide carryover, allelopathy, local seed supply, specialized harvester availability, or harvest timing conflicts).

---

## 2. Temporal Vulnerability & Stress Detection

The tool must analyze longitudinal and seasonal environmental patterns to reveal field vulnerabilities:

### A. Bare-Field & Fallow Detection
* **The Hazard:** Fields left without vegetative cover between seasons suffer accelerated topsoil loss from wind and heavy rain, organic carbon oxidation, and moisture loss.
* **NASA Detection:** Landsat/Sentinel-2 NDVI/EVI time series and bare soil reflectance indices pinpoint specific calendar weeks when the soil is exposed.
* **Actionable Countermeasure:** Suggest fast-establishing cover crops, winter grains, or mulch-producing residues to maintain continuous root structure.

### B. Thermal & Evaporative Stress Windows
* **The Hazard:** Extreme heatwaves colliding with flowering/tasseling stages cause sterility, kernel abortion, or crop failure.
* **NASA Detection:** ECOSTRESS Land Surface Temperature (LST) and NASA POWER daily maximum temperature curves reveal recurrence intervals for critical heat thresholds (e.g., > 35°C during reproductive windows).
* **Actionable Countermeasure:** Shift planting dates or select cultivars with shifted phenological milestones.

### C. Soil Moisture Anomalies & Frost Risk
* **The Hazard:** Early autumn frost killing unharvested crops or late spring frost damaging seedlings; severe root-zone drying during grain fill.
* **NASA Detection:** SMAP surface soil moisture anomalies and NASA POWER historical minimum temperatures delineate reliable frost-free windows and root-zone water deficits.

---

## 3. Modeling, SI & Data Fusion Considerations

### Multi-Resolution Data Harmonization
NASA Earth observations arrive across differing spatial and temporal grains:
* **Coarse Resolution:** SMAP (~9–36 km), NASA POWER (~0.5° grid), GRACE (~300 km).
* **Medium Resolution:** MODIS (250m–1km), GPM IMERG (0.1° / ~10 km).
* **High Resolution:** Landsat (30m), Copernicus Sentinel-2 (10–20m), SRTM DEM (30m).

**Recommended Fusion Pipeline:**
1. Resample and harmonize gridded climatic indicators onto a standardized farm/field analysis grid.
2. Intersect spatial terrain derivatives (slope, aspect, flow accumulation from SRTM) with soil polygons (SSURGO/WSS).
3. Align daily/monthly time series (temperature, precipitation, vapor pressure deficit) to crop phenological development stages.

### Explainable AI & Uncertainty Modeling
* Reject opaque "black box" machine learning models that generate ungrounded crop recommendations.
* Prioritize rule-based agronomic expert systems, multicriteria decision analysis (MCDA), or explainable statistical classifiers.
* Always communicate confidence intervals, noting when anomalous seasonal projections diverge from 30-year historical normals.

---

## 4. Farmer-Centered UI/UX Directives

To be genuinely useful in real-world agricultural operations, the tool must adhere to strict design ergonomics:

1. **Intuitive Visual Hierarchy:**
   * Translate complex satellite terminology into plain agricultural language (e.g., explain *"Evapotranspiration"* alongside *"Crop Water Demand (mm/season)"*, or *"NDVI"* alongside *"Canopy Vigor / Biomass"*).
   * Utilize clear color coding: green for soil health improvements, amber for moderate risks, blue for water conservation, red for high-risk hazards.

2. **Customizable Farmer Constraints:**
   * Allow growers to input or toggle their operational constraints:
     * Water availability / allocation quotas (e.g., acre-feet or mm of permitted irrigation).
     * Machinery and equipment limitations (e.g., no-till drill availability, specialized harvesting headers).
     * Livestock integration (demand for winter grazing or forage).
     * Market contracts and processing proximity.

3. **Scenario Sliders & "What-If" Analysis:**
   * Enable farmers to simulate climate scenarios (e.g., *"What if precipitation drops by 20% next spring?"* or *"What if heatwaves start 2 weeks earlier?"*).
   * Display dynamic re-scoring of rotation viability under each simulated scenario.
