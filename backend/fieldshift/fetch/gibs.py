"""NASA GIBS (Global Imagery Browse Services) map layers: metadata only (the browser fetches the tiles itself).

For each layer we need, from the live WMTS capabilities document: the newest observation date, the tile matrix set (max zoom)
and the image format; and from NASA's published colormap XML: the legend colours and value range. Nothing is invented: if the
capabilities cannot be read (offline, server down) and no cached copy exists, the layer is reported as *unavailable* with a reason
and the map simply does not offer it.

Layers (all global coverage; the date is the newest GIBS offers, not a seasonal mean):
  ndvi    MODIS Terra NDVI, rolling 8-day, 250 m
  precip  GPM IMERG precipitation rate, ~10 km
  temp    MODIS Terra land surface temperature, 8-day daytime, 1 km (surface, not air, temperature)
  soil    SMAP L4 surface soil moisture, ~9 km (model analysis that assimilates SMAP data)
"""
from __future__ import annotations

import html
import json
import re
import os
import threading
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path

import requests

from ..config import CACHE_DIR, DEMO_CACHE_DIR

SNAPSHOT_DIR = DEMO_CACHE_DIR          # committed copy of the metadata below: the map never waits for the 6 MB capabilities file

CAPS_URL = "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/1.0.0/WMTSCapabilities.xml"
TILE_URL = "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/{layer}/default/{date}/{tms}/{{z}}/{{y}}/{{x}}.{ext}"
TIMEOUT_S = 25
CACHE_TTL_S = 12 * 3600
LAYERS = {"ndvi": "MODIS_Terra_NDVI_8Day", "precip": "IMERG_Precipitation_Rate",
          "temp": "MODIS_Terra_L3_Land_Surface_Temp_8Day_Day", "soil": "SMAP_L4_Analyzed_Surface_Soil_Moisture"}
KELVIN_KEYS = {"temp"}          # legend values are in kelvin; shown in °C


@dataclass
class Legend:
    stops: list[tuple[int, int, int]]
    vmin: float | None
    vmax: float | None

    def css_gradient(self, n: int = 18) -> str:
        if not self.stops:
            return "none"
        idx = sorted({round(i * (len(self.stops) - 1) / (n - 1)) for i in range(n)}) if len(self.stops) > n else range(len(self.stops))
        pts = [self.stops[i] for i in idx]
        return "linear-gradient(to right," + ",".join(f"rgb{c} {100 * k / max(1, len(pts) - 1):.0f}%" for k, c in enumerate(pts)) + ")"


@dataclass
class GibsLayer:
    key: str
    layer_id: str
    date: str = ""
    tms: str = ""
    ext: str = "png"
    legend: Legend | None = None
    ok: bool = False
    reason: str = ""
    stale: bool = False
    as_of: str = ""                 # date the metadata was read from GIBS (YYYY-MM-DD); shown when the copy is not fresh

    @property
    def max_zoom(self) -> int:
        m = re.search(r"Level(\d+)", self.tms)
        return int(m.group(1)) if m else 6

    def tile_url(self) -> str:
        return TILE_URL.format(layer=self.layer_id, date=self.date, tms=self.tms, ext=self.ext)


# ---------------------------------------------------------------- parsing
def parse_capabilities(xml: str, layer_id: str) -> dict | None:
    """Pull date / tile matrix set / format / colormap URL for one layer out of the (large) capabilities text."""
    i = xml.find(f"<ows:Identifier>{layer_id}</ows:Identifier>")
    if i < 0:
        return None
    j, k = xml.rfind("<Layer>", 0, i), xml.find("</Layer>", i)
    block = xml[j:k]
    default = re.search(r"<Dimension>.*?<Default>([^<]*)</Default>", block, re.S)
    tms = re.search(r"<TileMatrixSet>([^<]*)</TileMatrixSet>", block)
    fmt = re.search(r"<Format>image/(png|jpeg)</Format>", block)
    cmap = None
    for tag in re.findall(r"<ows:Metadata\b[^>]*>", block):          # attribute order varies between server responses
        if "colormap/1.3" in tag:
            cmap = re.search(r"""xlink:href=["']([^"']*)["']""", tag)
            break
    if not (default and tms):
        return None
    return {"date": default.group(1), "tms": tms.group(1), "ext": "jpg" if fmt and fmt.group(1) == "jpeg" else "png",
            "colormap": cmap.group(1) if cmap else ""}


_NUM = re.compile(r"-?\d+(?:\.\d+)?")


def parse_colormap(xml: str, kelvin: bool = False) -> Legend:
    """Legend colours and range from a GIBS colormap XML. Entries without a number in the tooltip (Fill, No Data) are skipped."""
    stops: list[tuple[int, int, int]] = []
    nums: list[float] = []
    for r, g, b, tip in re.findall(r'<LegendEntry rgb="(\d+),(\d+),(\d+)" tooltip="([^"]*)"', xml):
        found = _NUM.findall(html.unescape(tip))
        if not found:
            continue
        stops.append((int(r), int(g), int(b)))
        nums += [float(v) for v in found]
    if kelvin:
        nums = [v - 273.15 for v in nums]
    return Legend(stops, min(nums) if nums else None, max(nums) if nums else None)


# ---------------------------------------------------------------- cache: live copy, committed snapshot, background refresh
FILE = "gibs_layers.json"
RETRY_AFTER_S = 600


def _read(path: Path) -> dict | None:
    try:
        d = json.loads(path.read_text())
        return d if isinstance(d, dict) and "layers" in d else None
    except Exception:  # noqa: BLE001
        return None


def _best_cache() -> dict | None:
    """The newest of the live copy and the committed snapshot."""
    caches = [c for c in (_read(Path(CACHE_DIR) / FILE), _read(Path(SNAPSHOT_DIR) / FILE)) if c]
    return max(caches, key=lambda c: c.get("fetched", 0)) if caches else None


def _as_of(fetched: float) -> str:
    return datetime.fromtimestamp(fetched, timezone.utc).strftime("%Y-%m-%d")


def _from_record(key: str, rec: dict, stale: bool, fetched: float = 0.0) -> GibsLayer:
    lg = rec.get("legend")
    return GibsLayer(key, LAYERS[key], rec["date"], rec["tms"], rec["ext"],
                     Legend([tuple(c) for c in lg["stops"]], lg["vmin"], lg["vmax"]) if lg else None, True, "", stale,
                     _as_of(fetched) if fetched else "")


def needs_refresh(now: float | None = None) -> bool:
    now = time.time() if now is None else now
    c = _best_cache()
    return not c or now - c.get("fetched", 0) >= CACHE_TTL_S or not all(k in c["layers"] for k in LAYERS)


def load_cached(now: float | None = None) -> dict[str, GibsLayer]:
    """Instant, no network: the newest of the live cache and the committed snapshot. A copy older than 12 h is marked stale
    (the date shown is then the latest known when the copy was saved, flagged with its `as_of` date)."""
    now = time.time() if now is None else now
    c = _best_cache()
    if not c:
        return {k: GibsLayer(k, LAYERS[k], reason="no layer metadata available yet") for k in LAYERS}
    stale = now - c.get("fetched", 0) >= CACHE_TTL_S
    return {k: _from_record(k, c["layers"][k], stale, c.get("fetched", 0)) if k in c["layers"]
            else GibsLayer(k, LAYERS[k], reason="not listed by NASA GIBS") for k in LAYERS}


def refresh(session=None, now: float | None = None, path: Path | None = None) -> dict[str, GibsLayer]:
    """Fetch the capabilities + colormaps from GIBS and store them (atomically). On failure, return whatever `load_cached` has."""
    now = time.time() if now is None else now
    get = (session or requests).get
    try:
        r = get(CAPS_URL, timeout=TIMEOUT_S)
        r.raise_for_status()
        xml = r.text
        recs: dict[str, dict] = {}
        for key, lid in LAYERS.items():
            info = parse_capabilities(xml, lid)
            if info is None:
                continue
            legend = None
            if info["colormap"]:
                try:
                    cr = get(info["colormap"], timeout=TIMEOUT_S)
                    cr.raise_for_status()
                    lg = parse_colormap(cr.text, key in KELVIN_KEYS)
                    legend = {"stops": lg.stops, "vmin": lg.vmin, "vmax": lg.vmax}
                except Exception:  # noqa: BLE001
                    legend = None
            recs[key] = {"date": info["date"], "tms": info["tms"], "ext": info["ext"], "legend": legend}
        target = path or Path(CACHE_DIR) / FILE
        try:
            target.parent.mkdir(parents=True, exist_ok=True)
            tmp = target.with_suffix(f".{os.getpid()}.tmp")
            tmp.write_text(json.dumps({"fetched": now, "layers": recs}))
            os.replace(tmp, target)
        except OSError:
            pass
        return {k: _from_record(k, recs[k], False, now) if k in recs else GibsLayer(k, LAYERS[k], reason="not listed by NASA GIBS")
                for k in LAYERS}
    except Exception as e:  # noqa: BLE001
        out = load_cached(now)
        if not any(l.ok for l in out.values()):
            out = {k: GibsLayer(k, LAYERS[k], reason=f"NASA GIBS could not be reached ({type(e).__name__})") for k in LAYERS}
        return out


def load_layers(session=None, now: float | None = None) -> dict[str, GibsLayer]:
    """Synchronous: cached copy if fresh, otherwise refresh (used by scripts and tests; the app uses load_cached + background)."""
    return load_cached(now) if not needs_refresh(now) else refresh(session, now)


_lock = threading.Lock()
_state = {"running": False, "last_try": 0.0}


def refresh_in_background(now: float | None = None) -> bool:
    """Start (at most one) daemon thread that refreshes the metadata when it is older than 12 h. Never blocks, never raises.
    A failed attempt is not retried for 10 minutes. Returns True if a refresh was started."""
    now = time.time() if now is None else now
    if not needs_refresh(now):
        return False
    with _lock:
        if _state["running"] or now - _state["last_try"] < RETRY_AFTER_S:
            return False
        _state["running"], _state["last_try"] = True, now

    def work() -> None:
        try:
            refresh()
        except Exception:  # noqa: BLE001
            pass
        finally:
            with _lock:
                _state["running"] = False

    threading.Thread(target=work, daemon=True, name="gibs-refresh").start()
    return True
