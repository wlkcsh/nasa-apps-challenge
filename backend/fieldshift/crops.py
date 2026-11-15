"""Crop knowledge base loader."""
from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any

Crop = dict[str, Any]


@lru_cache(maxsize=1)
def load_crops(path: str | None = None) -> dict[str, Crop]:
    p = Path(path) if path else Path(__file__).with_name("crops.json")
    return json.loads(p.read_text())["crops"]


_KC_CACHE: dict = {}


def kc_curve(crop: Crop, days: int) -> list[float]:
    """Daily FAO-56 Kc over `days`: ini flat, dev linear to mid, mid flat, late linear to end."""
    key = (crop["name"], days, tuple(crop["stages"]), tuple(crop["kc"].values()))
    if key in _KC_CACHE:
        return _KC_CACHE[key]
    ini, dev, mid, late = crop["stages"]
    scale = days / (ini + dev + mid + late)
    n_ini, n_dev, n_mid = (round(x * scale) for x in (ini, dev, mid))
    n_late = max(days - n_ini - n_dev - n_mid, 0)
    k = crop["kc"]
    out = [k["ini"]] * n_ini
    out += [k["ini"] + (k["mid"] - k["ini"]) * (i + 1) / max(n_dev, 1) for i in range(n_dev)]
    out += [k["mid"]] * n_mid
    out += [k["mid"] + (k["end"] - k["mid"]) * (i + 1) / max(n_late, 1) for i in range(n_late)]
    _KC_CACHE[key] = (out + [k["end"]] * days)[:days]
    return _KC_CACHE[key]
