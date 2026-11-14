import asyncio
import os
import sys
from pathlib import Path
from typing import List
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

BACKEND_DIR = Path(__file__).resolve().parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

# Load .env file (e.g., NASA_API_KEY)
load_dotenv(BACKEND_DIR / ".env")

from models import (
    AnalyzeFieldRequest,
    AnalyzeFieldResponse,
    ClimateSummary,
    MonthlyClimatePoint,
    PresetLocation,
)
from services.nasa_eonet import fetch_regional_hazards
from services.nasa_power import fetch_nasa_climate, get_preset_locations
from services.rotation_engine import generate_multi_strategy_plan

app = FastAPI(
    title="Field Shift Uzbekistan - NASA Space Apps API",
    description="Real-Time NASA Earth Observation Multi-API Crop Rotation Decision Engine",
    version="2.0.0",
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
    # Concurrently fetch NASA POWER Climatology/Daily Anomalies and NASA EONET Active Regional Hazards
    climate_task = fetch_nasa_climate(payload.lat, payload.lon)
    hazards_task = fetch_regional_hazards(payload.lat, payload.lon, max_radius_km=1500.0)

    (climate, matched_region), regional_hazards = await asyncio.gather(
        climate_task,
        hazards_task,
    )

    if payload.climate_stress_scenario:
        # Simulate 2035 Climate Stress Scenario: +2.0°C summer warming and -20% precipitation
        stressed_series = [
            MonthlyClimatePoint(
                month=pt.month,
                t2m_c=round(pt.t2m_c + (2.0 if pt.month in ("JUN", "JUL", "AUG") else 1.2), 1),
                prectotcorr_mm=round(pt.prectotcorr_mm * 0.80, 1),
                gwettop_ratio=round(max(0.01, pt.gwettop_ratio * 0.82), 2),
                allsky_sw_dwn=pt.allsky_sw_dwn,
                t2m_min_c=round(pt.t2m_min_c + 1.2, 1) if pt.t2m_min_c is not None else None,
            )
            for pt in climate.monthly_series
        ]
        ann_precip = round(sum(p.prectotcorr_mm for p in stressed_series), 1)
        summer_temps = [p.t2m_c for p in stressed_series if p.month in ("JUN", "JUL", "AUG")]
        mean_summer_t = round(sum(summer_temps) / len(summer_temps), 2)
        mean_wet = round(sum(p.gwettop_ratio for p in stressed_series) / 12.0, 2)
        apr_m = next((p for p in stressed_series if p.month == "APR"), None)
        oct_m = next((p for p in stressed_series if p.month == "OCT"), None)
        apr_min = apr_m.t2m_min_c if apr_m else climate.april_t2m_min_c
        oct_min = oct_m.t2m_min_c if oct_m else climate.october_t2m_min_c

        climate = ClimateSummary(
            source=climate.source,
            annual_precip_mm=ann_precip,
            mean_summer_temp_c=mean_summer_t,
            mean_soil_wetness=mean_wet,
            mean_solar_irradiance=climate.mean_solar_irradiance,
            aridity_index=f"{climate.aridity_index} [2035 Stress: +2°C / -20% Rain]",
            monthly_series=stressed_series,
            recent_12mo_precip_mm=round(climate.recent_12mo_precip_mm * 0.80, 1),
            precip_anomaly_pct=round(climate.precip_anomaly_pct - 20.0, 1),
            recent_summer_max_temp_c=round(climate.recent_summer_max_temp_c + 2.0, 1),
            temp_anomaly_c=round(climate.temp_anomaly_c + 2.0, 1),
            spring_frost_risk=apr_min is not None and apr_min < 2.0,
            autumn_frost_risk=oct_min is not None and oct_min < 2.0,
            april_t2m_min_c=apr_min,
            october_t2m_min_c=oct_min,
        )

    strategies, recommended_steps, recommended_metrics = generate_multi_strategy_plan(
        current_crop=payload.current_crop,
        salinity=payload.soil_salinity_level,
        priority=payload.farmer_priority,
        climate=climate,
        lat=payload.lat,
        lon=payload.lon,
    )

    return AnalyzeFieldResponse(
        coordinates={"lat": round(payload.lat, 4), "lon": round(payload.lon, 4)},
        matched_region=matched_region,
        climate=climate,
        regional_hazards=regional_hazards,
        rotation_plan=recommended_steps,
        impact_metrics=recommended_metrics,
        strategies=strategies,
    )
