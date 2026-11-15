from typing import Any, Dict, List, Literal, Optional, Tuple
from pydantic import BaseModel, Field

CropId = str  # Supports all 20 crops
SalinityLevel = Literal["low", "moderate", "high", "severe"]
FarmerPriority = Literal["conserve_water", "restore_soil", "maximize_yield", "custom"]

class CropTrait(BaseModel):
    id: str
    name: str
    uzbek_name: str
    season: str
    role: str
    water_need_mm: int
    heat_thr_c: float
    salinity_tolerance: int
    nitrogen_delta: int
    sowing_window: str = ""
    harvest_window: str = ""

class GibsLayerMeta(BaseModel):
    key: str
    layer_id: str
    title: str
    date: str
    tile_url: str
    max_zoom: int
    units: str
    gradient_css: str
    vmin: float
    vmax: float
    ok: bool = True
    as_of: str = ""

class AgroKpi(BaseModel):
    label: str
    value: str
    unit: str
    detail: str
    context: str
    warn: bool = False

class MonthlyClimatePoint(BaseModel):
    month: str
    t2m_c: float = Field(..., description="Average Temperature at 2 Meters (C)")
    prectotcorr_mm: float = Field(..., description="Monthly Precipitation (mm)")
    gwettop_ratio: float = Field(..., description="Surface Soil Wetness (0.0 to 1.0)")
    allsky_sw_dwn: float = Field(..., description="All Sky Surface Shortwave Downward Irradiance (kWh/m^2/day)")
    t2m_min_c: Optional[float] = Field(default=None, description="Minimum Temperature at 2 Meters (C)")

class ClimateSummary(BaseModel):
    source: Literal["nasa_power_live", "local_fallback_cache"]
    annual_precip_mm: float
    mean_summer_temp_c: float
    mean_soil_wetness: float
    mean_solar_irradiance: float
    aridity_index: str
    monthly_series: List[MonthlyClimatePoint]
    recent_12mo_precip_mm: float = Field(..., description="Trailing 12-month precipitation total (mm)")
    precip_anomaly_pct: float = Field(..., description="Precipitation anomaly vs climatological baseline (%)")
    recent_summer_max_temp_c: float = Field(..., description="Recent summer maximum temperature (C)")
    temp_anomaly_c: float = Field(..., description="Temperature anomaly vs climatological baseline (C)")
    spring_frost_risk: bool = Field(default=False, description="April minimum temperature < 2.0°C frost risk")
    autumn_frost_risk: bool = Field(default=False, description="October minimum temperature < 2.0°C frost risk")
    april_t2m_min_c: Optional[float] = Field(default=None, description="April minimum temperature (C)")
    october_t2m_min_c: Optional[float] = Field(default=None, description="October minimum temperature (C)")

class HazardEvent(BaseModel):
    title: str
    category: str
    date: str
    distance_km: float

class PresetLocation(BaseModel):
    id: str
    name: str
    region: str
    lat: float
    lon: float
    default_salinity: SalinityLevel
    default_crop: str
    default_rotation: List[str] = Field(default_factory=list)
    description: str
    modis_mean_ndvi: Optional[float] = Field(default=None, description="AppEEARS MODIS MOD13Q1 Mean NDVI")
    modis_peak_ndvi: Optional[float] = Field(default=None, description="AppEEARS MODIS MOD13Q1 Summer Peak NDVI")
    smap_soil_moisture_cm3: Optional[float] = Field(default=None, description="AppEEARS SMAP SPL3SMP-E Mean Volumetric Soil Moisture (cm3/cm3)")

class PriorityWeights(BaseModel):
    water_saving: float = 5.0
    soil_om: float = 5.0
    nitrogen: float = 5.0
    erosion: float = 5.0
    forage: float = 5.0
    income: float = 5.0

class WhatIfScenario(BaseModel):
    rain_pct: int = 0
    temp_c: float = 0.0
    supply: float = 1.0  # 0.4 to 1.0

class AnalyzeFieldRequest(BaseModel):
    lat: float = Field(..., ge=35.0, le=70.0)
    lon: float = Field(..., ge=-180.0, le=180.0)
    current_crop: Optional[str] = "cotton"
    current_rotation: Optional[List[str]] = None
    soil_salinity_level: SalinityLevel = "severe"
    farmer_priority: FarmerPriority = "conserve_water"
    priorities: Optional[PriorityWeights] = None
    scenario: Optional[WhatIfScenario] = None
    climate_stress_scenario: bool = Field(default=False, description="Simulate +2.0°C summer warming and -20% precipitation")

class SeasonStep(BaseModel):
    year: int
    season_label: str
    crop_id: str
    crop_name: str
    uzbek_name: str
    water_need_mm: int
    irrigation_deficit_mm: int
    nitrogen_delta: int
    salinity_tolerance: int
    heat_tolerance: int
    suitability_score: float
    agronomic_rationale: str
    sowing_window: str = Field(..., description="Recommended sowing window in Uzbekistan")
    harvest_window: str = Field(..., description="Expected harvest window in Uzbekistan")
    pest_and_cover_note: str = Field(default="", description="Bare-field soil protection & pest/disease break agronomic insight")

class ImpactMetrics(BaseModel):
    baseline_3yr_water_mm: int
    plan_3yr_water_mm: int
    water_saved_mm: int
    water_saved_pct: float
    net_nitrogen_score: int
    soil_restoration_index: float
    risk_warnings: List[str]

class RotationStrategy(BaseModel):
    id: str
    title: str
    subtitle: str
    steps: List[SeasonStep]
    metrics: ImpactMetrics
    nasa_evidence: List[str]
    information_gaps: List[str]
    local_expert_review: List[str]

class RotationCandidateSummary(BaseModel):
    crops: List[str]
    crop_names: List[str]
    rule: str
    rule_label: str
    is_current: bool
    is_best_fit: bool
    fit_score: float
    fit_dry: float
    fit_normal: float
    fit_wet: float
    irrigation_demand_mm: float
    irrigation_vs_now_pct: Optional[float] = None
    yield_loss_pct: float
    yield_loss_p90_pct: float
    bare_days_per_year: int
    nitrogen_kg_ha: float
    heat_stress_days: List[Dict[str, Any]] = Field(default_factory=list)
    radar_scores: Dict[str, float] = Field(default_factory=dict)
    normalized_priorities: Dict[str, float] = Field(default_factory=dict)
    why: List[str] = Field(default_factory=list)
    evidence: List[str] = Field(default_factory=list)
    benefits: List[str] = Field(default_factory=list)
    tradeoffs: List[str] = Field(default_factory=list)
    gaps: List[str] = Field(default_factory=list)
    risks: List[str] = Field(default_factory=list)

class SoilProfile(BaseModel):
    clay_pct: Optional[float] = None
    silt_pct: Optional[float] = None
    sand_pct: Optional[float] = None
    bulk_density: Optional[float] = None
    organic_carbon: Optional[float] = None
    ph: Optional[float] = None
    texture: Optional[str] = None
    nitrogen: Optional[float] = None
    source: str = "ISRIC SoilGrids 250m"

class MonthlyWaterBalance(BaseModel):
    month: str
    rain_mm: float
    et0_mm: float
    deficit_mm: float

class AnalyzeFieldResponse(BaseModel):
    coordinates: Dict[str, float]
    matched_region: str
    climate: ClimateSummary
    regional_hazards: List[HazardEvent] = Field(default_factory=list)
    rotation_plan: List[SeasonStep] = Field(default_factory=list)
    impact_metrics: ImpactMetrics
    strategies: List[RotationStrategy] = Field(default_factory=list)
    
    # Advanced Scientific Fields (from fieldshift engine)
    elevation_m: float = 0.0
    kpis: List[AgroKpi] = Field(default_factory=list)
    soil_profile: Optional[SoilProfile] = None
    gibs_layers: Dict[str, GibsLayerMeta] = Field(default_factory=dict)
    water_balance_monthly: List[MonthlyWaterBalance] = Field(default_factory=list)
    candidates: List[RotationCandidateSummary] = Field(default_factory=list)
    ai_recommendation_summary: Dict[str, str] = Field(default_factory=dict)
    contracts_disclaimer: str = ""
    low_yield_risk_note: Optional[str] = None
    tied_criteria: Dict[str, bool] = Field(default_factory=dict)
