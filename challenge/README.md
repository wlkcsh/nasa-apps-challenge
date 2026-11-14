# NASA Space Apps Challenge: Field Shift — Adapting Farms with NASA Data

> Official challenge documentation and architectural reference for the 2026 NASA Space Apps Challenge project.

---

## 📌 Challenge Quick Reference

| Attribute | Details |
| :--- | :--- |
| **Official Title** | **Field Shift: Adapting Farms with NASA Data** |
| **Challenge URL** | [spaceappschallenge.org/.../adapting-farms-with-nasa-data/](https://www.spaceappschallenge.org/2026/challenges/adapting-farms-with-nasa-data/) |
| **Difficulty Level** | Advanced / Intermediate |
| **Disciplines** | Earth Science, Software Engineering, Arts & Multimedia |
| **Funder / Org** | NASA Science Mission Directorate (SMD) |
| **Target Goal** | Create an explainable decision-support tool fusing NASA Earth observations with local agricultural data to guide climate-adaptive, soil-regenerative crop rotations. |

---

## 📂 Documentation Structure

This repository includes a complete breakdown of the challenge specifications, agronomic objectives, and data resources:

1. [**`01-background-and-objectives.md`**](./01-background-and-objectives.md)
   * The global agricultural crisis: shifting weather patterns, water scarcity, and soil degradation.
   * Multigenerational farming inspiration (Denise Moyle's high-desert alfalfa fields).
   * Core problem statement and the *"Support, Never Replace"* farmer philosophy.

2. [**`02-rotation-strategies-and-requirements.md`**](./02-rotation-strategies-and-requirements.md)
   * **Mandatory 3-Strategy Comparison:** Baseline rotation vs. 2+ adaptive alternatives.
   * Multi-dimensional evaluation: rationale, satellite evidence, benefits, data gaps, and agronomic risks.
   * Detecting bare-field vulnerabilities, thermal spikes, and soil moisture anomalies.
   * Farmer-centered UX: customizable constraints, scenario sliders, and non-technical metrics.

3. [**`03-nasa-and-partner-datasets.md`**](./03-nasa-and-partner-datasets.md)
   * **Core NASA Missions:** SMAP, GPM/IMERG, Landsat, MODIS/VIIRS, NASA POWER, ECOSTRESS, SRTM, GRACE/GRACE-FO, GEDI, and GLDAS.
   * **International Partner Assets:** ESA Copernicus Sentinel-2 (Red-Edge bands), ECMWF ERA5 reanalysis.
   * **In-situ & Soil Datasets:** USDA SSURGO/WSS, Cropland Data Layer (CDL), PRISM, OpenET, USDA AMS Market News, and FAO GAEZ.

---

## 🛰️ How This Codebase (`field-shift-uz`) Addresses The Challenge

Our implementation directly solves the core requirements outlined in this challenge:

* **Backend (`/backend`):**
  * **NASA POWER Integration (`backend/services/nasa_power.py`):** Live fetching and caching of solar irradiance, temperatures, relative humidity, and precipitation with robust fallback presets.
  * **Multi-Strategy Rotation Engine (`backend/services/rotation_engine.py`):** Evaluates multi-year rotation pathways, calculates water savings, models nitrogen fixation and soil organic matter improvements, and flags agronomic risks.
* **Frontend (`/frontend`):**
  * **Interactive Farm Map (`FarmMap.tsx`):** Field boundary polygon selection and spatial coordinate targeting.
  * **Climate & Stress Visualizer (`ClimateCharts.tsx`):** Historical and seasonal trends highlighting bare-ground periods, thermal stress thresholds, and moisture deficits.
  * **Scenario Comparison Dashboard (`RotationTimeline.tsx`):** Side-by-side comparison of baseline practices against regenerative and drought-hardy rotation sequences.
