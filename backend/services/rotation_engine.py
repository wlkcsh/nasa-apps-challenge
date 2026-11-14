import sys
from pathlib import Path
from typing import Any, Dict, List, Literal, Optional, Tuple

BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from models import (
    ClimateSummary,
    CropId,
    FarmerPriority,
    ImpactMetrics,
    RotationStrategy,
    SalinityLevel,
    SeasonStep,
)
from services.nasa_power import find_nearest_preset

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
        "sowing_window": "Apr 5 – Apr 25",
        "harvest_window": "Sep 15 – Oct 25",
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
        "sowing_window": "Oct 1 – Nov 1",
        "harvest_window": "Jun 10 – Jul 5",
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
        "sowing_window": "Mar 1 – Mar 25",
        "harvest_window": "May – Oct (4-5 Cuts)",
    },
    "mung_bean": {
        "name": "Mung Bean",
        "uzbek_name": "Mosh",
        "water_need_mm": 320,
        "salinity_tolerance": 2,
        "nitrogen_impact": 2,
        "heat_tolerance": 4,
        "yield_value": 4,
        "role": "Short-Season Legume & Soil Restorer",
        "sowing_window": "Jun 15 – Jul 5 (Post-Wheat)",
        "harvest_window": "Sep 10 – Oct 5",
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
        "sowing_window": "Apr 15 – May 15",
        "harvest_window": "Aug 25 – Sep 25",
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
        "sowing_window": "Apr 10 – May 20",
        "harvest_window": "Jul 15 – Sep 15",
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
    priority: Literal["conserve_water", "restore_soil", "maximize_yield", "balanced"],
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

    # Priority weighting
    if priority == "conserve_water":
        base = 0.42 * water_score + 0.23 * salinity_score + 0.15 * soil_score + 0.12 * heat_score + 0.08 * yield_score
    elif priority == "restore_soil":
        base = 0.45 * soil_score + 0.22 * salinity_score + 0.15 * water_score + 0.10 * heat_score + 0.08 * yield_score
    elif priority == "maximize_yield":
        base = 0.35 * yield_score + 0.25 * salinity_score + 0.18 * soil_score + 0.12 * water_score + 0.10 * heat_score
    else:  # balanced
        base = 0.28 * water_score + 0.28 * soil_score + 0.24 * salinity_score + 0.12 * heat_score + 0.08 * yield_score

    # -------------------------------------------------------------
    # Agronomic & Biological Rules
    # -------------------------------------------------------------
    # Rule 1: Severe/High Salinity Mung Bean Veto (prevents osmotic shock in Nukus/Bukhara unless desalinized by Alfalfa)
    if crop_id == "mung_bean" and salinity in ("high", "severe") and previous_crop != "alfalfa":
        base -= 55.0

    # Rule 2: Post-Wheat Double-Crop Synergy ("Takroriy Mosh")
    if crop_id == "mung_bean" and previous_crop == "winter_wheat" and salinity in ("low", "moderate"):
        base += 22.0

    # Rule 3: 2-Year Alfalfa Bio-Drainage Continuity vs Monoculture Penalty
    if crop_id == previous_crop:
        if crop_id == "alfalfa" and year_index == 2 and salinity in ("high", "severe"):
            # Deep taproot perennial establishes biological drainage and desalinization
            base += 14.0
        elif crop_id in ("cotton", "winter_wheat", "sorghum", "melons"):
            base -= 45.0
        else:
            base -= 20.0

    # Biological nitrogen recovery following a depleting crop
    if year_index == 2 and CROP_KB[previous_crop]["nitrogen_impact"] < 0 and crop["nitrogen_impact"] > 0:
        base += 18.0

    return round(min(max(base, 5.0), 99.0), 1)

PEST_AND_COVER_KB: Dict[CropId, Dict[str, str]] = {
    "mung_bean": {
        "default": "Protects bare summer fields with dense groundcover, suppressing weed germination and breaking cereal Fusarium foot-rot cycles.",
        "post_wheat": "Takroriy ekin double-crop canopy covers bare June wheat stubble, halting wind erosion and breaking Fusarium root rot before autumn.",
    },
    "alfalfa": {
        "default": "Provides multi-year continuous root canopy that halts bare-soil evaporation; non-host root exudates break cotton bollworm and Verticillium wilt cycles.",
    },
    "sorghum": {
        "default": "Dense fibrous roots bind loose saline sand during July arid winds; allelopathic sorgoleone exudates suppress parasitic weed seeds and wilt fungi.",
    },
    "winter_wheat": {
        "default": "Winter vegetative shield prevents cold-season topsoil blowing and snow crusting; early summer harvest avoids peak bollworm pressure.",
    },
    "melons": {
        "default": "Broad-leaf trailing vine creates rapid soil shading in late spring, conserving residual moisture; non-host rotation halts cereal nematode buildup.",
    },
    "cotton": {
        "default": "Rotational break beneficiary: following legumes/forage clears pathogen pressure, significantly lowering bollworm and seedling damping-off losses.",
        "monoculture": "Monoculture liability: leaves fields bare to winter winds while allowing Verticillium dahliae microsclerotia and bollworm pupae to overwinter in soil.",
    },
}

def _get_pest_and_cover_note(crop_id: CropId, prev_crop: CropId) -> str:
    kb = PEST_AND_COVER_KB.get(crop_id, {})
    if crop_id == "mung_bean" and prev_crop == "winter_wheat":
        return kb.get("post_wheat", kb.get("default", ""))
    if crop_id == "cotton" and prev_crop == "cotton":
        return kb.get("monoculture", kb.get("default", ""))
    return kb.get("default", "")

def _generate_strategy_steps(
    start_crop: CropId,
    salinity: SalinityLevel,
    priority: Literal["conserve_water", "restore_soil", "maximize_yield", "balanced"],
    climate: ClimateSummary,
) -> List[SeasonStep]:
    steps: List[SeasonStep] = []
    prev = start_crop
    season_titles = [
        "Year 1: Monoculture Break & Stress Adaptation",
        "Year 2: Biological Nitrogen Fixation & Leaching",
        "Year 3: High-Efficiency Cash/Cereal Recovery",
    ]
    all_crops: List[CropId] = ["cotton", "winter_wheat", "alfalfa", "mung_bean", "sorghum", "melons"]

    for yr in (1, 2, 3):
        scored = [
            (cid, score_crop(cid, prev, salinity, priority, climate, yr))
            for cid in all_crops
        ]
        scored.sort(key=lambda x: x[1], reverse=True)
        best_cid, best_score = scored[0]
        c_info = CROP_KB[best_cid]

        deficit_mm = max(0, int(round(c_info["water_need_mm"] - climate.annual_precip_mm)))
        rationale = (
            f"Replaces {CROP_KB[prev]['name']} with {c_info['name']} ({c_info['role']}). "
            f"Requires {c_info['water_need_mm']} mm water ({deficit_mm} mm irrigation deficit vs. "
            f"{climate.annual_precip_mm} mm rainfall), provides {c_info['nitrogen_impact']:+d} N-balance, "
            f"and matches {climate.mean_summer_temp_c}°C peak summer temperatures."
        )
        pest_note = _get_pest_and_cover_note(best_cid, prev)

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
                sowing_window=c_info["sowing_window"],
                harvest_window=c_info["harvest_window"],
                pest_and_cover_note=pest_note,
            )
        )
        prev = best_cid

    return steps

def _generate_baseline_steps(current_crop: CropId, climate: ClimateSummary) -> List[SeasonStep]:
    """Status Quo baseline sequence: Cotton-Wheat-Cotton if cotton, else 3-year monoculture."""
    if current_crop == "cotton":
        crop_seq: List[CropId] = ["cotton", "winter_wheat", "cotton"]
    else:
        crop_seq = [current_crop, current_crop, current_crop]

    labels = [
        "Year 1: Current Monoculture Practice",
        "Year 2: Status Quo Secondary Planting",
        "Year 3: Continued Monoculture Depletion",
    ]

    steps: List[SeasonStep] = []
    for yr, cid in enumerate(crop_seq, start=1):
        c_info = CROP_KB[cid]
        deficit_mm = max(0, int(round(c_info["water_need_mm"] - climate.annual_precip_mm)))
        prev_c = current_crop if yr == 1 else crop_seq[yr - 2]
        pest_note = _get_pest_and_cover_note(cid, prev_c)
        steps.append(
            SeasonStep(
                year=yr,
                season_label=labels[yr - 1],
                crop_id=cid,
                crop_name=c_info["name"],
                uzbek_name=c_info["uzbek_name"],
                water_need_mm=c_info["water_need_mm"],
                irrigation_deficit_mm=deficit_mm,
                nitrogen_delta=c_info["nitrogen_impact"],
                salinity_tolerance=c_info["salinity_tolerance"],
                heat_tolerance=c_info["heat_tolerance"],
                suitability_score=48.0 if yr == 1 else 32.0,
                agronomic_rationale=(
                    f"Baseline practice maintains {c_info['name']}. Intensive irrigation requirement "
                    f"({c_info['water_need_mm']} mm/yr) drives persistent soil humus depletion "
                    f"({c_info['nitrogen_impact']:+d} N-balance) and escalates shallow groundwater salinity risk."
                ),
                sowing_window=c_info["sowing_window"],
                harvest_window=c_info["harvest_window"],
                pest_and_cover_note=pest_note,
            )
        )
    return steps

def _generate_warnings(salinity: SalinityLevel, climate: ClimateSummary) -> List[str]:
    warnings: List[str] = []
    # Alpine Cold Zone Check (GDD check)
    if climate.mean_summer_temp_c < 20.0:
        warnings.append(
            f"ALPINE COLD ZONE ALERT ({climate.mean_summer_temp_c}°C Summer Mean): Growing Degree Days (GDD) are insufficient for Cotton or Melons; cold-tolerant cereals and perennial forage grasses recommended."
        )
    if salinity in ("high", "severe"):
        warnings.append(
            f"HIGH SALINITY ALERT ({salinity.upper()}): Conduct winter pre-irrigation flushing (1,200 m³/ha) and prioritize deep-root bio-drainage (Alfalfa/Sorghum)."
        )
    if climate.mean_summer_temp_c >= 29.0 or climate.recent_summer_max_temp_c >= 38.0:
        warnings.append(
            f"THERMAL STRESS WARNING: NASA POWER indicates {climate.mean_summer_temp_c}°C JJA mean (peak {climate.recent_summer_max_temp_c}°C). Schedule night irrigation and utilize residue mulching."
        )
    if climate.mean_soil_wetness <= 0.28 or climate.precip_anomaly_pct <= -10.0:
        warnings.append(
            f"PRECIPITATION & MOISTURE DEFICIT ({climate.precip_anomaly_pct:+.1f}% anomaly, GWETTOP={climate.mean_soil_wetness}): Transition from open furrow flooding to surge furrow or drip irrigation."
        )

    # Spring/Autumn Frost Risk & Timing Advisory for Cotton & Melons
    if climate.spring_frost_risk or (climate.april_t2m_min_c is not None and climate.april_t2m_min_c < 2.0):
        t_apr = f"{climate.april_t2m_min_c:.1f}°C" if climate.april_t2m_min_c is not None else "< 2.0°C"
        warnings.append(
            f"SPRING FROST TIMING ADVISORY (April T2M_MIN = {t_apr}): NASA POWER registers sub-2°C cold snaps. Delay early Cotton and Melon sowing until after April 15–20 or deploy protective plastic mulch (plenka ostida) to avoid seedling chilling mortality."
        )
    if climate.autumn_frost_risk or (climate.october_t2m_min_c is not None and climate.october_t2m_min_c < 2.0):
        t_oct = f"{climate.october_t2m_min_c:.1f}°C" if climate.october_t2m_min_c is not None else "< 2.0°C"
        warnings.append(
            f"AUTUMN FROST RISK (October T2M_MIN = {t_oct}): Late-season freezing temperatures threaten unharvested melons and immature cotton bolls; ensure harvest completion before October 5."
        )

    if not warnings:
        warnings.append(
            "FAVORABLE AGRO-CLIMATE: Conditions support double-cropping Mung Bean (Mosh) immediately after June Winter Wheat harvest."
        )
    return warnings

def _build_rubric_fields(
    strategy_name: str,
    climate: ClimateSummary,
    salinity: SalinityLevel,
    preset_info: Optional[Dict[str, Any]] = None,
) -> Tuple[List[str], List[str], List[str]]:
    p_term = "surplus" if climate.precip_anomaly_pct > 0 else "deficit"
    evidence = [
        f"NASA POWER Climatology records {climate.annual_precip_mm} mm annual rainfall and {climate.mean_summer_temp_c}°C summer mean ({climate.aridity_index}).",
        f"NASA POWER Daily 12-Month Anomaly detects {climate.precip_anomaly_pct:+.1f}% precipitation {p_term} ({climate.recent_12mo_precip_mm} mm trailing) and {climate.recent_summer_max_temp_c}°C peak heat.",
    ]
    if preset_info and "smap_soil_moisture_cm3" in preset_info:
        p_name = preset_info.get("name", "Regional")
        smap_sm = preset_info.get("smap_soil_moisture_cm3", 0.139)
        modis_peak = preset_info.get("modis_peak_ndvi", 0.341)
        modis_mean = preset_info.get("modis_mean_ndvi", 0.218)
        evidence.append(
            f"NASA AppEEARS Earthdata baseline ({p_name}) establishes {smap_sm} cm³/cm³ SMAP volumetric soil moisture and MODIS NDVI of {modis_peak} peak ({modis_mean} seasonal mean) confirming severe vegetative stress."
        )
    else:
        evidence.append(
            f"NASA SMAP/MODIS surface soil moisture (GWETTOP={climate.mean_soil_wetness:.2f}) identifies critical salt-capillary risk under high evapotranspiration."
        )

    gaps = [
        "Regional Data Availability: High-resolution US datasets in the NASA catalog (USDA SSURGO, Cropland Data Layer, OpenET) do not cover Central Asia; Field Shift bridges this gap using global NASA POWER, SMAP, MODIS, and FAO GAEZ v4 agro-ecological suitability rules paired with farmer-reported soil salinity (ECe).",
        "Spatial Resolution: ~50 km NASA POWER grid cells do not capture sub-kilometer irrigation canal leakage or micro-topography.",
        "Sensor Depth Limits: Surface satellite radiometry (0–5 cm GWETTOP) does not measure 1-meter root-zone ECe salinity or water table fluctuations.",
        "Water Administration: Canal Water User Association (WUA) rotational schedules and volumetric quotas must be verified locally.",
    ]
    reviews = [
        "Consult local district Council of Farmers (Fermerlar Kengashi) to verify certified seed availability and local agronomic norms.",
        f"Perform pre-planting root-zone ECe test (0-30 cm) to calibrate leaching requirements for {salinity.upper()} salinity.",
        "Coordinate with local basin irrigation administration (BISA) on water delivery calendar before field desalinization flushing.",
    ]
    return evidence, gaps, reviews

def generate_multi_strategy_plan(
    current_crop: CropId,
    salinity: SalinityLevel,
    priority: FarmerPriority,
    climate: ClimateSummary,
    lat: float = 42.4602,
    lon: float = 59.6166,
) -> Tuple[List[RotationStrategy], List[SeasonStep], ImpactMetrics]:
    preset_info = find_nearest_preset(lat, lon)

    # Baseline water computation: 900+550+900 (2350 mm) if cotton, else 3 years of current crop
    if current_crop == "cotton":
        baseline_water = 900 + 550 + 900
    else:
        baseline_water = CROP_KB[current_crop]["water_need_mm"] * 3

    common_warnings = _generate_warnings(salinity, climate)

    # -------------------------------------------------------------
    # 1. Strategy 1: Status Quo Baseline
    # -------------------------------------------------------------
    base_steps = _generate_baseline_steps(current_crop, climate)
    base_plan_water = sum(s.water_need_mm for s in base_steps)
    base_net_n = sum(s.nitrogen_delta for s in base_steps)
    base_metrics = ImpactMetrics(
        baseline_3yr_water_mm=baseline_water,
        plan_3yr_water_mm=base_plan_water,
        water_saved_mm=0,
        water_saved_pct=0.0,
        net_nitrogen_score=base_net_n,
        soil_restoration_index=32.0,
        risk_warnings=[
            "STATUS QUO WARNING: Continued monoculture risks accelerating secondary salinization, soil hardpan formation, and heavy groundwater depletion.",
            *common_warnings[:1],
        ],
    )
    b_ev, b_gaps, b_rev = _build_rubric_fields("Existing Baseline", climate, salinity, preset_info)
    strat_baseline = RotationStrategy(
        id="baseline",
        title="Existing Baseline (Status Quo)",
        subtitle="Traditional Uzbekistan Monoculture / Depleting Sequence",
        steps=base_steps,
        metrics=base_metrics,
        nasa_evidence=b_ev,
        information_gaps=b_gaps,
        local_expert_review=b_rev,
    )

    # -------------------------------------------------------------
    # 2. Strategy 2: Priority-Optimized Plan (Recommended)
    # -------------------------------------------------------------
    p_steps = _generate_strategy_steps(current_crop, salinity, priority, climate)
    p_plan_water = sum(s.water_need_mm for s in p_steps)
    p_water_saved = baseline_water - p_plan_water
    p_water_saved_pct = round((p_water_saved / baseline_water) * 100.0, 1)
    p_net_n = sum(s.nitrogen_delta for s in p_steps)
    p_restoration = round(min(100.0, max(20.0, 55.0 + p_net_n * 9.0 + (p_water_saved_pct * 0.3))), 1)

    p_metrics = ImpactMetrics(
        baseline_3yr_water_mm=baseline_water,
        plan_3yr_water_mm=p_plan_water,
        water_saved_mm=p_water_saved,
        water_saved_pct=p_water_saved_pct,
        net_nitrogen_score=p_net_n,
        soil_restoration_index=p_restoration,
        risk_warnings=common_warnings,
    )
    p_ev, p_gaps, p_rev = _build_rubric_fields("Priority-Optimized Plan", climate, salinity, preset_info)
    strat_priority = RotationStrategy(
        id="recommended",
        title="Priority-Optimized Plan",
        subtitle=f"NASA Algorithm Optimization for {priority.replace('_', ' ').title()}",
        steps=p_steps,
        metrics=p_metrics,
        nasa_evidence=p_ev,
        information_gaps=p_gaps,
        local_expert_review=p_rev,
    )

    # -------------------------------------------------------------
    # 3. Strategy 3: Balanced Climate-Resilient Plan
    # -------------------------------------------------------------
    bal_steps = _generate_strategy_steps(current_crop, salinity, "balanced", climate)
    bal_plan_water = sum(s.water_need_mm for s in bal_steps)
    bal_water_saved = baseline_water - bal_plan_water
    bal_water_saved_pct = round((bal_water_saved / baseline_water) * 100.0, 1)
    bal_net_n = sum(s.nitrogen_delta for s in bal_steps)
    bal_restoration = round(min(100.0, max(20.0, 55.0 + bal_net_n * 9.0 + (bal_water_saved_pct * 0.3))), 1)

    bal_metrics = ImpactMetrics(
        baseline_3yr_water_mm=baseline_water,
        plan_3yr_water_mm=bal_plan_water,
        water_saved_mm=bal_water_saved,
        water_saved_pct=bal_water_saved_pct,
        net_nitrogen_score=bal_net_n,
        soil_restoration_index=bal_restoration,
        risk_warnings=common_warnings,
    )
    bal_ev, bal_gaps, bal_rev = _build_rubric_fields("Balanced Resilience", climate, salinity, preset_info)
    strat_balanced = RotationStrategy(
        id="balanced",
        title="Balanced Resilience",
        subtitle="Harmonized Water Conservation, Soil Regeneration & Economic Margin",
        steps=bal_steps,
        metrics=bal_metrics,
        nasa_evidence=bal_ev,
        information_gaps=bal_gaps,
        local_expert_review=bal_rev,
    )

    strategies = [strat_baseline, strat_priority, strat_balanced]
    return strategies, strat_priority.steps, strat_priority.metrics
