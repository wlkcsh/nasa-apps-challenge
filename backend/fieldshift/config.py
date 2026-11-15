"""Project paths and demo field definitions."""
from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path

from .i18n import Msg

ROOT = Path(__file__).resolve().parents[1]
CACHE_DIR = ROOT / "data" / "cache"                 # live downloads (git-ignored)
DEMO_CACHE_DIR = ROOT / "data" / "demo_cache"       # committed copies for the demo fields (read first)
RAW_DIR = ROOT / "data" / "raw"
MANUAL_DIR = ROOT / "data" / "manual"


@dataclass(frozen=True)
class Field:
    key: str
    name: str
    lat: float
    lon: float
    rotation: tuple[str, ...]  # current rotation, crop ids in sequence (one per season slot)
    country: str = ""
    satellite: bool = True     # False for presets: no MODIS NDVI / SMAP point was requested for them
    preset: bool = False       # regional farmland preset (not one of the two fully documented demo fields)
    gap_notes: tuple[str, ...] = ()   # extra lines for the information-gaps section of this field


DEMO_FIELDS: dict[str, Field] = {
    # Satellite-verified cropland point (a 213 ha farmland candidate east of Fergana). The earlier demo point (40.43, 71.70) showed
    # a summer MODIS NDVI peak of only 0.24 (town edge / bare ground, not a crop), so it was replaced. All three Fergana points
    # lie in the SAME POWER grid cell, so the climate series (and every score) is unchanged.
    "fergana": Field("fergana", "Fergana Valley, Uzbekistan", 40.4229, 71.7576,
                     ("winter_wheat", "cotton"), "UZ"),
    "kansas": Field("kansas", "Central Kansas, USA", 38.50, -98.50,
                    ("maize", "soybean"), "US"),
    # ---- regional farmland presets (points chosen on OSM farmland polygons >= 160 ha, away from town centres, where
    # SoilGrids returns values; default rotation = the common Uzbek cotton-wheat system, an ASSUMPTION to be reviewed
    # locally: e.g. rice, vegetables and orchards are not in the crop list). No MODIS NDVI / SMAP was requested for them.
    "karakalpakstan": Field("karakalpakstan", "Karakalpakstan farmland (near Nukus), Uzbekistan", 42.4128, 59.5159,
                            ("winter_wheat", "cotton"), "UZ", satellite=True, preset=True,
                            gap_notes=(Msg("g.rice"),)),
    "bukhara": Field("bukhara", "Bukhara region farmland, Uzbekistan", 39.9904, 64.3238,
                     ("winter_wheat", "cotton"), "UZ", satellite=False, preset=True),
    "samarkand": Field("samarkand", "Samarkand region farmland, Uzbekistan", 39.6350, 67.0596,
                       ("winter_wheat", "cotton"), "UZ", satellite=False, preset=True),
}


# The demo caches hold 2001-2025. Pin the end year for the demo fields so a fresh clone made in any later
# year still finds its cache key (the key includes the end year) and works with no network.
DEMO_END_YEAR = 2025


def end_year_for(lat: float, lon: float, today_year: int | None = None) -> int:
    """Last year of POWER data to request: pinned for the demo fields, else the last full calendar year."""
    import datetime as dt
    if any(abs(f.lat - lat) < 0.005 and abs(f.lon - lon) < 0.005 for f in DEMO_FIELDS.values()):
        return DEMO_END_YEAR
    return (today_year or dt.date.today().year) - 1


def field_at(lat: float, lon: float) -> "Field | None":
    """The demo/preset field located at (lat, lon), if any."""
    for f in DEMO_FIELDS.values():
        if abs(f.lat - lat) < 0.005 and abs(f.lon - lon) < 0.005:
            return f
    return None
