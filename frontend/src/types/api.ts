export type CropId = string;
export type SalinityLevel = "low" | "moderate" | "high" | "severe";
export type FarmerPriority = "conserve_water" | "restore_soil" | "maximize_yield" | "custom";

export interface CropTrait {
  id: string;
  name: string;
  uzbek_name: string;
  season: string;
  role: string;
  water_need_mm: number;
  heat_thr_c: number;
  salinity_tolerance: number;
  nitrogen_delta: number;
  sowing_window: string;
  harvest_window: string;
}

export interface GibsLayerMeta {
  key: string;
  layer_id: string;
  title: string;
  date: string;
  tile_url: string;
  max_zoom: number;
  units: string;
  gradient_css: string;
  vmin: number;
  vmax: number;
  ok: boolean;
  as_of?: string;
}

export interface AgroKpi {
  label: string;
  value: string;
  unit: string;
  detail: string;
  context: string;
  warn?: boolean;
}

export interface PresetLocation {
  id: string;
  name: string;
  region: string;
  lat: number;
  lon: number;
  default_salinity: SalinityLevel;
  default_crop: string;
  default_rotation?: string[];
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
  crop_id: string;
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

export interface PriorityWeights {
  water_saving: number;
  soil_om: number;
  nitrogen: number;
  erosion: number;
  forage: number;
  income: number;
}

export interface WhatIfScenario {
  rain_pct: number;
  temp_c: number;
  supply: number;
}

export interface AnalyzeFieldRequest {
  lat: number;
  lon: number;
  current_crop?: string;
  current_rotation?: string[];
  soil_salinity_level?: SalinityLevel;
  farmer_priority?: FarmerPriority;
  priorities?: PriorityWeights;
  scenario?: WhatIfScenario;
  climate_stress_scenario?: boolean;
}

export interface HeatStressItem {
  crop: string;
  crop_name: string;
  heat_days: number;
  thr_c: number;
}

export interface RotationCandidateSummary {
  crops: string[];
  crop_names: string[];
  rule: string;
  rule_label: string;
  is_current: boolean;
  is_best_fit: boolean;
  fit_score: number;
  fit_dry: number;
  fit_normal: number;
  fit_wet: number;
  irrigation_demand_mm: number;
  irrigation_vs_now_pct?: number | null;
  yield_loss_pct: number;
  yield_loss_p90_pct: number;
  bare_days_per_year: number;
  nitrogen_kg_ha: number;
  heat_stress_days: HeatStressItem[];
  radar_scores: Record<string, number>;
  normalized_priorities: Record<string, number>;
  why: string[];
  evidence: string[];
  benefits: string[];
  tradeoffs: string[];
  gaps: string[];
  risks: string[];
}

export interface SoilProfile {
  clay_pct?: number | null;
  silt_pct?: number | null;
  sand_pct?: number | null;
  bulk_density?: number | null;
  organic_carbon?: number | null;
  ph?: number | null;
  texture?: string | null;
  nitrogen?: number | null;
  source: string;
}

export interface MonthlyWaterBalance {
  month: string;
  rain_mm: number;
  et0_mm: number;
  deficit_mm: number;
}

export interface AnalyzeFieldResponse {
  coordinates: { lat: number; lon: number };
  matched_region: string;
  climate: ClimateSummary;
  regional_hazards: HazardEvent[];
  rotation_plan: SeasonStep[];
  impact_metrics: ImpactMetrics;
  strategies: RotationStrategy[];
  
  // Advanced scientific extensions
  elevation_m?: number;
  kpis?: AgroKpi[];
  soil_profile?: SoilProfile | null;
  gibs_layers?: Record<string, GibsLayerMeta>;
  water_balance_monthly?: MonthlyWaterBalance[];
  candidates?: RotationCandidateSummary[];
  ai_recommendation_summary?: Record<string, string>;
  contracts_disclaimer?: string;
  low_yield_risk_note?: string | null;
  tied_criteria?: Record<string, boolean>;
}
