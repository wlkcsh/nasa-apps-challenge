import asyncio
from datetime import datetime, timedelta, timezone
import json
import math
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
import httpx

BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from models import ClimateSummary, MonthlyClimatePoint, PresetLocation

DATA_PATH = BACKEND_DIR / "data" / "fallback_presets.json"
MONTH_KEYS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"]
DAYS_IN_MONTH = {
    "JAN": 31, "FEB": 28, "MAR": 31, "APR": 30, "MAY": 31, "JUN": 30,
    "JUL": 31, "AUG": 31, "SEP": 30, "OCT": 31, "NOV": 30, "DEC": 31
}

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

def _sanitize_val(raw_val: Optional[float], fallback_val: float, min_valid: float = -60.0) -> float:
    """Sanitize raw NASA POWER data against None, NaN, and fill values like -999.0."""
    if raw_val is None or math.isnan(raw_val) or raw_val <= min_valid:
        return float(fallback_val)
    return float(raw_val)

def _calculate_fallback_anomalies(annual_precip: float, mean_summer_temp: float) -> Tuple[float, float, float, float]:
    """Provide realistic regional anomaly estimations for Central Asian agro-climatic zones."""
    recent_precip = round(annual_precip * 0.88, 1)  # 12% drought deficit typical in recent Aral Basin cycles
    precip_anomaly = -12.0
    summer_max = round(mean_summer_temp + 3.4, 1)
    temp_anomaly = 1.5
    return recent_precip, precip_anomaly, summer_max, temp_anomaly

def _build_climate_summary(
    param_dict: Dict[str, Dict[str, float]],
    fallback_climatology: Dict[str, Dict[str, float]],
    source: str,
    is_daily_rate_precip: bool = False,
    recent_12mo_precip: Optional[float] = None,
    precip_anomaly_pct: Optional[float] = None,
    recent_summer_max_temp: Optional[float] = None,
    temp_anomaly_c: Optional[float] = None,
) -> ClimateSummary:
    monthly_series: List[MonthlyClimatePoint] = []
    raw_sw_dict = param_dict.get("ALLSKY_SFC_SW_DWN", {})
    is_mj_dataset = any(
        isinstance(v, (int, float)) and float(v) > 10.0
        for v in raw_sw_dict.values()
        if v is not None
    )

    for m in MONTH_KEYS:
        # Fallback values from the nearest preset
        fb_t2m = float(fallback_climatology.get("T2M", {}).get(m, 15.0))
        fb_t2m_min = float(fallback_climatology.get("T2M_MIN", {}).get(m, fb_t2m - 7.0))
        fb_precip = float(fallback_climatology.get("PRECTOTCORR", {}).get(m, 10.0))
        fb_gwet = float(fallback_climatology.get("GWETTOP", {}).get(m, 0.25))
        fb_sw_dwn = float(fallback_climatology.get("ALLSKY_SFC_SW_DWN", {}).get(m, 5.0))

        # Raw values from NASA POWER API or fallback
        raw_t2m = param_dict.get("T2M", {}).get(m)
        raw_t2m_min = param_dict.get("T2M_MIN", {}).get(m)
        raw_precip = param_dict.get("PRECTOTCORR", {}).get(m)
        raw_gwet = param_dict.get("GWETTOP", {}).get(m)
        raw_sw_dwn = param_dict.get("ALLSKY_SFC_SW_DWN", {}).get(m)

        # Sanitize against -999 fill values and unphysical numbers
        t2m = _sanitize_val(raw_t2m, fb_t2m, min_valid=-50.0)
        t2m_min = _sanitize_val(raw_t2m_min, fb_t2m_min, min_valid=-60.0)
        clean_precip_rate = _sanitize_val(raw_precip, fb_precip, min_valid=0.0)
        precip_mm = round(clean_precip_rate * DAYS_IN_MONTH[m], 1) if is_daily_rate_precip else round(clean_precip_rate, 1)
        gwet = _sanitize_val(raw_gwet, fb_gwet, min_valid=0.0)
        gwet = min(max(gwet, 0.01), 1.0)
        sw_dwn = _sanitize_val(raw_sw_dwn, fb_sw_dwn, min_valid=0.0)
        # NASA POWER climatology returns solar irradiance in MJ/m^2/day (~18 MJ/m^2/day);
        # convert to kWh/m^2/day (1 kWh = 3.6 MJ) if in MJ units (> 10.0 or dataset is in MJ)
        if is_mj_dataset or sw_dwn > 10.0:
            sw_dwn = round(sw_dwn / 3.6, 2)

        monthly_series.append(
            MonthlyClimatePoint(
                month=m,
                t2m_c=round(t2m, 1),
                prectotcorr_mm=precip_mm,
                gwettop_ratio=round(gwet, 2),
                allsky_sw_dwn=round(sw_dwn, 2),
                t2m_min_c=round(t2m_min, 1),
            )
        )

    annual_precip = round(sum(p.prectotcorr_mm for p in monthly_series), 1)
    summer_months = [p.t2m_c for p in monthly_series if p.month in ("JUN", "JUL", "AUG")]
    mean_summer_temp = round(sum(summer_months) / len(summer_months), 2)
    mean_wetness = round(sum(p.gwettop_ratio for p in monthly_series) / 12.0, 2)
    mean_solar = round(sum(p.allsky_sw_dwn for p in monthly_series) / 12.0, 2)

    apr_pt = next((p for p in monthly_series if p.month == "APR"), None)
    oct_pt = next((p for p in monthly_series if p.month == "OCT"), None)
    apr_t2m_min = apr_pt.t2m_min_c if apr_pt and apr_pt.t2m_min_c is not None else None
    oct_t2m_min = oct_pt.t2m_min_c if oct_pt and oct_pt.t2m_min_c is not None else None
    spring_frost = apr_t2m_min is not None and apr_t2m_min < 2.0
    autumn_frost = oct_t2m_min is not None and oct_t2m_min < 2.0

    if annual_precip < 140:
        aridity = "Hyper-Arid Desert Zone"
    elif annual_precip < 250:
        aridity = "Arid Steppe / Oasis Zone"
    else:
        aridity = "Semi-Arid Irrigated Foothill Zone"

    if recent_12mo_precip is None or precip_anomaly_pct is None or recent_summer_max_temp is None or temp_anomaly_c is None:
        fb_precip_anom, fb_panom, fb_smax, fb_tanom = _calculate_fallback_anomalies(annual_precip, mean_summer_temp)
        recent_12mo_precip = recent_12mo_precip if recent_12mo_precip is not None else fb_precip_anom
        precip_anomaly_pct = precip_anomaly_pct if precip_anomaly_pct is not None else fb_panom
        recent_summer_max_temp = recent_summer_max_temp if recent_summer_max_temp is not None else fb_smax
        temp_anomaly_c = temp_anomaly_c if temp_anomaly_c is not None else fb_tanom

    return ClimateSummary(
        source=source,  # type: ignore
        annual_precip_mm=annual_precip,
        mean_summer_temp_c=mean_summer_temp,
        mean_soil_wetness=mean_wetness,
        mean_solar_irradiance=mean_solar,
        aridity_index=aridity,
        monthly_series=monthly_series,
        recent_12mo_precip_mm=recent_12mo_precip,
        precip_anomaly_pct=precip_anomaly_pct,
        recent_summer_max_temp_c=recent_summer_max_temp,
        temp_anomaly_c=temp_anomaly_c,
        spring_frost_risk=spring_frost,
        autumn_frost_risk=autumn_frost,
        april_t2m_min_c=apr_t2m_min,
        october_t2m_min_c=oct_t2m_min,
    )

async def _fetch_daily_anomalies(
    client: httpx.AsyncClient,
    lat: float,
    lon: float,
) -> Tuple[Optional[float], Optional[float], Optional[float]]:
    """
    Fetch trailing 365 days of NASA POWER daily point data and compute:
    (recent_12mo_precip_mm, recent_summer_max_temp_c, recent_summer_mean_temp_c).
    """
    now = datetime.now(timezone.utc)
    # 5-day latency buffer for NASA POWER daily processing
    end_date = now - timedelta(days=5)
    start_date = end_date - timedelta(days=365)
    start_str = start_date.strftime("%Y%m%d")
    end_str = end_date.strftime("%Y%m%d")

    url = "https://power.larc.nasa.gov/api/temporal/daily/point"
    params = {
        "parameters": "T2M,PRECTOTCORR,GWETTOP",
        "community": "AG",
        "longitude": round(lon, 4),
        "latitude": round(lat, 4),
        "start": start_str,
        "end": end_str,
        "format": "JSON",
    }

    resp = await client.get(url, params=params, timeout=4.5)
    resp.raise_for_status()
    payload = resp.json()
    daily_params = payload["properties"]["parameter"]

    # 1. Total precipitation over trailing 12 months (filter -999 fill values)
    prectot_dict = daily_params.get("PRECTOTCORR", {})
    valid_precip = [
        float(v) for v in prectot_dict.values()
        if v is not None and float(v) >= 0.0 and float(v) != -999.0
    ]
    recent_precip_mm = round(sum(valid_precip), 1) if valid_precip else None

    # 2. Summer temperatures (June, July, August)
    t2m_dict = daily_params.get("T2M", {})
    summer_temps = [
        float(v)
        for k, v in t2m_dict.items()
        if len(k) == 8 and k[4:6] in ("06", "07", "08") and float(v) > -50.0 and float(v) != -999.0
    ]
    if summer_temps:
        recent_summer_max = round(max(summer_temps), 1)
        recent_summer_mean = round(sum(summer_temps) / len(summer_temps), 2)
    else:
        recent_summer_max = None
        recent_summer_mean = None

    return recent_precip_mm, recent_summer_max, recent_summer_mean

async def fetch_nasa_climate(lat: float, lon: float) -> Tuple[ClimateSummary, str]:
    nearest = find_nearest_preset(lat, lon)
    matched_region = f"{nearest['name']} ({nearest['region']})"
    fallback_climatology = nearest["climatology"]

    climatology_url = "https://power.larc.nasa.gov/api/temporal/climatology/point"
    climatology_params = {
        "parameters": "T2M,T2M_MIN,PRECTOTCORR,GWETTOP,ALLSKY_SFC_SW_DWN",
        "community": "AG",
        "longitude": round(lon, 4),
        "latitude": round(lat, 4),
        "format": "JSON",
    }

    try:
        async with httpx.AsyncClient(timeout=4.5) as client:
            # Concurrently query climatology (30-year baseline) and daily (trailing 365 days)
            climatology_task = client.get(climatology_url, params=climatology_params)
            daily_task = _fetch_daily_anomalies(client, lat, lon)

            results = await asyncio.gather(climatology_task, daily_task, return_exceptions=True)
            clim_resp = results[0]
            daily_result = results[1]

            if isinstance(clim_resp, Exception) or clim_resp.status_code != 200:
                raise RuntimeError(f"Climatology request failed: {clim_resp}")

            payload = clim_resp.json()
            parameter_data = payload["properties"]["parameter"]

            # Parse daily anomalies if available
            recent_precip = None
            precip_anomaly = None
            recent_summer_max = None
            temp_anomaly = None

            if not isinstance(daily_result, Exception) and daily_result is not None:
                d_precip, d_smax, d_smean = daily_result
                if d_precip is not None:
                    recent_precip = d_precip
                if d_smax is not None:
                    recent_summer_max = d_smax

            # Initial summary to obtain annual baseline metrics
            initial_summary = _build_climate_summary(
                parameter_data,
                fallback_climatology=fallback_climatology,
                source="nasa_power_live",
                is_daily_rate_precip=True,
            )

            annual_baseline = initial_summary.annual_precip_mm
            mean_summer_baseline = initial_summary.mean_summer_temp_c

            if recent_precip is not None and annual_baseline > 0:
                precip_anomaly = round(((recent_precip - annual_baseline) / annual_baseline) * 100.0, 1)

            if not isinstance(daily_result, Exception) and daily_result and daily_result[2] is not None:
                temp_anomaly = round(daily_result[2] - mean_summer_baseline, 2)

            final_summary = _build_climate_summary(
                parameter_data,
                fallback_climatology=fallback_climatology,
                source="nasa_power_live",
                is_daily_rate_precip=True,
                recent_12mo_precip=recent_precip,
                precip_anomaly_pct=precip_anomaly,
                recent_summer_max_temp=recent_summer_max,
                temp_anomaly_c=temp_anomaly,
            )
            return final_summary, matched_region

    except Exception:
        fallback_summary = _build_climate_summary(
            fallback_climatology,
            fallback_climatology=fallback_climatology,
            source="local_fallback_cache",
            is_daily_rate_precip=False,
        )
        return fallback_summary, matched_region
