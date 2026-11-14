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
  modis_mean_ndvi?: number;
  modis_peak_ndvi?: number;
  smap_soil_moisture_cm3?: number;
}

export interface MonthlyClimatePoint {
  month: string;
  t2m_c: number;
  prectotcorr_mm: number;
  gwettop_ratio: number;
  allsky_sw_dwn: number;
  t2m_min_c?: number;
}

export interface ClimateSummary {
  source: "nasa_power_live" | "local_fallback_cache";
  annual_precip_mm: number;
  mean_summer_temp_c: number;
  mean_soil_wetness: number;
  mean_solar_irradiance: number;
  aridity_index: string;
  monthly_series: MonthlyClimatePoint[];
  recent_12mo_precip_mm: number;
  precip_anomaly_pct: number;
  recent_summer_max_temp_c: number;
  temp_anomaly_c: number;
  spring_frost_risk?: boolean;
  autumn_frost_risk?: boolean;
  april_t2m_min_c?: number;
  october_t2m_min_c?: number;
}

export interface HazardEvent {
  title: string;
  category: string;
  date: string;
  distance_km: number;
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
  sowing_window: string;
  harvest_window: string;
  pest_and_cover_note?: string;
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

export interface RotationStrategy {
  id: string;
  title: string;
  subtitle: string;
  steps: SeasonStep[];
  metrics: ImpactMetrics;
  nasa_evidence: string[];
  information_gaps: string[];
  local_expert_review: string[];
}

export interface AnalyzeFieldResponse {
  coordinates: { lat: number; lon: number };
  matched_region: string;
  climate: ClimateSummary;
  regional_hazards: HazardEvent[];
  rotation_plan: SeasonStep[];
  impact_metrics: ImpactMetrics;
  strategies: RotationStrategy[];
}
