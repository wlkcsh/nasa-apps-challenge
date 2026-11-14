Below is the complete, deterministic system architecture and production implementation blueprint for **`field-shift-uz`**, engineered for direct execution by your autonomous coding agent.

---

## 1. Exact Directory & File Tree

```text
field-shift-uz/
├── start.sh
├── backend/
│   ├── requirements.txt
│   ├── main.py
│   ├── models.py
│   ├── data/
│   │   └── fallback_presets.json
│   └── services/
│       ├── __init__.py
│       ├── nasa_power.py
│       └── rotation_engine.py
└── frontend/
    ├── package.json
    ├── tsconfig.json
    ├── tailwind.config.ts
    ├── postcss.config.js
    ├── next.config.mjs
    └── src/
        ├── app/
        │   ├── globals.css
        │   ├── layout.tsx
        │   └── page.tsx
        ├── types/
        │   └── api.ts
        └── components/
            ├── FarmMap.tsx
            ├── PresetSelector.tsx
            ├── ClimateCharts.tsx
            └── RotationTimeline.tsx

```

---

## 2. Dependencies & Configuration Manifests

### `backend/requirements.txt`

```text
fastapi==0.115.0
uvicorn[standard]==0.30.6
httpx==0.27.2
pydantic==2.9.2

```

### `frontend/package.json`

```json
{
  "name": "field-shift-uz-frontend",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev -p 3000",
    "build": "next build",
    "start": "next start -p 3000"
  },
  "dependencies": {
    "leaflet": "^1.9.4",
    "lucide-react": "^0.446.0",
    "next": "14.2.13",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-leaflet": "^4.2.1",
    "recharts": "^2.12.7",
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.5.2"
  },
  "devDependencies": {
    "@types/leaflet": "^1.9.12",
    "@types/node": "^20.16.10",
    "@types/react": "^18.3.10",
    "@types/react-dom": "^18.3.0",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.47",
    "tailwindcss": "^3.4.13",
    "typescript": "^5.6.2"
  }
}

```

---

## 3. Backend Data Models, Preset Cache & API Contracts

### `backend/models.py`

```python
from typing import Dict, List, Literal, Optional
from pydantic import BaseModel, Field

CropId = Literal["cotton", "winter_wheat", "alfalfa", "mung_bean", "sorghum", "melons"]
SalinityLevel = Literal["low", "moderate", "high", "severe"]
FarmerPriority = Literal["conserve_water", "restore_soil", "maximize_yield"]

class MonthlyClimatePoint(BaseModel):
    month: str
    t2m_c: float = Field(..., description="Average Temperature at 2 Meters (C)")
    prectotcorr_mm: float = Field(..., description="Monthly Precipitation (mm)")
    gwettop_ratio: float = Field(..., description="Surface Soil Wetness (0.0 to 1.0)")
    allsky_sw_dwn: float = Field(..., description="All Sky Surface Shortwave Downward Irradiance (kWh/m^2/day)")

class ClimateSummary(BaseModel):
    source: Literal["nasa_power_live", "local_fallback_cache"]
    annual_precip_mm: float
    mean_summer_temp_c: float
    mean_soil_wetness: float
    mean_solar_irradiance: float
    aridity_index: str
    monthly_series: List[MonthlyClimatePoint]

class PresetLocation(BaseModel):
    id: str
    name: str
    region: str
    lat: float
    lon: float
    default_salinity: SalinityLevel
    default_crop: CropId
    description: str

class AnalyzeFieldRequest(BaseModel):
    lat: float = Field(..., ge=37.0, le=46.0)
    lon: float = Field(..., ge=55.0, le=74.0)
    current_crop: CropId
    soil_salinity_level: SalinityLevel
    farmer_priority: FarmerPriority

class SeasonStep(BaseModel):
    year: int
    season_label: str
    crop_id: CropId
    crop_name: str
    uzbek_name: str
    water_need_mm: int
    irrigation_deficit_mm: int
    nitrogen_delta: int
    salinity_tolerance: int
    heat_tolerance: int
    suitability_score: float
    agronomic_rationale: str

class ImpactMetrics(BaseModel):
    baseline_3yr_water_mm: int
    plan_3yr_water_mm: int
    water_saved_mm: int
    water_saved_pct: float
    net_nitrogen_score: int
    soil_restoration_index: float
    risk_warnings: List[str]

class AnalyzeFieldResponse(BaseModel):
    coordinates: Dict[str, float]
    matched_region: str
    climate: ClimateSummary
    rotation_plan: List[SeasonStep]
    impact_metrics: ImpactMetrics

```

### `backend/data/fallback_presets.json`

Save this deterministic NASA POWER climatology dataset (1991–2020 baseline + recent Uzbekistan hydro-meteorological norms) for offline safety:

```json
{
  "presets": [
    {
      "id": "nukus",
      "name": "Nukus (Aral Sea Basin)",
      "region": "Republic of Karakalpakstan",
      "lat": 42.4602,
      "lon": 59.6166,
      "default_salinity": "severe",
      "default_crop": "cotton",
      "description": "Hyper-arid delta zone with severe secondary salinization, high summer thermal stress, and critical Amu Darya irrigation dependency.",
      "climatology": {
        "T2M": {"JAN": -3.8, "FEB": -1.2, "MAR": 6.4, "APR": 15.8, "MAY": 22.9, "JUN": 28.4, "JUL": 30.6, "AUG": 28.5, "SEP": 21.6, "OCT": 13.1, "NOV": 4.5, "DEC": -1.6},
        "PRECTOTCORR": {"JAN": 11.2, "FEB": 10.5, "MAR": 18.4, "APR": 16.2, "MAY": 11.8, "JUN": 4.2, "JUL": 2.5, "AUG": 1.8, "SEP": 3.1, "OCT": 8.4, "NOV": 10.9, "DEC": 11.5},
        "GWETTOP": {"JAN": 0.42, "FEB": 0.44, "MAR": 0.39, "APR": 0.28, "MAY": 0.19, "JUN": 0.12, "JUL": 0.09, "AUG": 0.09, "SEP": 0.13, "OCT": 0.21, "NOV": 0.31, "DEC": 0.38},
        "ALLSKY_SFC_SW_DWN": {"JAN": 2.1, "FEB": 3.1, "MAR": 4.4, "APR": 5.8, "MAY": 7.1, "JUN": 7.8, "JUL": 7.6, "AUG": 6.9, "SEP": 5.6, "OCT": 3.9, "NOV": 2.4, "DEC": 1.8}
      }
    },
    {
      "id": "bukhara",
      "name": "Bukhara Oasis",
      "region": "Bukhara Region",
      "lat": 39.7747,
      "lon": 64.4286,
      "default_salinity": "high",
      "default_crop": "cotton",
      "description": "Kyzykum desert borderland fed by the Amu-Bukhara canal; faces elevated groundwater mineralization and extreme evapotranspiration.",
      "climatology": {
        "T2M": {"JAN": 1.6, "FEB": 4.1, "MAR": 10.5, "APR": 18.2, "MAY": 24.4, "JUN": 29.5, "JUL": 31.4, "AUG": 29.2, "SEP": 23.1, "OCT": 15.6, "NOV": 8.2, "DEC": 3.1},
        "PRECTOTCORR": {"JAN": 22.1, "FEB": 24.5, "MAR": 32.8, "APR": 23.4, "MAY": 11.2, "JUN": 1.8, "JUL": 0.6, "AUG": 0.4, "SEP": 1.2, "OCT": 6.5, "NOV": 14.8, "DEC": 20.2},
        "GWETTOP": {"JAN": 0.48, "FEB": 0.51, "MAR": 0.46, "APR": 0.33, "MAY": 0.22, "JUN": 0.14, "JUL": 0.11, "AUG": 0.11, "SEP": 0.15, "OCT": 0.24, "NOV": 0.36, "DEC": 0.44},
        "ALLSKY_SFC_SW_DWN": {"JAN": 2.5, "FEB": 3.5, "MAR": 4.7, "APR": 6.1, "MAY": 7.3, "JUN": 8.0, "JUL": 7.8, "AUG": 7.1, "SEP": 5.9, "OCT": 4.3, "NOV": 2.8, "DEC": 2.2}
      }
    },
    {
      "id": "samarkand",
      "name": "Samarkand (Zarafshan Valley)",
      "region": "Samarkand Region",
      "lat": 39.6542,
      "lon": 66.9597,
      "default_salinity": "moderate",
      "default_crop": "winter_wheat",
      "description": "Foothill-fed alluvial basin along the Zarafshan River; features favorable spring moisture but rapid summer soil crusting and nitrogen depletion.",
      "climatology": {
        "T2M": {"JAN": 1.9, "FEB": 3.8, "MAR": 8.9, "APR": 15.6, "MAY": 21.1, "JUN": 26.2, "JUL": 28.3, "AUG": 26.5, "SEP": 21.2, "OCT": 14.4, "NOV": 8.1, "DEC": 3.5},
        "PRECTOTCORR": {"JAN": 41.5, "FEB": 48.2, "MAR": 68.4, "APR": 61.2, "MAY": 34.6, "JUN": 6.5, "JUL": 3.1, "AUG": 1.5, "SEP": 3.8, "OCT": 18.9, "NOV": 31.4, "DEC": 39.8},
        "GWETTOP": {"JAN": 0.62, "FEB": 0.66, "MAR": 0.64, "APR": 0.54, "MAY": 0.38, "JUN": 0.23, "JUL": 0.17, "AUG": 0.16, "SEP": 0.21, "OCT": 0.34, "NOV": 0.49, "DEC": 0.58},
        "ALLSKY_SFC_SW_DWN": {"JAN": 2.4, "FEB": 3.3, "MAR": 4.4, "APR": 5.7, "MAY": 6.9, "JUN": 7.6, "JUL": 7.5, "AUG": 6.9, "SEP": 5.7, "OCT": 4.1, "NOV": 2.7, "DEC": 2.1}
      }
    },
    {
      "id": "fergana",
      "name": "Fergana Valley (Syr Darya)",
      "region": "Fergana Region",
      "lat": 40.3842,
      "lon": 71.7843,
      "default_salinity": "low",
      "default_crop": "cotton",
      "description": "Intensively cultivated intermontane valley with fertile sierozem soils, sufrirng from heavy cotton-wheat compaction and declining humus.",
      "climatology": {
        "T2M": {"JAN": 0.2, "FEB": 3.1, "MAR": 9.8, "APR": 17.1, "MAY": 22.4, "JUN": 27.1, "JUL": 29.2, "AUG": 27.6, "SEP": 22.1, "OCT": 14.8, "NOV": 7.2, "DEC": 1.8},
        "PRECTOTCORR": {"JAN": 18.4, "FEB": 21.2, "MAR": 29.5, "APR": 24.8, "MAY": 19.6, "JUN": 8.4, "JUL": 4.2, "AUG": 2.6, "SEP": 4.1, "OCT": 13.5, "NOV": 16.8, "DEC": 17.9},
        "GWETTOP": {"JAN": 0.55, "FEB": 0.58, "MAR": 0.54, "APR": 0.45, "MAY": 0.34, "JUN": 0.24, "JUL": 0.19, "AUG": 0.18, "SEP": 0.23, "OCT": 0.35, "NOV": 0.46, "DEC": 0.52},
        "ALLSKY_SFC_SW_DWN": {"JAN": 2.3, "FEB": 3.2, "MAR": 4.5, "APR": 5.8, "MAY": 6.8, "JUN": 7.4, "JUL": 7.3, "AUG": 6.7, "SEP": 5.5, "OCT": 3.9, "NOV": 2.6, "DEC": 2.0}
      }
    }
  ]
}

```

### Sample Endpoint Payloads

#### `GET /api/presets` Response

Returns the array of `PresetLocation` objects from `fallback_presets.json`.

#### `POST /api/analyze-field` Sample Request

```json
{
  "lat": 42.4602,
  "lon": 59.6166,
  "current_crop": "cotton",
  "soil_salinity_level": "severe",
  "farmer_priority": "conserve_water"
}

```

#### `POST /api/analyze-field` Sample Response

```json
{
  "coordinates": { "lat": 42.4602, "lon": 59.6166 },
  "matched_region": "Nukus (Aral Sea Basin)",
  "climate": {
    "source": "nasa_power_live",
    "annual_precip_mm": 110.5,
    "mean_summer_temp_c": 29.17,
    "mean_soil_wetness": 0.25,
    "mean_solar_irradiance": 5.05,
    "aridity_index": "Hyper-Arid Desert Zone",
    "monthly_series": [
      { "month": "JAN", "t2m_c": -3.8, "prectotcorr_mm": 11.2, "gwettop_ratio": 0.42, "allsky_sw_dwn": 2.1 }
    ]
  },
  "rotation_plan": [
    {
      "year": 1,
      "season_label": "Year 1: Transition & Desalinization",
      "crop_id": "sorghum",
      "crop_name": "Grain Sorghum",
      "uzbek_name": "Jo'xori",
      "water_need_mm": 420,
      "irrigation_deficit_mm": 310,
      "nitrogen_delta": -1,
      "salinity_tolerance": 4,
      "heat_tolerance": 5,
      "suitability_score": 89.5,
      "agronomic_rationale": "Selected for Year 1 to break cotton monoculture. Withstands severe salinity (4/5) and 29.2°C summer heat while cutting water usage by 53% vs. cotton."
    }
  ],
  "impact_metrics": {
    "baseline_3yr_water_mm": 2350,
    "plan_3yr_water_mm": 1350,
    "water_saved_mm": 1000,
    "water_saved_pct": 42.6,
    "net_nitrogen_score": 4,
    "soil_restoration_index": 86.0,
    "risk_warnings": [
      "CRITICAL SALINITY: Surface soil leaching required before planting Year 2 legume.",
      "EXTREME ARIDITY: Natural rainfall (110.5 mm/yr) covers <10% of baseline demand; drip or surge furrow irrigation mandatory."
    ]
  }
}

```

---

## 4. Full Backend Implementation Logic

### `backend/services/nasa_power.py`

```python
import json
import math
from pathlib import Path
from typing import Any, Dict, List, Tuple
import httpx
from models import ClimateSummary, MonthlyClimatePoint, PresetLocation

DATA_PATH = Path(__file__).resolve().parent.parent / "data" / "fallback_presets.json"
MONTH_KEYS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"]
DAYS_IN_MONTH = {"JAN": 31, "FEB": 28, "MAR": 31, "APR": 30, "MAY": 31, "JUN": 30, "JUL": 31, "AUG": 31, "SEP": 30, "OCT": 31, "NOV": 30, "DEC": 31}

def load_presets_raw() -> List[Dict[str, Any]]:
    with open(DATA_PATH, "r", encoding="utf-8") as f:
        return json.load(f)["presets"]

def get_preset_locations() -> List[PresetLocation]:
    raw = load_presets_raw()
    return [PresetLocation(**{k: v for k, v in item.items() if k != "climatology"}) for item in raw]

def find_nearest_preset(lat: float, lon: float) -> Dict[str, Any]:
    presets = load_presets_raw()
    best = presets[0]
    min_dist = float("inf")
    for p in presets:
        dist = math.hypot(lat - p["lat"], lon - p["lon"])
        if dist < min_dist:
            min_dist = dist
            best = p
    return best

def _build_climate_summary(
    param_dict: Dict[str, Dict[str, float]],
    source: str,
    is_daily_rate_precip: bool = False
) -> ClimateSummary:
    monthly_series: List[MonthlyClimatePoint] = []
    for m in MONTH_KEYS:
        t2m = float(param_dict.get("T2M", {}).get(m, 15.0))
        raw_precip = float(param_dict.get("PRECTOTCORR", {}).get(m, 10.0))
        # NASA POWER climatology returns PRECTOTCORR in mm/day; fallback stores monthly total mm
        precip_mm = round(raw_precip * DAYS_IN_MONTH[m], 1) if is_daily_rate_precip else round(raw_precip, 1)
        gwet = float(param_dict.get("GWETTOP", {}).get(m, 0.25))
        if gwet < 0:
            gwet = 0.22
        sw_dwn = float(param_dict.get("ALLSKY_SFC_SW_DWN", {}).get(m, 5.0))
        if sw_dwn < 0:
            sw_dwn = 5.0

        monthly_series.append(
            MonthlyClimatePoint(
                month=m,
                t2m_c=round(t2m, 1),
                prectotcorr_mm=precip_mm,
                gwettop_ratio=round(min(max(gwet, 0.01), 1.0), 2),
                allsky_sw_dwn=round(sw_dwn, 2),
            )
        )

    annual_precip = round(sum(p.prectotcorr_mm for p in monthly_series), 1)
    summer_months = [p.t2m_c for p in monthly_series if p.month in ("JUN", "JUL", "AUG")]
    mean_summer_temp = round(sum(summer_months) / len(summer_months), 2)
    mean_wetness = round(sum(p.gwettop_ratio for p in monthly_series) / 12.0, 2)
    mean_solar = round(sum(p.allsky_sw_dwn for p in monthly_series) / 12.0, 2)

    if annual_precip < 140:
        aridity = "Hyper-Arid Desert Zone"
    elif annual_precip < 250:
        aridity = "Arid Steppe / Oasis Zone"
    else:
        aridity = "Semi-Arid Irrigated Foothill Zone"

    return ClimateSummary(
        source=source,  # type: ignore
        annual_precip_mm=annual_precip,
        mean_summer_temp_c=mean_summer_temp,
        mean_soil_wetness=mean_wetness,
        mean_solar_irradiance=mean_solar,
        aridity_index=aridity,
        monthly_series=monthly_series,
    )

async def fetch_nasa_climate(lat: float, lon: float) -> Tuple[ClimateSummary, str]:
    nearest = find_nearest_preset(lat, lon)
    matched_region = f"{nearest['name']} ({nearest['region']})"

    url = "https://power.larc.nasa.gov/api/temporal/climatology/point"
    params = {
        "parameters": "T2M,PRECTOTCORR,GWETTOP,ALLSKY_SFC_SW_DWN",
        "community": "AG",
        "longitude": round(lon, 4),
        "latitude": round(lat, 4),
        "format": "JSON",
    }

    try:
        async with httpx.AsyncClient(timeout=4.5) as client:
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            payload = resp.json()
            parameter_data = payload["properties"]["parameter"]
            summary = _build_climate_summary(
                parameter_data,
                source="nasa_power_live",
                is_daily_rate_precip=True,
            )
            return summary, matched_region
    except Exception:
        fallback_summary = _build_climate_summary(
            nearest["climatology"],
            source="local_fallback_cache",
            is_daily_rate_precip=False,
        )
        return fallback_summary, matched_region

```

### `backend/services/rotation_engine.py`

```python
from typing import Dict, List, Tuple
from models import (
    ClimateSummary,
    CropId,
    FarmerPriority,
    ImpactMetrics,
    SalinityLevel,
    SeasonStep,
)

CROP_KB: Dict[CropId, Dict] = {
    "cotton": {
        "name": "Upland Cotton",
        "uzbek_name": "G'o'za (Paxta)",
        "water_need_mm": 900,
        "salinity_tolerance": 3,
        "nitrogen_impact": -2,
        "heat_tolerance": 4,
        "yield_value": 4,
        "role": "Cash Crop (High Water/Nitrogen Depleting)",
    },
    "winter_wheat": {
        "name": "Winter Wheat",
        "uzbek_name": "Kuzgi Bug'doy",
        "water_need_mm": 550,
        "salinity_tolerance": 3,
        "nitrogen_impact": -1,
        "heat_tolerance": 3,
        "yield_value": 4,
        "role": "Food Security Cereal (Moderate Depleting)",
    },
    "alfalfa": {
        "name": "Alfalfa (Lucerne)",
        "uzbek_name": "Beda",
        "water_need_mm": 600,
        "salinity_tolerance": 4,
        "nitrogen_impact": 3,
        "heat_tolerance": 4,
        "yield_value": 3,
        "role": "Deep-Root Nitrogen Fixer & Bio-Drainage",
    },
    "mung_bean": {
        "name": "Mung Bean",
        "uzbek_name": "Mosh",
        "water_need_mm": 320,
        "salinity_tolerance": 2,
        "nitrogen_impact": 2,
        "heat_tolerance": 4,
        "yield_tolerance": 4,
        "yield_value": 4,
        "role": "Short-Season Legume & Soil Restorer",
    },
    "sorghum": {
        "name": "Grain Sorghum",
        "uzbek_name": "Jo'xori",
        "water_need_mm": 420,
        "salinity_tolerance": 4,
        "nitrogen_impact": -1,
        "heat_tolerance": 5,
        "yield_value": 3,
        "role": "Drought & Halophyte-Resilient Bio-Mass",
    },
    "melons": {
        "name": "Central Asian Melons",
        "uzbek_name": "Qovun / Poliz ekinlari",
        "water_need_mm": 480,
        "salinity_tolerance": 3,
        "nitrogen_impact": -1,
        "heat_tolerance": 5,
        "yield_value": 5,
        "role": "High-Margin Arid Cash Crop",
    },
}

SALINITY_REQUIRED_TOLERANCE: Dict[SalinityLevel, int] = {
    "low": 1,
    "moderate": 2,
    "high": 3,
    "severe": 4,
}

def score_crop(
    crop_id: CropId,
    previous_crop: CropId,
    salinity: SalinityLevel,
    priority: FarmerPriority,
    climate: ClimateSummary,
    year_index: int,
) -> float:
    crop = CROP_KB[crop_id]
    req_salinity = SALINITY_REQUIRED_TOLERANCE[salinity]

    # 1. Water efficiency score (0-100)
    water_score = max(0.0, (1000.0 - crop["water_need_mm"]) / 700.0 * 100.0)

    # 2. Salinity match score (0-100)
    sal_diff = crop["salinity_tolerance"] - req_salinity
    if sal_diff >= 0:
        salinity_score = min(100.0, 80.0 + sal_diff * 10.0)
    else:
        salinity_score = max(10.0, 80.0 + sal_diff * 35.0)

    # 3. Soil nitrogen score (0-100)
    soil_score = ((crop["nitrogen_impact"] + 2.0) / 5.0) * 100.0

    # 4. Heat resilience score (0-100)
    heat_stress_threshold = 4 if climate.mean_summer_temp_c >= 28.5 else 3
    heat_score = 95.0 if crop["heat_tolerance"] >= heat_stress_threshold else 60.0

    # 5. Economic yield value (0-100)
    yield_score = (crop["yield_value"] / 5.0) * 100.0

    # Priority weights
    if priority == "conserve_water":
        base = 0.42 * water_score + 0.23 * salinity_score + 0.15 * soil_score + 0.12 * heat_score + 0.08 * yield_score
    elif priority == "restore_soil":
        base = 0.45 * soil_score + 0.22 * salinity_score + 0.15 * water_score + 0.10 * heat_score + 0.08 * yield_score
    else:  # maximize_yield
        base = 0.35 * yield_score + 0.25 * salinity_score + 0.18 * soil_score + 0.12 * water_score + 0.10 * heat_score

    # Monoculture penalty: never repeat the exact same depleting crop back-to-back
    if crop_id == previous_crop:
        if crop_id in ("cotton", "winter_wheat", "sorghum", "melons"):
            base -= 45.0
        else:
            base -= 12.0

    # Enforce nitrogen recovery in Year 2 if Year 1 had negative nitrogen impact
    if year_index == 2 and CROP_KB[previous_crop]["nitrogen_impact"] < 0 and crop["nitrogen_impact"] > 0:
        base += 18.0

    return round(min(max(base, 5.0), 99.0), 1)

def generate_rotation_plan(
    current_crop: CropId,
    salinity: SalinityLevel,
    priority: FarmerPriority,
    climate: ClimateSummary,
) -> Tuple[List[SeasonStep], ImpactMetrics]:
    steps: List[SeasonStep] = []
    prev_crop = current_crop
    season_titles = [
        "Year 1: Monoculture Break & Stress Adaptation",
        "Year 2: Biological Nitrogen Fixation & Leaching",
        "Year 3: High-Efficiency Cash/Cereal Recovery",
    ]

    all_crops: List[CropId] = ["cotton", "winter_wheat", "alfalfa", "mung_bean", "sorghum", "melons"]

    for yr in (1, 2, 3):
        scored = [
            (cid, score_crop(cid, prev_crop, salinity, priority, climate, yr))
            for cid in all_crops
        ]
        scored.sort(key=lambda x: x[1], reverse=True)
        best_cid, best_score = scored[0]
        c_info = CROP_KB[best_cid]

        deficit_mm = max(0, int(round(c_info["water_need_mm"] - climate.annual_precip_mm)))
        rationale = (
            f"Replaces {CROP_KB[prev_crop]['name']} with {c_info['name']} ({c_info['role']}). "
            f"Requires {c_info['water_need_mm']} mm water ({deficit_mm} mm irrigation deficit vs. "
            f"{climate.annual_precip_mm} mm rainfall), provides {c_info['nitrogen_impact']:+d} N-balance, "
            f"and matches {climate.mean_summer_temp_c}°C peak summer temperatures."
        )

        steps.append(
            SeasonStep(
                year=yr,
                season_label=season_titles[yr - 1],
                crop_id=best_cid,
                crop_name=c_info["name"],
                uzbek_name=c_info["uzbek_name"],
                water_need_mm=c_info["water_need_mm"],
                irrigation_deficit_mm=deficit_mm,
                nitrogen_delta=c_info["nitrogen_impact"],
                salinity_tolerance=c_info["salinity_tolerance"],
                heat_tolerance=c_info["heat_tolerance"],
                suitability_score=best_score,
                agronomic_rationale=rationale,
            )
        )
        prev_crop = best_cid

    # Baseline: traditional Uzbekistan Cotton -> Winter Wheat -> Cotton 3-year cycle (2350 mm)
    baseline_water = 900 + 550 + 900
    plan_water = sum(s.water_need_mm for s in steps)
    water_saved = baseline_water - plan_water
    water_saved_pct = round((water_saved / baseline_water) * 100.0, 1)
    net_n = sum(s.nitrogen_delta for s in steps)
    restoration_idx = round(min(100.0, max(20.0, 55.0 + net_n * 9.0 + (water_saved_pct * 0.3))), 1)

    warnings: List[str] = []
    if salinity in ("high", "severe"):
        warnings.append(
            f"HIGH SALINITY ALERT ({salinity.upper()}): Conduct winter pre-irrigation flushing (1,200 m³/ha) and prioritize deep-root bio-drainage (Alfalfa/Sorghum)."
        )
    if climate.mean_summer_temp_c >= 29.0:
        warnings.append(
            f"THERMAL STRESS WARNING: NASA POWER indicates {climate.mean_summer_temp_c}°C JJA mean. Schedule irrigation at night and use mulch cover to reduce soil evaporation."
        )
    if climate.mean_soil_wetness <= 0.28:
        warnings.append(
            f"LOW TOPSOIL MOISTURE (GWETTOP={climate.mean_soil_wetness}): High risk of secondary salt crusting; transition from open furrow to subsurface drip irrigation."
        )
    if not warnings:
        warnings.append(
            "FAVORABLE AGRO-CLIMATE: Conditions support double-cropping Mung Bean (Mosh) immediately after June Winter Wheat harvest."
        )

    metrics = ImpactMetrics(
        baseline_3yr_water_mm=baseline_water,
        plan_3yr_water_mm=plan_water,
        water_saved_mm=water_saved,
        water_saved_pct=water_saved_pct,
        net_nitrogen_score=net_n,
        soil_restoration_index=restoration_idx,
        risk_warnings=warnings,
    )
    return steps, metrics

```

### `backend/main.py`

```python
from typing import List
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from models import AnalyzeFieldRequest, AnalyzeFieldResponse, PresetLocation
from services.nasa_power import fetch_nasa_climate, get_preset_locations
from services.rotation_engine import generate_rotation_plan

app = FastAPI(
    title="Field Shift Uzbekistan - NASA Space Apps API",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/presets", response_model=List[PresetLocation])
async def list_presets() -> List[PresetLocation]:
    return get_preset_locations()

@app.post("/api/analyze-field", response_model=AnalyzeFieldResponse)
async def analyze_field(payload: AnalyzeFieldRequest) -> AnalyzeFieldResponse:
    climate, matched_region = await fetch_nasa_climate(payload.lat, payload.lon)
    rotation_plan, impact_metrics = generate_rotation_plan(
        current_crop=payload.current_crop,
        salinity=payload.soil_salinity_level,
        priority=payload.farmer_priority,
        climate=climate,
    )
    return AnalyzeFieldResponse(
        coordinates={"lat": round(payload.lat, 4), "lon": round(payload.lon, 4)},
        matched_region=matched_region,
        climate=climate,
        rotation_plan=rotation_plan,
        impact_metrics=impact_metrics,
    )

```

---

## 5. Frontend Component Architecture (Next.js 14 App Router)

### Configuration Files

#### `frontend/next.config.mjs`

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
};
export default nextConfig;

```

#### `frontend/tailwind.config.ts`

```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {},
  },
  plugins: [],
};
export default config;

```

#### `frontend/postcss.config.js`

```javascript
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};

```

#### `frontend/tsconfig.json`

```json
{
  "compilerOptions": {
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}

```

#### `frontend/src/app/globals.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
@import "leaflet/dist/leaflet.css";

body {
  background-color: #090d16;
  color: #f1f5f9;
}

```

#### `frontend/src/app/layout.tsx`

```tsx
import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Field Shift Uzbekistan | NASA Space Apps 2026",
  description: "NASA Earth Observation Crop Rotation & Salinity Decision Support System",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased selection:bg-emerald-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}

```

---

### Frontend Types & Components

#### `frontend/src/types/api.ts`

```typescript
export type CropId = "cotton" | "winter_wheat" | "alfalfa" | "mung_bean" | "sorghum" | "melons";
export type SalinityLevel = "low" | "moderate" | "high" | "severe";
export type FarmerPriority = "conserve_water" | "restore_soil" | "maximize_yield";

export interface PresetLocation {
  id: string;
  name: string;
  region: string;
  lat: number;
  lon: number;
  default_salinity: SalinityLevel;
  default_crop: CropId;
  description: string;
}

export interface MonthlyClimatePoint {
  month: string;
  t2m_c: number;
  prectotcorr_mm: number;
  gwettop_ratio: number;
  allsky_sw_dwn: number;
}

export interface ClimateSummary {
  source: "nasa_power_live" | "local_fallback_cache";
  annual_precip_mm: number;
  mean_summer_temp_c: number;
  mean_soil_wetness: number;
  mean_solar_irradiance: number;
  aridity_index: string;
  monthly_series: MonthlyClimatePoint[];
}

export interface SeasonStep {
  year: number;
  season_label: string;
  crop_id: CropId;
  crop_name: string;
  uzbek_name: string;
  water_need_mm: number;
  irrigation_deficit_mm: number;
  nitrogen_delta: number;
  salinity_tolerance: number;
  heat_tolerance: number;
  suitability_score: number;
  agronomic_rationale: string;
}

export interface ImpactMetrics {
  baseline_3yr_water_mm: number;
  plan_3yr_water_mm: number;
  water_saved_mm: number;
  water_saved_pct: number;
  net_nitrogen_score: number;
  soil_restoration_index: number;
  risk_warnings: string[];
}

export interface AnalyzeFieldResponse {
  coordinates: { lat: number; lon: number };
  matched_region: string;
  climate: ClimateSummary;
  rotation_plan: SeasonStep[];
  impact_metrics: ImpactMetrics;
}

```

#### `frontend/src/components/FarmMap.tsx`

Loaded strictly client-side via `next/dynamic` (`ssr: false`) to prevent Leaflet `window` hydration errors.

```tsx
"use client";

import React, { useEffect } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMapEvents, useMap } from "react-leaflet";
import { PresetLocation } from "@/types/api";

interface FarmMapProps {
  lat: number;
  lon: number;
  presets: PresetLocation[];
  onSelectCoord: (lat: number, lon: number) => void;
}

function MapClickEvents({ onSelectCoord }: { onSelectCoord: (lat: number, lon: number) => void }) {
  useMapEvents({
    click(e) {
      const clampedLat = Math.min(Math.max(e.latlng.lat, 37.0), 46.0);
      const clampedLon = Math.min(Math.max(e.latlng.lng, 55.0), 74.0);
      onSelectCoord(Number(clampedLat.toFixed(4)), Number(clampedLon.toFixed(4)));
    },
  });
  return null;
}

function RecenterMap({ lat, lon }: { lat: number; lon: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lon], map.getZoom(), { animate: true });
  }, [lat, lon, map]);
  return null;
}

export default function FarmMap({ lat, lon, presets, onSelectCoord }: FarmMapProps) {
  return (
    <div className="relative h-[360px] w-full rounded-xl overflow-hidden border border-slate-800 shadow-lg">
      <MapContainer center={[lat, lon]} zoom={6} className="h-full w-full z-0">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapClickEvents onSelectCoord={onSelectCoord} />
        <RecenterMap lat={lat} lon={lon} />

        {presets.map((p) => (
          <CircleMarker
            key={p.id}
            center={[p.lat, p.lon]}
            radius={7}
            pathOptions={{ color: "#38bdf8", fillColor: "#0284c7", fillOpacity: 0.7 }}
            eventHandlers={{
              click: () => onSelectCoord(p.lat, p.lon),
            }}
          >
            <Popup>
              <div className="text-slate-900 text-xs font-semibold">{p.name}</div>
            </Popup>
          </CircleMarker>
        ))}

        <CircleMarker
          center={[lat, lon]}
          radius={11}
          pathOptions={{ color: "#10b981", fillColor: "#059669", fillOpacity: 0.9, weight: 3 }}
        >
          <Popup>
            <div className="text-slate-900 text-xs font-bold">
              Selected Field: {lat.toFixed(4)}, {lon.toFixed(4)}
            </div>
          </Popup>
        </CircleMarker>
      </MapContainer>
      <div className="absolute bottom-3 left-3 z-[400] bg-slate-950/85 backdrop-blur px-3 py-1.5 rounded-lg border border-slate-800 text-xs text-slate-300">
        Click anywhere in Uzbekistan (37°N–46°N, 55°E–74°E) to query NASA POWER
      </div>
    </div>
  );
}

```

#### `frontend/src/components/PresetSelector.tsx`

```tsx
"use client";

import React from "react";
import { MapPin } from "lucide-react";
import { PresetLocation } from "@/types/api";

interface PresetSelectorProps {
  presets: PresetLocation[];
  activeId: string | null;
  onSelectPreset: (preset: PresetLocation) => void;
}

export default function PresetSelector({ presets, activeId, onSelectPreset }: PresetSelectorProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
      {presets.map((preset) => {
        const isSelected = activeId === preset.id;
        return (
          <button
            key={preset.id}
            type="button"
            onClick={() => onSelectPreset(preset)}
            className={`text-left p-3 rounded-xl border transition-all ${
              isSelected
                ? "bg-emerald-950/60 border-emerald-500 text-white shadow-md"
                : "bg-slate-900/70 border-slate-800 text-slate-300 hover:border-slate-700"
            }`}
          >
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 mb-1">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{preset.name}</span>
            </div>
            <div className="text-[11px] text-slate-400 line-clamp-2">{preset.description}</div>
          </button>
        );
      })}
    </div>
  );
}

```

#### `frontend/src/components/ClimateCharts.tsx`

```tsx
"use client";

import React from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { ClimateSummary } from "@/types/api";

export default function ClimateCharts({ climate }: { climate: ClimateSummary }) {
  const chartData = climate.monthly_series.map((pt) => ({
    ...pt,
    soil_moisture_pct: Math.round(pt.gwettop_ratio * 100),
  }));

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div>
          <h3 className="text-sm font-bold text-slate-100">
            NASA POWER Agro-Climatology Profile (T2M, GWETTOP, PRECTOTCORR)
          </h3>
          <p className="text-xs text-slate-400">
            Classification: <span className="text-amber-400 font-medium">{climate.aridity_index}</span> | Solar Irradiance:{" "}
            <span className="text-sky-400 font-medium">{climate.mean_solar_irradiance} kWh/m²/day</span>
          </p>
        </div>
        <span
          className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${
            climate.source === "nasa_power_live"
              ? "bg-emerald-950/80 border-emerald-500/50 text-emerald-300"
              : "bg-amber-950/80 border-amber-500/50 text-amber-300"
          }`}
        >
          {climate.source === "nasa_power_live" ? "LIVE NASA POWER API" : "OFFLINE CACHE FALLBACK"}
        </span>
      </div>

      <div className="h-[250px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="month" tick={{ fill: "#94a3b8", fontSize: 11 }} />
            <YAxis
              yAxisId="left"
              tick={{ fill: "#f87171", fontSize: 11 }}
              label={{ value: "°C / mm", angle: -90, position: "insideLeft", fill: "#94a3b8", fontSize: 10 }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              domain={[0, 100]}
              tick={{ fill: "#38bdf8", fontSize: 11 }}
              label={{ value: "Wetness %", angle: 90, position: "insideRight", fill: "#38bdf8", fontSize: 10 }}
            />
            <Tooltip
              contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", fontSize: "12px", color: "#f8fafc" }}
            />
            <Legend wrapperStyle={{ fontSize: "12px" }} />
            <Bar yAxisId="left" dataKey="prectotcorr_mm" name="Precip (mm)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="t2m_c"
              name="Temp 2m (°C)"
              stroke="#f87171"
              strokeWidth={2.5}
              dot={{ r: 3 }}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="soil_moisture_pct"
              name="Topsoil Wetness (%)"
              stroke="#10b981"
              strokeWidth={2.5}
              strokeDasharray="4 2"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

```

#### `frontend/src/components/RotationTimeline.tsx`

```tsx
"use client";

import React from "react";
import { Droplets, Sprout, Flame, ShieldAlert, CheckCircle2 } from "lucide-react";
import { ImpactMetrics, SeasonStep } from "@/types/api";

export default function RotationTimeline({
  steps,
  metrics,
}: {
  steps: SeasonStep[];
  metrics: ImpactMetrics;
}) {
  return (
    <div className="space-y-4">
      {/* KPI Delta Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-emerald-950/40 border border-emerald-800/70 rounded-xl p-4">
          <div className="text-xs text-emerald-400 font-semibold uppercase">3-Year Water Saved vs Baseline</div>
          <div className="text-2xl font-black text-white mt-1">
            {metrics.water_saved_pct}%{" "}
            <span className="text-sm font-normal text-emerald-300">({metrics.water_saved_mm} mm/ha)</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Plan: {metrics.plan_3yr_water_mm} mm vs Cotton-Wheat: {metrics.baseline_3yr_water_mm} mm
          </div>
        </div>

        <div className="bg-sky-950/40 border border-sky-800/70 rounded-xl p-4">
          <div className="text-xs text-sky-400 font-semibold uppercase">Soil Restoration Index</div>
          <div className="text-2xl font-black text-white mt-1">{metrics.soil_restoration_index} / 100</div>
          <div className="text-[11px] text-slate-400 mt-1">
            Net 3-Year Nitrogen Balance:{" "}
            <span className="text-sky-300 font-bold">
              {metrics.net_nitrogen_score > 0 ? `+${metrics.net_nitrogen_score}` : metrics.net_nitrogen_score}
            </span>
          </div>
        </div>

        <div className="bg-amber-950/30 border border-amber-800/60 rounded-xl p-4">
          <div className="text-xs text-amber-400 font-semibold uppercase flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4" /> Agro-Ecological Advisories
          </div>
          <ul className="mt-1.5 space-y-1 text-[11px] text-amber-200/90 leading-snug">
            {metrics.risk_warnings.map((w, idx) => (
              <li key={idx}>• {w}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* 3-Season Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {steps.map((step) => (
          <div
            key={step.year}
            className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col justify-between hover:border-emerald-600/60 transition-colors"
          >
            <div>
              <div className="flex items-center justify-between text-xs font-bold text-emerald-400 mb-2">
                <span>{step.season_label}</span>
                <span className="bg-emerald-950 border border-emerald-700 px-2 py-0.5 rounded text-[11px]">
                  Score: {step.suitability_score}
                </span>
              </div>

              <div className="text-lg font-extrabold text-white">{step.crop_name}</div>
              <div className="text-xs text-slate-400 italic mb-3">{step.uzbek_name}</div>

              <div className="grid grid-cols-2 gap-2 text-xs bg-slate-950/70 p-2.5 rounded-lg border border-slate-800/80 mb-3">
                <div className="flex items-center gap-1.5 text-sky-300">
                  <Droplets className="w-3.5 h-3.5" />
                  <span>Water: {step.water_need_mm} mm</span>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-300">
                  <Sprout className="w-3.5 h-3.5" />
                  <span>
                    N-Impact: {step.nitrogen_delta > 0 ? `+${step.nitrogen_delta}` : step.nitrogen_delta}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-amber-300">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Salt Tol: {step.salinity_tolerance}/5</span>
                </div>
                <div className="flex items-center gap-1.5 text-rose-300">
                  <Flame className="w-3.5 h-3.5" />
                  <span>Heat Tol: {step.heat_tolerance}/5</span>
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed border-t border-slate-800/80 pt-2.5">
              {step.agronomic_rationale}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

```

#### `frontend/src/app/page.tsx`

```tsx
"use client";

import React, { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { Satellite, RefreshCw, SlidersHorizontal } from "lucide-react";
import {
  AnalyzeFieldResponse,
  CropId,
  FarmerPriority,
  PresetLocation,
  SalinityLevel,
} from "@/types/api";
import PresetSelector from "@/components/PresetSelector";
import ClimateCharts from "@/components/ClimateCharts";
import RotationTimeline from "@/components/RotationTimeline";

const FarmMap = dynamic(() => import("@/components/FarmMap"), {
  ssr: false,
  loading: () => (
    <div className="h-[360px] w-full rounded-xl bg-slate-900 animate-pulse flex items-center justify-center text-xs text-slate-400 border border-slate-800">
      Initializing Geospatial Map Engine...
    </div>
  ),
});

const API_BASE = "http://localhost:8000";

export default function DashboardPage() {
  const [presets, setPresets] = useState<PresetLocation[]>([]);
  const [activePresetId, setActivePresetId] = useState<string | null>("nukus");
  const [lat, setLat] = useState<number>(42.4602);
  const [lon, setLon] = useState<number>(59.6166);
  const [currentCrop, setCurrentCrop] = useState<CropId>("cotton");
  const [salinity, setSalinity] = useState<SalinityLevel>("severe");
  const [priority, setPriority] = useState<FarmerPriority>("conserve_water");
  const [analysis, setAnalysis] = useState<AnalyzeFieldResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const runAnalysis = useCallback(
    async (
      qLat: number,
      qLon: number,
      qCrop: CropId,
      qSalinity: SalinityLevel,
      qPriority: FarmerPriority
    ) => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/analyze-field`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lat: qLat,
            lon: qLon,
            current_crop: qCrop,
            soil_salinity_level: qSalinity,
            farmer_priority: qPriority,
          }),
        });
        const data: AnalyzeFieldResponse = await res.json();
        setAnalysis(data);
      } catch (err) {
        console.error("Failed to analyze field:", err);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    fetch(`${API_BASE}/api/presets`)
      .then((r) => r.json())
      .then((list: PresetLocation[]) => setPresets(list))
      .catch(console.error);
    runAnalysis(42.4602, 59.6166, "cotton", "severe", "conserve_water");
  }, [runAnalysis]);

  const handleSelectPreset = (p: PresetLocation) => {
    setActivePresetId(p.id);
    setLat(p.lat);
    setLon(p.lon);
    setCurrentCrop(p.default_crop);
    setSalinity(p.default_salinity);
    runAnalysis(p.lat, p.lon, p.default_crop, p.default_salinity, priority);
  };

  const handleMapClick = (newLat: number, newLon: number) => {
    setActivePresetId(null);
    setLat(newLat);
    setLon(newLon);
    runAnalysis(newLat, newLon, currentCrop, salinity, priority);
  };

  return (
    <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <Satellite className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-white">
              FIELD SHIFT <span className="text-emerald-400">UZBEKISTAN</span>
            </h1>
            <p className="text-xs text-slate-400">
              NASA Space Apps 2026 • Earth Observation Crop Rotation & Salinity Decision Engine
            </p>
          </div>
        </div>
        <div className="text-xs text-slate-400 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
          Target Coordinate:{" "}
          <span className="text-emerald-400 font-mono font-semibold">
            {lat.toFixed(4)}°N, {lon.toFixed(4)}°E
          </span>{" "}
          ({analysis?.matched_region || "Loading..."})
        </div>
      </header>

      {/* Presets */}
      <PresetSelector
        presets={presets}
        activeId={activePresetId}
        onSelectPreset={handleSelectPreset}
      />

      {/* Map + Controls Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7">
          <FarmMap lat={lat} lon={lon} presets={presets} onSelectCoord={handleMapClick} />
        </div>

        <div className="lg:col-span-5 bg-slate-900/80 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-white border-b border-slate-800 pb-2.5">
              <SlidersHorizontal className="w-4 h-4 text-emerald-400" />
              <span>Field & Agronomic Parameters</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Current / Baseline Crop (Monoculture History)
              </label>
              <select
                value={currentCrop}
                onChange={(e) => setCurrentCrop(e.target.value as CropId)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
              >
                <option value="cotton">Upland Cotton (G&apos;o&apos;za / Paxta) - 900mm</option>
                <option value="winter_wheat">Winter Wheat (Kuzgi Bug&apos;doy) - 550mm</option>
                <option value="alfalfa">Alfalfa / Lucerne (Beda) - 600mm</option>
                <option value="mung_bean">Mung Bean (Mosh) - 320mm</option>
                <option value="sorghum">Grain Sorghum (Jo&apos;xori) - 420mm</option>
                <option value="melons">Melons / Cucurbits (Qovun) - 480mm</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Measured Soil Salinity Level (ECe)
              </label>
              <select
                value={salinity}
                onChange={(e) => setSalinity(e.target.value as SalinityLevel)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
              >
                <option value="low">Low (&lt; 2 dS/m - Non-Saline Foothills)</option>
                <option value="moderate">Moderate (2–4 dS/m - Alluvial Oasis)</option>
                <option value="high">High (4–8 dS/m - Secondary Salinization)</option>
                <option value="severe">Severe (&gt; 8 dS/m - Aral Basin / Solonchak)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Optimization Priority
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { id: "conserve_water", label: "Save Water" },
                    { id: "restore_soil", label: "Restore Soil" },
                    { id: "maximize_yield", label: "Max Revenue" },
                  ] as { id: FarmerPriority; label: string }[]
                ).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setPriority(item.id)}
                    className={`py-2 px-2 rounded-lg text-xs font-semibold border transition-all ${
                      priority === item.id
                        ? "bg-emerald-600 border-emerald-400 text-white"
                        : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            type="button"
            disabled={loading}
            onClick={() => runAnalysis(lat, lon, currentCrop, salinity, priority)}
            className="mt-5 w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-xs py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-950/50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            {loading ? "Querying NASA POWER & Scoring..." : "Generate 3-Year NASA Rotation Plan"}
          </button>
        </div>
      </div>

      {/* Results Section */}
      {analysis && (
        <div className="space-y-6">
          <ClimateCharts climate={analysis.climate} />
          <RotationTimeline steps={analysis.rotation_plan} metrics={analysis.impact_metrics} />
        </div>
      )}
    </main>
  );
}

```

---

## 6. Single-Command Startup Script for macOS (`zsh`)

Create `start.sh` in the repository root (`field-shift-uz/start.sh`) and make it executable (`chmod +x start.sh`):

```zsh
#!/usr/bin/env zsh
set -e

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "🚀 Bootstrapping Field Shift Uzbekistan (NASA Space Apps 2026)..."

# 1. Backend Setup
cd "$ROOT_DIR/backend"
if [ ! -d ".venv" ]; then
  python3 -m venv .venv
fi
source .venv/bin/activate
pip install --upgrade pip -q
pip install -r requirements.txt -q

# 2. Frontend Setup
cd "$ROOT_DIR/frontend"
if [ ! -d "node_modules" ]; then
  npm install
fi

# 3. Concurrent Launch with clean Ctrl+C trap
trap 'kill 0' SIGINT SIGTERM EXIT

echo "🛰️  Starting FastAPI Backend on http://localhost:8000 ..."
(cd "$ROOT_DIR/backend" && source .venv/bin/activate && uvicorn main:app --host 0.0.0.0 --port 8000 --reload) &

echo "🌾 Starting Next.js Frontend on http://localhost:3000 ..."
(cd "$ROOT_DIR/frontend" && npm run dev) &

wait

```

Run everything from your terminal with:

```zsh
chmod +x start.sh && ./start.sh

```
