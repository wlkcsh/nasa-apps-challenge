"""NASA POWER daily point API (community AG). The backbone data source."""
from __future__ import annotations

import time

import numpy as np
import pandas as pd
import requests

from .base import FetchResult, cache_key, read_json_cache, write_json_cache

URL = "https://power.larc.nasa.gov/api/temporal/daily/point"
PARAMS = ["T2M", "T2M_MAX", "T2M_MIN", "PRECTOTCORR", "RH2M", "WS2M",
          "ALLSKY_SFC_SW_DWN", "GWETTOP", "GWETROOT"]
MAX_PARAMS = 20          # POWER limit per point request
CHUNK_YEARS = 5          # keeps each response small and retryable
FILL = -999.0


def _request(lat: float, lon: float, start: str, end: str, params: list[str],
             retries: int = 3) -> dict:
    q = dict(community="AG", latitude=lat, longitude=lon, start=start, end=end,
             format="JSON", parameters=",".join(params))
    last: Exception | None = None
    for attempt in range(retries):
        try:
            r = requests.get(URL, params=q, timeout=120)
            if r.status_code == 429:
                time.sleep(5 * (attempt + 1))
                continue
            r.raise_for_status()
            return r.json()
        except requests.RequestException as e:  # noqa: PERF203
            last = e
            time.sleep(2 * (attempt + 1))
    raise RuntimeError(f"POWER request failed after {retries} tries: {last}")


def _to_frame(payload: dict) -> pd.DataFrame:
    par = payload["properties"]["parameter"]
    df = pd.DataFrame(par)
    df.index = pd.to_datetime(df.index, format="%Y%m%d")
    df.index.name = "date"
    return df.replace(FILL, np.nan)


def fetch_power(lat: float, lon: float, start_year: int = 2001, end_year: int = 2025,
                params: list[str] | None = None) -> FetchResult:
    """Fetch daily POWER data, chunked by year-range and cached per field."""
    params = params or PARAMS
    assert len(params) <= MAX_PARAMS
    key = cache_key("power", lat, lon, str(start_year), str(end_year), ",".join(params))
    cached = read_json_cache(key)
    if cached is not None:
        df = pd.DataFrame(cached["data"])
        df.index = pd.to_datetime(df.index)
        df.index.name = "date"
        return FetchResult("NASA POWER (MERRA-2 / CERES-SYN)", df, True,
                           "~0.5°x0.625° grid, daily", f"{start_year}-{end_year}",
                           "from cache", cached["meta"])
    frames, elev = [], None
    try:
        for y0 in range(start_year, end_year + 1, CHUNK_YEARS):
            y1 = min(y0 + CHUNK_YEARS - 1, end_year)
            payload = _request(lat, lon, f"{y0}0101", f"{y1}1231", params)
            elev = elev if elev is not None else payload["geometry"]["coordinates"][2]
            frames.append(_to_frame(payload))
            time.sleep(2.2)  # stay under ~30 requests/min
    except Exception as e:  # noqa: BLE001
        return FetchResult.failed("NASA POWER", str(e))
    df = pd.concat(frames).sort_index()
    meta = {"elevation_m": elev}
    write_json_cache(key, {
        "meta": meta,
        "data": {c: {d.strftime("%Y-%m-%d"): (None if pd.isna(v) else v)
                     for d, v in df[c].items()} for c in df.columns}})
    return FetchResult("NASA POWER (MERRA-2 / CERES-SYN)", df, True,
                       "~0.5°x0.625° grid, daily", f"{start_year}-{end_year}", "live", meta)
