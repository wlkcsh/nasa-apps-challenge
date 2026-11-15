"""Parse manually downloaded AppEEARS point-sample CSVs (data/raw/) for MODIS NDVI and SMAP soil moisture.

Expected products (AppEEARS "point sample" CSV output):
  MOD13Q1.061  250 m 16-day NDVI, layers *_250m_16_days_NDVI and *_250m_16_days_pixel_reliability
  SPL3SMP_E.006 9 km daily soil moisture, layers ..._AM_soil_moisture(+_qual_flag) and ..._PM_soil_moisture_pm(+_qual_flag_pm)
Column names are matched by regular expression (they differ slightly between AppEEARS versions). If the
required columns are missing, a ValueError lists the columns found. A file may hold several points; the
row group nearest to the requested lat/lon (within the product's tolerance) is used.

QA applied before any value is used:
  NDVI  : every QA layer present must pass: pixel_reliability 0 (good) or 1 (marginal); VI_Quality bits decoded as
          MODLAND QA <= 1 (not cloudy / not produced), no mixed
          clouds, no possible snow/ice, no possible shadow, usefulness code <= 11. Values are used as delivered if they
          are already scaled (AppEEARS CSVs are), else multiplied by 0.0001; valid NDVI range is -0.2..1.
  SMAP  : retrieval_qual_flag bit 0 must be 0 (recommended quality); fill -9999 rejected; AM and PM averaged.
"""
from __future__ import annotations

import logging
import re
from pathlib import Path

import numpy as np
import pandas as pd

from ..config import DEMO_CACHE_DIR, RAW_DIR
from ..i18n import Msg
from .base import FetchResult

NDVI_MAX_DEG = 0.01    # ~1 km: a 250 m pixel must be the field, not a town 9 km away
SMAP_MAX_DEG = 0.06    # ~one 9 km pixel half-width
NDVI_SCALE = 0.0001
NDVI_FILL = -3000
SMAP_FILL = -9999
QUAL_FILL = 65534      # uint16 fill of retrieval_qual_flag (verified in the AppEEARS layer list)
NDVI_ACCEPT_RELIABILITY = (0, 1)


log = logging.getLogger("fieldshift.appeears")


class LoadReason(ValueError):
    """A known, translatable reason a file cannot be used. str() is the English text; `msg` is the file-free Msg for the UI."""

    def __init__(self, text: str, msg: Msg):
        super().__init__(text)
        self.msg = msg


def _find_col(cols: list[str], pattern: str, required: bool = True) -> str | None:
    hit = [c for c in cols if re.search(pattern, c, re.I)]
    if hit:
        return hit[0]
    if required:
        raise ValueError(f"column matching /{pattern}/ not found; columns are: {cols}")
    return None


def _select_point(df: pd.DataFrame, lat: float, lon: float, max_deg: float) -> pd.DataFrame:
    lat_c, lon_c = _find_col(list(df.columns), r"^latitude$"), _find_col(list(df.columns), r"^longitude$")
    d = np.hypot(df[lat_c] - lat, df[lon_c] - lon)
    if d.min() > max_deg:
        raise LoadReason(f"no point within {max_deg} deg of ({lat}, {lon}); nearest is {d.min():.3f} deg away",
                         Msg("g.nopoint", d=max_deg, lat=lat, lon=lon, near=f"{d.min():.3f}"))
    best = df.loc[d.idxmin(), [lat_c, lon_c]]
    return df[(df[lat_c] == best[lat_c]) & (df[lon_c] == best[lon_c])]


def _vi_quality_ok(q: np.ndarray) -> np.ndarray:
    """MOD13Q1 VI_Quality bit fields -> True where the NDVI may be used (bit layout checked against NASA's decoded columns)."""
    q = np.nan_to_num(q, nan=65535).astype(np.int64)
    modland, useful = q & 3, (q >> 2) & 15
    mixed_clouds, snow, shadow = (q >> 10) & 1, (q >> 14) & 1, (q >> 15) & 1
    return (modland <= 1) & (useful <= 11) & (mixed_clouds == 0) & (snow == 0) & (shadow == 0)


def parse_ndvi(path: Path, lat: float, lon: float, accept: tuple[int, ...] = NDVI_ACCEPT_RELIABILITY) -> pd.DataFrame:
    """Return a frame indexed by date with `ndvi` (QA-filtered, NaN where rejected) and `qa` (which rule was used)."""
    raw = pd.read_csv(path)
    df = _select_point(raw, lat, lon, NDVI_MAX_DEG)
    cols = list(df.columns)
    vals = df[_find_col(cols, r"250m_16_days_NDVI$")].astype(float).to_numpy()
    finite = vals[np.isfinite(vals) & (vals != NDVI_FILL)]          # the fill value must not decide the scale (one -3000 row made a whole column read ~0)
    scaled = finite.size == 0 or np.abs(finite).max() <= 1.5         # AppEEARS CSVs deliver scaled NDVI; raw MODIS ints reach 10000
    ndvi = vals if scaled else vals * NDVI_SCALE
    in_range = (ndvi >= -0.2) & (ndvi <= 1.0)
    rel = _find_col(cols, r"250m_16_days_pixel_reliability$", required=False)
    vq = _find_col(cols, r"250m_16_days_VI_Quality$", required=False)
    if rel is None and vq is None:
        raise ValueError(f"neither pixel_reliability nor VI_Quality column found; columns are: {cols}")
    ok, used = np.ones(len(df), bool), []
    if vq is not None:
        ok &= _vi_quality_ok(df[vq].astype(float).to_numpy()); used.append("VI_Quality bits")
    if rel is not None:
        ok &= df[rel].astype(float).isin(accept).to_numpy(); used.append("pixel_reliability")
    qa = " + ".join(used)
    out = pd.DataFrame({"ndvi": np.where(ok & in_range, ndvi, np.nan), "qa": qa},
                       index=pd.to_datetime(df[_find_col(cols, r"^date$")]).values)
    out.index.name = "date"
    return out.sort_index()


def parse_smap(path: Path, lat: float, lon: float) -> pd.DataFrame:
    """Return a frame indexed by date with `soil_moisture` (m3/m3, QA-filtered, AM/PM mean)."""
    raw = pd.read_csv(path)
    df = _select_point(raw, lat, lon, SMAP_MAX_DEG)
    cols = list(df.columns)
    parts = []
    for sm_pat, q_pat in ((r"_AM_soil_moisture$", r"AM_retrieval_qual_flag$|retrieval_qual_flag$"),
                          (r"_PM_soil_moisture_pm$", r"PM_retrieval_qual_flag_pm$|retrieval_qual_flag_pm$")):
        sm = _find_col(cols, sm_pat, required=False)
        if sm is None:
            continue
        q = _find_col([c for c in cols if (c.lower().endswith("_pm") == sm.lower().endswith("_pm"))], q_pat)
        v = df[sm].astype(float)
        flag = df[q].astype(float).fillna(65535).astype(int)
        good = (v != SMAP_FILL) & (v > 0) & ((flag & 1) == 0) & (flag < QUAL_FILL)   # 65534 (fill) has bit 0 clear: reject explicitly
        parts.append(v.where(good))
    if not parts:
        raise ValueError(f"no AM/PM soil_moisture columns found; columns are: {cols}")
    out = pd.DataFrame({"soil_moisture": pd.concat(parts, axis=1).mean(axis=1).values},
                       index=pd.to_datetime(df[_find_col(cols, r"^date$")]).values)
    out.index.name = "date"
    return out.sort_index()


def _files(pattern: str) -> list[Path]:
    """AppEEARS CSVs in data/raw/, data/ (bundles are often unzipped by hand) and the committed data/demo_cache/."""
    dirs = [Path(RAW_DIR), Path(RAW_DIR).parent, Path(DEMO_CACHE_DIR)]      # DEMO_CACHE_DIR: trimmed copies committed for the demo points
    return sorted({f for d in dirs if d.exists() for f in d.glob(f"*{pattern}*.csv")})


def _load(source: str, patterns: list[str], parser, lat: float, lon: float, res: str) -> FetchResult:
    files = [f for p in patterns for f in _files(p)]
    if not files:
        return FetchResult.failed(source, f"no file matching {patterns} in data/raw/ (download from AppEEARS)", [Msg("g.r_nofile")])
    errors, reasons = [], []
    for f in files:
        try:
            df = parser(f, lat, lon)
            n_ok = int(df.iloc[:, 0].notna().sum())
            if n_ok == 0:
                raise LoadReason("all observations rejected by QA", Msg("g.r_rejected"))
            return FetchResult(source, df, True, res, f"{df.index.min():%Y-%m-%d} – {df.index.max():%Y-%m-%d}",
                               f"{f.name}: {n_ok}/{len(df)} observations pass QA",
                               {"file": f.name, "n_total": len(df), "n_valid": n_ok})
        except Exception as e:  # noqa: BLE001
            log.warning("%s: %s", f.name, e)                       # file names stay in the log (and in `message`), never in the UI
            errors.append(f"{f.name}: {e}")
            m = e.msg if isinstance(e, LoadReason) else Msg("g.r_unreadable")
            if m.key == "g.nopoint":                                # several files: only the nearest point is worth reporting
                old = next((x for x in reasons if x.key == "g.nopoint"), None)
                if old is None:
                    reasons.append(m)
                elif float(m.params["near"]) < float(old.params["near"]):
                    reasons[reasons.index(old)] = m
            elif not any(str(m) == str(x) for x in reasons):
                reasons.append(m)
    return FetchResult.failed(source, "; ".join(errors)[:400], reasons)


def load_ndvi(lat: float, lon: float) -> FetchResult:
    return _load("MODIS NDVI (MOD13Q1.061, AppEEARS CSV)", ["MOD13Q1"], parse_ndvi, lat, lon, "250 m, 16-day")


def load_smap(lat: float, lon: float) -> FetchResult:
    return _load("SMAP soil moisture (SPL3SMP_E, AppEEARS CSV)", ["SPL3SMP"], parse_smap, lat, lon, "9 km, daily")
