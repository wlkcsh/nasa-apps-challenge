# NASA & Partner Datasets Reference Catalog

> Official inventory of all 24 curated datasets, Earth observation portals, and space agency resources designated in the **[Resources Tab](https://www.spaceappschallenge.org/2026/challenges/adapting-farms-with-nasa-data/?tab=resources)** for the **Field Shift: Adapting Farms with NASA Data** challenge.

---

## 1. Primary NASA Earth Observation Missions

### 1. [Soil Moisture Active Passive (SMAP)](https://www.earthdata.nasa.gov/data/platforms/space-based-platforms/smap)
* **Agency:** NASA
* **Description:** SMAP provides global measurements of surface soil moisture and freeze/thaw state, collected every 2–3 days.
* **Agronomic Value:** Identifies drought stress, water availability, infiltration potential, and early crop-stress signals before visible wilting occurs. Essential for evaluating rotation crops that improve water efficiency, soil structure, or drought resilience.

### 2. [Global Precipitation Measurement (GPM) & IMERG](https://gpm.nasa.gov/data)
* **Agency:** NASA / JAXA
* **Description:** Global precipitation rate and accumulation estimates from the GPM constellation and its IMERG product. *(Worldview IMERG layers can be downloaded directly as high-resolution imagery).*
* **Agronomic Value:** Evaluates rainfall reliability, extreme storm frequency, soil erosion hazard, and long-term trends in field moisture across multi-year growing seasons.

### 3. [Landsat](https://earthexplorer.usgs.gov/) & [MODIS](https://lpdaac.usgs.gov/products/) / [VIIRS](https://search.earthdata.nasa.gov/search?q=VIIRS)
* **Agency:** NASA / USGS / NOAA
* **Description:** Corrected surface reflectance, Normalized Difference Vegetation Index (NDVI), and vegetation condition indices.
  * **Landsat:** 30-meter high spatial resolution (16-day cadence).
  * **MODIS & VIIRS:** 250m–1000m daily revisit frequency.
* **Agronomic Value:** Maps crop canopy vigor, monitors seasonal phenological transitions, detects high-stress periods, and maps bare-soil duration between rotations.

### 4. [NASA POWER: Agroclimatology & Meteorological Data](https://power.larc.nasa.gov/)
* **Agency:** NASA Langley Research Center
* **Description:** Readily accessible solar irradiance, temperature, relative humidity, precipitation, and climatology datasets tailored for agriculture on a global 0.5° grid.
* **Agronomic Value:** Directly estimates crop water consumption ($ET_0$), growing season thermal windows (Growing Degree Days - GDD), and frost risks for candidate crops.

### 5. [Shuttle Radar Topography Mission (SRTM): Elevation & Terrain Models](https://www.earthdata.nasa.gov/data/instruments/srtm)
* **Agency:** NASA / NGA / DLR
* **Description:** Global high-resolution digital elevation models (30m).
* **Agronomic Value:** Analyzes slope, runoff pathways, erosion susceptibility, water pooling, and terrain-driven stress. Helps determine where deep-rooting perennials or cover crops stabilize vulnerable slopes.

### 6. [ECOSTRESS (Land Surface Temperature & Evapotranspiration)](https://ecostress.jpl.nasa.gov/data)
* **Agency:** NASA JPL (International Space Station)
* **Description:** High spatial resolution (~70m) measurements of Land Surface Temperature (LST) and Evapotranspiration (ET).
* **Agronomic Value:** Detects hotspots of plant thermal stress, heat exposure, shallow-root vulnerability, and crop water demand. Pinpoints field-level microclimate variations.

### 7. [NLDAS & GLDAS: Land Data Assimilation Systems](https://www.earthdata.nasa.gov/)
* **Agency:** NASA GSFC / NOAA
* **Description:** Blends satellite and ground meteorological observations to generate continuous gridded datasets of temperature, precipitation, soil moisture, evapotranspiration proxies, and radiation at sub-daily resolution.
* **Agronomic Value:** Unbroken multi-decade time-series for baseline calibration and studying drought onset.

### 8. [Global Ecosystem Dynamics Investigation (GEDI)](https://gedi.umd.edu/data)
* **Agency:** NASA / University of Maryland
* **Description:** High-resolution laser-based lidar measurements of vertical vegetation structure, canopy height, leaf area index, and above-ground biomass (Level-4 products).
* **Agronomic Value:** Measures biomass density and canopy stress around farm boundaries, windbreaks, and agroforestry plots.

---

## 2. Space Agency Partner Resources

### 9. [Copernicus Sentinel-2](https://dataspace.copernicus.eu)
* **Agency:** European Space Agency (ESA)
* **Description:** Freely accessible 10–20m multispectral imagery with a 5-day revisit cycle. Features dedicated **Red-Edge bands** (B5, B6, B7) alongside NIR and SWIR.
* **Agronomic Value:** Fine-scale field parcel mapping, chlorophyll absorption tracking, subtle crop stress detection, and high-frequency bare-soil verification.

### 10. [ERA5: ECMWF Reanalysis](https://cds.climate.copernicus.eu/datasets/reanalysis-era5-single-levels?tab=overview)
* **Agency:** ECMWF / Copernicus Climate Change Service
* **Description:** Hourly global atmospheric and land reanalysis at ~31 km resolution from 1940 to present.
* **Agronomic Value:** Fills observation voids in regions with sparse ground weather stations, providing continuous temporal features.

---

## 3. Ground-Truth & Agricultural Decision Datasets

### 11. [USDA Ag Data Commons](https://www.nal.usda.gov/services/agdatacommons)
* **Agency:** USDA National Agricultural Library
* **Description:** Open-access research datasets covering soils, crops, climate, land management, phenology, water quality, and ecological conditions.
* **Agronomic Value:** Complements satellite telemetry with field-level agricultural research, crop parameter trials, and real-world rotation observations.

### 12. [Web Soil Survey (WSS)](https://websoilsurvey.nrcs.usda.gov/app/)
* **Agency:** USDA Natural Resources Conservation Service (NRCS)
* **Description:** Official U.S. soil inventory maps, physical/chemical soil properties, drainage ratings, and land-use suitability classifications.
* **Agronomic Value:** Field-specific baseline on soil texture, organic matter %, and compaction risks to parameterize rotation algorithms.

### 13. [Cropland Data Layer (CDL): CropScape](https://nassgeodata.gmu.edu/CropScape/)
* **Agency:** USDA NASS / George Mason University
* **Description:** Annual 30-meter geo-referenced cropland classification maps for the United States.
* **Agronomic Value:** Tracks historical crop rotations across parcels, quantifies historical corn/soy/wheat/alfalfa acreage, and provides labeled ground truth.

### 14. [PRISM Climate Data](https://prism.oregonstate.edu)
* **Institution:** Oregon State University
* **Description:** High-resolution climate datasets incorporating topographic elevation effects (daily, monthly, and 30-year climate normals for temperature, precipitation, and freeze dates).
* **Agronomic Value:** Validates satellite climate indicators against topographically corrected ground normals.

### 15. [USDA NRCS SSURGO / STATSGO2 Soil Data](https://www.nrcs.usda.gov/resources/data-and-reports/soils)
* **Agency:** USDA NRCS
* **Description:** High-resolution field-scale (SSURGO) and regional-scale (STATSGO2) soil attributes: available water capacity, restrictive layers, and hydrologic soil groups.
* **Agronomic Value:** Enables location-specific modeling of soil health gains and moisture retention under alternative rotations.

### 16. [National Agriculture Imagery Program (NAIP)](https://naip-usdaonline.hub.arcgis.com/)
* **Agency:** USDA FSA
* **Description:** High-resolution (typically 1-meter) aerial photography captured during peak growing seasons.
* **Agronomic Value:** Pinpoints exact field boundaries, drainage ditches, bare soil periods, and conservation plantings.

### 17. [USGS National Land Cover Database (NLCD)](https://www.usgs.gov/centers/eros/science/national-land-cover-database)
* **Agency:** USGS
* **Description:** Multi-decade 30-meter land cover classifications across the US.
* **Agronomic Value:** Distinguishes cultivated cropland from pasture, forest, shrubland, and wetlands.

### 18. [FAO Global Agro-Ecological Zones (GAEZ v4)](https://gaez.fao.org)
* **Agency:** Food and Agriculture Organization (FAO) / IIASA
* **Description:** Global agro-climatic suitability layers, soil constraint indices, and yield potential models for dozens of major crops.
* **Agronomic Value:** Extends crop suitability modeling to international agricultural basins outside North America.

### 19. [CoCoRaHS: Community Rain/Snow Observations](https://www.cocorahs.org/Maps)
* **Organization:** Community Collaborative Rain, Hail & Snow Network
* **Description:** High-density, crowd-sourced daily precipitation observations across North America.
* **Agronomic Value:** Ground-truth validation for satellite precipitation estimates (IMERG) and hyper-local storm tracking.

### 20. [USGS National Water Information Systems (NWIS)](https://waterdata.usgs.gov/nwis)
* **Agency:** USGS
* **Description:** Longitudinal in-situ streamflow gages, river stages, and groundwater monitoring wells.
* **Agronomic Value:** Assesses surface water availability for irrigation districts and tracks groundwater table levels.

### 21. [USDA AMS Market News](https://www.ams.usda.gov/market-news)
* **Agency:** USDA Agricultural Marketing Service
* **Description:** Daily and historical commodity cash market prices, regional demand trends, and movement reports.
* **Agronomic Value:** Economic feasibility filter ensuring recommended alternative rotation crops have viable local buyers and favorable margins.

### 22. [USDA NASS QuickStats](https://quickstats.nass.usda.gov)
* **Agency:** USDA National Agricultural Statistics Service
* **Description:** Comprehensive database of county-level and state-level historical agricultural yields, production costs, and planted acreage.
* **Agronomic Value:** Calibrates expected crop yields against historical regional benchmarks.

### 23. [OpenET: Evapotranspiration for Water Management](https://openetdata.org)
* **Partnership:** NASA, USGS, Desert Research Institute, Environmental Defense Fund
* **Description:** Field-scale (30m) actual evapotranspiration ($ET_a$) calculations across western U.S. agricultural regions.
* **Agronomic Value:** Measures actual water depletion per crop, validating water-savings projections of alternative rotation strategies.

### 24. [USFS LANDFIRE: Vegetation & Fuel Layers](https://www.landfire.gov)
* **Agency:** US Forest Service / USGS
* **Description:** Comprehensive spatial layers describing existing vegetation type, canopy cover, and ecological condition.
* **Agronomic Value:** Analyzes surrounding microclimates, riparian corridors, and perennial landscape interfaces.
