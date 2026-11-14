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
    default_crop: CropId
    description: str
    modis_mean_ndvi: Optional[float] = Field(default=None, description="AppEEARS MODIS MOD13Q1 Mean NDVI")
    modis_peak_ndvi: Optional[float] = Field(default=None, description="AppEEARS MODIS MOD13Q1 Summer Peak NDVI")
    smap_soil_moisture_cm3: Optional[float] = Field(default=None, description="AppEEARS SMAP SPL3SMP-E Mean Volumetric Soil Moisture (cm3/cm3)")

class AnalyzeFieldRequest(BaseModel):
    lat: float = Field(..., ge=37.0, le=46.0)
    lon: float = Field(..., ge=55.0, le=74.0)
    current_crop: CropId
    soil_salinity_level: SalinityLevel
    farmer_priority: FarmerPriority
    climate_stress_scenario: bool = Field(default=False, description="Simulate +2.0°C summer warming and -20% precipitation (2035 projection)")

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

class AnalyzeFieldResponse(BaseModel):
    coordinates: Dict[str, float]
    matched_region: str
    climate: ClimateSummary
    regional_hazards: List[HazardEvent] = Field(default_factory=list)
    rotation_plan: List[SeasonStep]
    impact_metrics: ImpactMetrics
    strategies: List[RotationStrategy]
