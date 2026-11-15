import asyncio
import os
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

BACKEND_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BACKEND_DIR.parent
FIELDSHIFT_SRC = PROJECT_ROOT / "NASA_Space_App_Challenge" / "src"

if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))
if str(FIELDSHIFT_SRC) not in sys.path:
    sys.path.insert(0, str(FIELDSHIFT_SRC))

load_dotenv(BACKEND_DIR / ".env")

from models import (
    AgroKpi,
    AnalyzeFieldRequest,
    AnalyzeFieldResponse,
    ClimateSummary,
    CropTrait,
    GibsLayerMeta,
    HazardEvent,
    ImpactMetrics,
    MonthlyClimatePoint,
    MonthlyWaterBalance,
    PresetLocation,
    PriorityWeights,
    RotationCandidateSummary,
    RotationStrategy,
    SeasonStep,
    SoilProfile,
    WhatIfScenario,
)

# Scientific imports from fieldshift engine
from fieldshift.crops import load_crops
from fieldshift.fetch import gibs
from fieldshift.fetch.soil import fetch_soil
from fieldshift.pipeline import build_context, run, choose
from fieldshift.scoring import Weights, PRIORITIES, PROFILES
from fieldshift.explain import explain, is_arid, summary_box
from fieldshift import features as F
from fieldshift import i18n
import pandas as pd

def doy_to_date(doy: float, lang: str = "en") -> str:
    if pd.isna(doy) or doy is None:
        return "n/a"
    try:
        d = pd.Timestamp("2001-01-01") + pd.Timedelta(days=int(doy) - 1)
        months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
        return f"{months[d.month - 1]} {d.day}"
    except Exception:
        return "n/a"

from services.nasa_eonet import fetch_regional_hazards
from services.nasa_power import fetch_nasa_climate, get_preset_locations
from services.rotation_engine import generate_multi_strategy_plan

app = FastAPI(
    title="Agriverto Uzbekistan - NASA Space Apps Scientific API",
    description="Full-Stack NASA Earth Observation Agro-Ecological Crop Rotation Decision Platform",
    version="3.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

CROPS_DB = load_crops()

UZBEK_CROP_NAMES = {
    "cotton": "G'o'za (Paxta)",
    "winter_wheat": "Kuzgi Bug'doy",
    "barley": "Arpa",
    "maize": "Makkajo'xori",
    "sorghum": "Jo'xori (Oq jo'xori)",
    "millet": "Tariq",
    "alfalfa": "Beda",
    "mung_bean": "Mosh",
    "chickpea": "No'xat",
    "lentil": "Yasmiq",
    "soybean": "Soya",
    "sunflower": "Kungaboqar",
    "safflower": "Maxsar",
    "rapeseed": "Raps",
    "rye_cover": "Javdar (himoya ekini)",
    "hairy_vetch": "Tukli vika",
    "clover": "Sebarga",
    "potato": "Kartoshka",
    "melon": "Qovun / Tarvuz",
    "sugar_beet": "Qand lavlagi",
}

@app.get("/api/crops", response_model=List[CropTrait])
async def list_crops() -> List[CropTrait]:
    """Returns all 20 agro-ecological crops from the scientific knowledge base."""
    crops_list = []
    for cid, data in CROPS_DB.items():
        crops_list.append(
            CropTrait(
                id=cid,
                name=data.get("name", cid.replace("_", " ").title()),
                uzbek_name=UZBEK_CROP_NAMES.get(cid, data.get("name", cid)),
                season=data.get("season", "warm"),
                role=data.get("market_role", "Crop"),
                water_need_mm=int(data.get("water_need_mm", 600)),
                heat_thr_c=float(data.get("heat_thr_c", 35.0)),
                salinity_tolerance=int(data.get("salinity_tolerance", 3)),
                nitrogen_delta=int(data.get("nitrogen_delta", 0)),
                sowing_window=data.get("sowing_window", ""),
                harvest_window=data.get("harvest_window", ""),
            )
        )
    return crops_list

@app.get("/api/gibs-layers", response_model=Dict[str, GibsLayerMeta])
async def list_gibs_layers() -> Dict[str, GibsLayerMeta]:
    """Returns verified NASA GIBS satellite raster metadata, tile matrix templates, and color legends."""
    layers = gibs.load_cached()
    units_map = {"ndvi": "", "precip": "mm/h", "temp": "°C", "soil": "m³/m³"}
    titles_map = {
        "ndvi": "MODIS Vegetation Index (NDVI 250m)",
        "precip": "GPM IMERG Precipitation Rate",
        "temp": "MODIS Land Surface Temp Day",
        "soil": "SMAP L4 Surface Soil Moisture",
    }
    result: Dict[str, GibsLayerMeta] = {}
    for key, l in layers.items():
        grad = l.legend.css_gradient() if l.legend else "none"
        vmin = float(l.legend.vmin) if (l.legend and l.legend.vmin is not None) else 0.0
        vmax = float(l.legend.vmax) if (l.legend and l.legend.vmax is not None) else 1.0
        result[key] = GibsLayerMeta(
            key=key,
            layer_id=l.layer_id,
            title=titles_map.get(key, l.layer_id),
            date=l.date,
            tile_url=f"https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/{l.layer_id}/default/{l.date}/{l.tms}/{{z}}/{{y}}/{{x}}.{l.ext}",
            max_zoom=l.max_zoom,
            units=units_map.get(key, ""),
            gradient_css=grad,
            vmin=vmin,
            vmax=vmax,
            ok=l.ok,
            as_of=l.as_of or "",
        )
    return result

@app.get("/api/presets", response_model=List[PresetLocation])
async def list_presets() -> List[PresetLocation]:
    """Returns farmland presets with verified cropland coordinates and default rotations."""
    return get_preset_locations()

# In-memory LRU cache for ultra-fast instant responses (< 5ms on warm queries)
ANALYSIS_CACHE: Dict[str, AnalyzeFieldResponse] = {}

@app.post("/api/analyze-field", response_model=AnalyzeFieldResponse)
async def analyze_field(payload: AnalyzeFieldRequest) -> AnalyzeFieldResponse:
    # 1. Determine active rotation
    if payload.current_rotation and len(payload.current_rotation) > 0:
        current_rot = tuple(c for c in payload.current_rotation if c in CROPS_DB)
    elif payload.current_crop and payload.current_crop in CROPS_DB:
        current_rot = (payload.current_crop,)
    else:
        current_rot = ("winter_wheat", "cotton")

    # 2. Extract Scenario Sliders
    rain_pct = payload.scenario.rain_pct if payload.scenario else (-20 if payload.climate_stress_scenario else 0)
    temp_c = payload.scenario.temp_c if payload.scenario else (2.0 if payload.climate_stress_scenario else 0.0)
    supply = payload.scenario.supply if payload.scenario else 1.0

    # 3. Extract Weights
    if payload.priorities:
        w_dict = payload.priorities.dict()
    else:
        # Default based on simple farmer_priority
        if payload.farmer_priority == "conserve_water":
            w_dict = {"water_saving": 8.0, "soil_om": 5.0, "nitrogen": 4.0, "erosion": 4.0, "forage": 3.0, "income": 5.0}
        elif payload.farmer_priority == "restore_soil":
            w_dict = {"water_saving": 5.0, "soil_om": 9.0, "nitrogen": 8.0, "erosion": 7.0, "forage": 4.0, "income": 4.0}
        else:
            w_dict = {"water_saving": 4.0, "soil_om": 4.0, "nitrogen": 4.0, "erosion": 3.0, "forage": 6.0, "income": 9.0}
    weights = Weights(**w_dict)

    # Fast in-memory cache check
    cache_key = f"{round(payload.lat, 3)}:{round(payload.lon, 3)}:{current_rot}:{payload.soil_salinity_level}:{rain_pct}:{temp_c}:{supply}:{tuple(sorted(w_dict.items()))}"
    if cache_key in ANALYSIS_CACHE:
        return ANALYSIS_CACHE[cache_key]

    # 4. Concurrently run scientific pipeline, hazards, climate, and soil
    async def run_scientific():
        loop = asyncio.get_event_loop()
        def _exec():
            ctx = build_context(payload.lat, payload.lon, rain_factor=1.0 + (rain_pct / 100.0), temp_delta=temp_c)
            pool = run(ctx, current_rot, weights, n_alternatives=80, n_per_rule=80, irrigation_supply=supply)
            force_rule = (("winter_wheat", "mung_bean", "cotton"),) if current_rot == ("winter_wheat", "cotton") else ()
            display, tied = choose(pool, weights, n=4, force=force_rule)
            return ctx, display, tied
        return await loop.run_in_executor(None, _exec)

    async def fetch_soil_safe():
        loop = asyncio.get_event_loop()
        try:
            res = await asyncio.wait_for(loop.run_in_executor(None, fetch_soil, payload.lat, payload.lon), timeout=1.5)
            return res.ok, res.data, res.source
        except Exception:
            return False, pd.DataFrame(), "offline_or_timeout"

    hazards_task = fetch_regional_hazards(payload.lat, payload.lon, max_radius_km=1500.0)
    climate_task = fetch_nasa_climate(payload.lat, payload.lon)
    soil_task = fetch_soil_safe()

    try:
        (ctx, display, tied), (soil_ok, soil_data, soil_src), regional_hazards, (legacy_climate, matched_region) = await asyncio.gather(
            run_scientific(),
            soil_task,
            hazards_task,
            climate_task,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Scientific calculation failed: {str(e)}")

    # 5. Build 9 Agro-Climatology KPIs with Theil-Sen Trends
    d, ann = ctx.daily, ctx.annual
    clim = F.monthly_climatology(d)
    rain_m = float(ann["precip"].median())
    rlo, rhi = float(ann["precip"].quantile(0.1)), float(ann["precip"].quantile(0.9))
    et0_m = float(ann["et0"].median())
    gap = et0_m - rain_m
    t_mean = float(ann["t_mean"].median())
    t_trend = F.theil_sen_trend(ann["t_mean"])
    p_trend = F.theil_sen_trend(ann["precip"])
    last_spring_frost = float(ann["last_spring_frost_doy"].median())
    first_autumn_frost = float(ann["first_autumn_frost_doy"].median())
    free_days = float((ann["first_autumn_frost_doy"] - ann["last_spring_frost_doy"]).median())
    frost_days = float(ann["frost_days"].median())
    flo, fhi = float(ann["frost_days"].quantile(0.1)), float(ann["frost_days"].quantile(0.9))
    heat_days = float(ann["heat_days"].median())
    hlo, hhi = float(ann["heat_days"].quantile(0.1)), float(ann["heat_days"].quantile(0.9))

    kpis = [
        AgroKpi(
            label="Annual Precipitation",
            value=f"{rain_m:.0f}",
            unit="mm",
            detail=f"10–90th percentile: {rlo:.0f}–{rhi:.0f} mm",
            context=f"NASA POWER Climatology (2001–2025)",
        ),
        AgroKpi(
            label="Evapotranspiration (ET0)",
            value=f"{et0_m:.0f}",
            unit="mm",
            detail=f"Atmospheric evaporative gap: {gap:+.0f} mm",
            context=f"Deficit: {gap:.0f} mm unmet by precipitation" if gap > 0 else "Precipitation covers ET0",
            warn=gap > 0,
        ),
        AgroKpi(
            label="Mean Annual Temperature",
            value=f"{t_mean:.1f}",
            unit="°C",
            detail=f"Decadal trend: {t_trend.slope_per_decade:+.2f} °C / decade",
            context="Statistically clear warming" if t_trend.significant else "No significant trend",
        ),
        AgroKpi(
            label="Last Spring Frost",
            value=doy_to_date(last_spring_frost, "en"),
            unit="",
            detail=f"P10–P90 window: {doy_to_date(ann['last_spring_frost_doy'].quantile(0.1), 'en')} – {doy_to_date(ann['last_spring_frost_doy'].quantile(0.9), 'en')}",
            context="Critical for summer crop sowing",
        ),
        AgroKpi(
            label="First Autumn Frost",
            value=doy_to_date(first_autumn_frost, "en"),
            unit="",
            detail=f"P10–P90 window: {doy_to_date(ann['first_autumn_frost_doy'].quantile(0.1), 'en')} – {doy_to_date(ann['first_autumn_frost_doy'].quantile(0.9), 'en')}",
            context="Sets cutoff for cotton boll opening",
        ),
        AgroKpi(
            label="Frost-Free Window",
            value=f"{free_days:.0f}",
            unit="days",
            detail=f"Typical range: {float((ann['first_autumn_frost_doy'] - ann['last_spring_frost_doy']).quantile(0.1)):.0f}–{float((ann['first_autumn_frost_doy'] - ann['last_spring_frost_doy']).quantile(0.9)):.0f} days",
            context="Thermal growth budget",
        ),
        AgroKpi(
            label="Annual Frost Days",
            value=f"{frost_days:.0f}",
            unit="days",
            detail=f"Tmin ≤ 0°C (range: {flo:.0f}–{fhi:.0f} days)",
            context="Winter chilling & dormancy",
        ),
        AgroKpi(
            label="Extreme Heat Days",
            value=f"{heat_days:.0f}",
            unit="days",
            detail=f"Tmax ≥ 35°C (range: {hlo:.0f}–{hhi:.0f} days)",
            context="Pollen sterility & stress period",
            warn=heat_days > 25,
        ),
        AgroKpi(
            label="Precipitation Decadal Trend",
            value=f"{p_trend.slope_per_decade:+.1f}",
            unit="mm / dec",
            detail=f"Period: {ann.index.min()}–{ann.index.max()}",
            context="Statistically clear shift" if p_trend.significant else "Consistent baseline variability",
        ),
    ]

    # 6. Monthly Water Balance
    water_balance_monthly = []
    months_keys = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    for m_idx, m_name in enumerate(months_keys, start=1):
        m_rain = float(clim.loc[m_idx, "PRECTOTCORR"]) if (m_idx in clim.index and "PRECTOTCORR" in clim.columns) else 0.0
        m_et0 = float(clim.loc[m_idx, "ET0"]) if (m_idx in clim.index and "ET0" in clim.columns) else 0.0
        water_balance_monthly.append(
            MonthlyWaterBalance(
                month=m_name,
                rain_mm=round(m_rain, 1),
                et0_mm=round(m_et0, 1),
                deficit_mm=round(max(0.0, m_et0 - m_rain), 1),
            )
        )

    # 7. Soil Profile (ISRIC SoilGrids)
    soil_profile = None
    if soil_ok and not soil_data.empty:
        s_row = soil_data.iloc[0].to_dict()
        soil_profile = SoilProfile(
            clay_pct=float(s_row.get("clay", 0.0)) if s_row.get("clay") is not None else None,
            silt_pct=float(s_row.get("silt", 0.0)) if s_row.get("silt") is not None else None,
            sand_pct=float(s_row.get("sand", 0.0)) if s_row.get("sand") is not None else None,
            bulk_density=float(s_row.get("bdod", 0.0)) if s_row.get("bdod") is not None else None,
            organic_carbon=float(s_row.get("soc", 0.0)) if s_row.get("soc") is not None else None,
            ph=float(s_row.get("phh2o", 0.0)) if s_row.get("phh2o") is not None else None,
            texture=str(s_row.get("texture", "loam")),
            nitrogen=float(s_row.get("nitrogen", 0.0)) if s_row.get("nitrogen") is not None else None,
            source=soil_src,
        )

    # 8. GIBS Layers Metadata
    gibs_layers = await list_gibs_layers()

    # 9. Rotation Candidates (Current vs Alternatives)
    cur_result = display[0]
    ci = cur_result.summary
    fits = [r.summary["fit"]["median"] for r in display]
    best_idx = max(range(len(display)), key=lambda i: fits[i]) if len({round(v) for v in fits}) > 1 else None

    yield_low = supply >= 1.0 and all(max(x["yield_loss"]["median"], x["yield_loss"]["p90"]) * 100 < 3 for x in [r.summary for r in display])
    low_yield_note = (
        "At full irrigation supply there is almost no water-shortage risk. Lower the irrigation supply in 'What-if scenarios' to see where each option breaks."
        if yield_low else None
    )

    candidates: List[RotationCandidateSummary] = []
    for i, r in enumerate(display):
        s = r.summary
        exp = explain(r, cur_result, ctx)
        irr_m = float(s["irrigation_demand_mm"]["median"])
        cirr_m = float(ci["irrigation_demand_mm"]["median"])
        vs_now = round(100.0 * (irr_m - cirr_m) / cirr_m, 1) if (i > 0 and cirr_m > 0) else None

        radar_scores = {
            "Water Saving": round(float(s.get("norm_water_saving", {}).get("median", 50.0)), 1),
            "Soil Organic Matter": round(float(s.get("norm_soil_om", {}).get("median", 50.0)), 1),
            "Nitrogen Fixation": round(float(s.get("norm_nitrogen", {}).get("median", 50.0)), 1),
            "Erosion Control": round(float(s.get("norm_erosion", {}).get("median", 50.0)), 1),
            "Forage Yield": round(float(s.get("norm_forage", {}).get("median", 50.0)), 1),
            "Cash Income": round(float(s.get("norm_income", {}).get("median", 50.0)), 1),
        }

        rule_label_map = {
            "current": "Current Farm Baseline",
            "cover": "Active Cover Crop Integration",
            "double_crop_legume": "Short-Season Nitrogen Fixer Insertion",
            "salt_tolerant": "Halophyte & Drought-Resilient Replacement",
            "green_manure": "Green Manure Bio-Drainage Cover",
            "drought_tolerant": "Water-Conserving Grain Transition",
            "cash_crop_swap": "High-Value Oilseed Diversification",
        }

        candidates.append(
            RotationCandidateSummary(
                crops=list(r.rotation.crops),
                crop_names=[CROPS_DB.get(c, {}).get("name", c.replace("_", " ").title()) for c in r.rotation.crops],
                rule=r.rotation.rule or ("current" if i == 0 else "alternative"),
                rule_label=rule_label_map.get(r.rotation.rule, r.rotation.rule or "Alternative Rotation"),
                is_current=(i == 0),
                is_best_fit=(i == best_idx),
                fit_score=round(float(s["fit"]["median"]), 1),
                fit_dry=round(float(s["fit"].get("median_dry", s["fit"]["median"])), 1),
                fit_normal=round(float(s["fit"].get("median_normal", s["fit"]["median"])), 1),
                fit_wet=round(float(s["fit"].get("median_wet", s["fit"]["median"])), 1),
                irrigation_demand_mm=round(irr_m, 1),
                irrigation_vs_now_pct=vs_now,
                yield_loss_pct=round(float(s["yield_loss"]["median"]) * 100.0, 1),
                yield_loss_p90_pct=round(float(s["yield_loss"]["p90"]) * 100.0, 1),
                bare_days_per_year=int(r.rotation.bare_days_per_year()),
                nitrogen_kg_ha=round(float(s["n_kg"]["median"]), 1),
                heat_stress_days=[
                    {
                        "crop": pl.crop_id,
                        "crop_name": CROPS_DB.get(pl.crop_id, {}).get("name", pl.crop_id),
                        "heat_days": round(float(s.get(f"heat_days_{j}", {}).get("median", 0.0)), 1),
                        "thr_c": CROPS_DB.get(pl.crop_id, {}).get("heat_thr_c", 35.0),
                    }
                    for j, pl in enumerate(r.rotation.plantings)
                    if CROPS_DB.get(pl.crop_id, {}).get("season") != "cover"
                ],
                radar_scores=radar_scores,
                normalized_priorities=radar_scores,
                why=[i18n.render(w, "en") for w in exp.why],
                evidence=[i18n.render(ev, "en") for ev in exp.evidence],
                benefits=[i18n.render(b, "en") for b in exp.benefits],
                tradeoffs=[i18n.render(t, "en") for t in exp.tradeoffs],
                gaps=[i18n.render(g, "en") for g in exp.gaps],
                risks=[i18n.render(rk, "en") for rk in exp.risks],
            )
        )

    # 10. AI Recommendation Executive Summary
    sb = summary_box(display, weights, "en", arid=is_arid(ctx))
    ai_recommendation_summary = {
        "title": sb.get("title", "Recommended Transition Strategy"),
        "best": sb.get("best", ""),
        "reason": sb.get("reason", ""),
        "tradeoff": sb.get("tradeoff", ""),
        "check": sb.get("check", ""),
        "caveat": sb.get("caveat", ""),
    }

    contracts_disclaimer = i18n.tr("g.contracts", "en")

    # 11. Legacy strategies for backward compatibility
    legacy_crop = current_rot[0] if current_rot[0] in ["cotton", "winter_wheat", "alfalfa", "mung_bean", "sorghum", "melons"] else "cotton"
    legacy_priority = payload.farmer_priority if payload.farmer_priority in ["conserve_water", "restore_soil", "maximize_yield"] else "conserve_water"
    legacy_strategies, legacy_steps, legacy_metrics = generate_multi_strategy_plan(
        current_crop=legacy_crop,
        salinity=payload.soil_salinity_level,
        priority=legacy_priority,
        climate=legacy_climate,
        lat=payload.lat,
        lon=payload.lon,
    )

    result = AnalyzeFieldResponse(
        coordinates={"lat": payload.lat, "lon": payload.lon},
        matched_region=matched_region or "Aral Sea Basin",
        climate=legacy_climate,
        regional_hazards=regional_hazards,
        rotation_plan=legacy_steps,
        impact_metrics=legacy_metrics,
        strategies=legacy_strategies,
        elevation_m=round(ctx.elevation_m, 1),
        kpis=kpis,
        soil_profile=soil_profile,
        gibs_layers=gibs_layers,
        water_balance_monthly=water_balance_monthly,
        candidates=candidates,
        ai_recommendation_summary=ai_recommendation_summary,
        contracts_disclaimer=contracts_disclaimer,
        low_yield_risk_note=low_yield_note,
        tied_criteria=tied,
    )
    ANALYSIS_CACHE[cache_key] = result
    return result
