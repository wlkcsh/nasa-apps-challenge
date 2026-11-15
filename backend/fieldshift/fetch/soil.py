"""ISRIC SoilGrids point values (0-30 cm), two tiers: a filled manual JSON (user input, offline) -> REST (10 s timeout).

Output units: clay/sand/silt %, soc g/kg, phh2o pH, bdod kg/dm3. Depth-weighted over 0-5/5-15/15-30 cm.
Manual file: data/manual/soil_<field>.json, values read by hand from the SoilGrids web map (0-30 cm);
keys clay_pct, sand_pct, silt_pct, soc_g_kg, phh2o, bdod_kg_dm3; null/missing = not read.
"""
from __future__ import annotations

import json
from pathlib import Path

import pandas as pd
import requests

from ..config import MANUAL_DIR
from .base import FetchResult, cache_key, read_json_cache, write_json_cache

REST_URL = "https://rest.isric.org/soilgrids/v2.0/properties/query"
PROPS = ["clay", "sand", "silt", "soc", "phh2o", "bdod"]
DEPTHS = {"0-5cm": 5, "5-15cm": 10, "15-30cm": 15}      # label -> thickness (cm) for weighting
D_FACTOR = {"clay": 10, "sand": 10, "silt": 10, "soc": 10, "phh2o": 10, "bdod": 100}
OUT_NAME = {"clay": "clay_pct", "sand": "sand_pct", "silt": "silt_pct", "soc": "soc_g_kg",
            "phh2o": "phh2o", "bdod": "bdod_kg_dm3"}
TIMEOUT_S = 20   # the full 6-property query took 6-10 s in tests; 10 s timed out intermittently


def _weighted(values: dict[str, float]) -> float:
    tot = sum(DEPTHS[d] for d in values)
    return sum(v * DEPTHS[d] for d, v in values.items()) / tot


def parse_rest(payload: dict) -> dict[str, float]:
    """SoilGrids REST JSON -> {clay_pct: ..}, converting mapped units with each layer's d_factor."""
    out: dict[str, float] = {}
    for layer in payload["properties"]["layers"]:
        name, d = layer["name"], layer["unit_measure"]["d_factor"]
        vals = {x["label"]: x["values"]["mean"] / d for x in layer["depths"]
                if x["label"] in DEPTHS and x["values"].get("mean") is not None}
        if vals:
            out[OUT_NAME[name]] = _weighted(vals)
    return out


def _via_rest(lat: float, lon: float) -> dict[str, float]:
    q = [("lon", lon), ("lat", lat), ("value", "mean")]
    q += [("property", p) for p in PROPS] + [("depth", d) for d in DEPTHS]
    r = requests.get(REST_URL, params=q, timeout=TIMEOUT_S)
    r.raise_for_status()
    return parse_rest(r.json())


def _via_manual(field_key: str | None) -> dict[str, float]:
    if not field_key:
        raise FileNotFoundError("no field key for manual soil file")
    f = Path(MANUAL_DIR) / f"soil_{field_key}.json"
    d = json.loads(f.read_text())
    vals = {k: float(d[k]) for k in OUT_NAME.values() if d.get(k) is not None}
    if not vals:
        raise ValueError("manual soil file has no values yet")
    return vals


def texture_class(clay: float, sand: float, silt: float) -> str:
    """Coarse USDA-style texture label from percentages."""
    if clay >= 40:
        return "clay"
    if sand >= 70 and clay < 15:
        return "sandy"
    if silt >= 50 and clay < 27:
        return "silty (loam)"
    if clay >= 27:
        return "clay loam"
    return "loam"


def fetch_soil(lat: float, lon: float, field_key: str | None = None) -> FetchResult:
    try:    # an explicit manual reading overrides any cached or live service value
        return _result(_via_manual(field_key), "manual estimate", "manual file")
    except Exception:  # noqa: BLE001  (missing file or still empty template)
        pass
    key = cache_key("soil", lat, lon)
    cached = read_json_cache(key)
    if cached is not None:
        c = cached
        return _result(c["values"], c["tier"], "from cache")
    errors: list[str] = []
    for tier, fn in (("manual estimate", lambda: _via_manual(field_key)),      # a filled manual file wins (and needs no network)
                     ("SoilGrids REST", lambda: _via_rest(lat, lon))):
        try:
            vals = fn()
            if vals:
                if tier != "manual estimate":   # never cache a hand-entered file; it is read live
                    write_json_cache(key, {"values": vals, "tier": tier})
                return _result(vals, tier, "; ".join(errors) or "live")
            errors.append(f"{tier} returned no data")
        except Exception as e:  # noqa: BLE001
            errors.append(f"{tier} failed ({type(e).__name__})")
    return FetchResult.failed("SoilGrids", "; ".join(errors))


def _result(vals: dict[str, float], tier: str, msg: str) -> FetchResult:
    df = pd.DataFrame([vals])
    if {"clay_pct", "sand_pct", "silt_pct"} <= set(vals):
        df["texture"] = texture_class(vals["clay_pct"], vals["sand_pct"], vals["silt_pct"])
    manual = tier == "manual estimate"
    res = "manual reading, 0-30 cm" if manual else "250 m, 0-30 cm weighted"
    name = "Soil: SoilGrids web map, read manually" if manual else f"Soil: {tier}"
    return FetchResult(name, df, True, res, "static", msg, {"tier": tier})
