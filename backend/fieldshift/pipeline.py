"""End-to-end pipeline: lat/lon + current rotation + priorities -> scored, explained rotations."""
from __future__ import annotations

import datetime as dt
from dataclasses import dataclass, field

import pandas as pd

from . import features as F
from .config import end_year_for, field_at
from .crops import load_crops
from .fetch.appeears import load_ndvi, load_smap
from .fetch.base import FetchResult
from .fetch.power import fetch_power
from .i18n import Msg
from . import compare
from .rotations import ClimateClimatology, Rotation, generate_candidates
from .scoring import (DailyClimate, Weights, classify_by_demand, irrigation_demand_by_year,
                      planting_table, score_rotation, summarize)


NDVI_BARE_THRESHOLD = 0.2   # configurable: NDVI below this = bare soil
NDVI_CROP_MIN_PEAK = 0.6    # a cropland pixel greens up to at least this in a typical year; below it the point is bare ground, town edge or water
MIN_OBS_PER_YEAR = 12       # a year counts towards the peak only with this many quality-passed observations
MIN_YEARS_ANOMALY = 4       # a calendar-month z-score needs several years of the same month


@dataclass
class FieldContext:
    lat: float
    lon: float
    elevation_m: float
    daily: pd.DataFrame
    annual: pd.DataFrame            # incl. year_class
    year_classes: pd.Series
    clim: ClimateClimatology
    sources: list[FetchResult]
    gaps: list[str] = field(default_factory=list)
    ndvi: FetchResult | None = None
    smap: FetchResult | None = None
    ndvi_curve: pd.DataFrame | None = None
    ndvi_bare_windows: list = field(default_factory=list)
    observed_bare_days: float | None = None           # bare days a year on days with a clear observation only
    observed_unobservable_days: float | None = None   # days a year with no quality-passed observation nearby (snow, cloud)
    unobservable_months: list = field(default_factory=list)   # calendar months where fewer than half the composites pass QA
    ndvi_curve_min: float | None = None               # lowest value of the seasonal median NDVI curve
    smap_anomaly: pd.DataFrame | None = None
    root_wetness: pd.DataFrame | None = None     # POWER GWETROOT summary, always available


@dataclass
class RotationResult:
    rotation: Rotation
    scores: pd.DataFrame
    summary: dict[str, dict[str, float]]
    tied: dict[str, bool] = field(default_factory=dict)


def build_context(lat: float, lon: float, start_year: int = 2001, end_year: int | None = None,
                  rain_factor: float = 1.0, temp_delta: float = 0.0) -> FieldContext:
    """Fetch (cached) POWER data, optionally perturb it for what-if runs, compute features."""
    end_year = end_year or end_year_for(lat, lon)
    res = fetch_power(lat, lon, start_year, end_year)
    if not res.ok:
        raise RuntimeError(f"NASA POWER is required but failed: {res.message}")
    daily = res.data.copy()
    if rain_factor != 1.0:
        daily["PRECTOTCORR"] *= rain_factor
    if temp_delta:
        daily[["T2M", "T2M_MAX", "T2M_MIN"]] += temp_delta
    elev = float(res.meta.get("elevation_m") or 0.0)
    daily = F.add_et0(daily, lat, elev)
    ann = F.annual_features(daily, lat)
    cls = F.classify_years(ann)
    ann["year_class"] = cls
    clim = ClimateClimatology.from_daily(daily, F.frost_table(daily, lat))
    fld = field_at(lat, lon)
    if fld is not None and not fld.satellite:      # regional presets: say so explicitly instead of searching files
        why = Msg("g.nosat")
        ndvi, smap = FetchResult.failed("MODIS NDVI", why), FetchResult.failed("SMAP soil moisture", why)
    else:
        ndvi, smap = load_ndvi(lat, lon), load_smap(lat, lon)
        peak = ndvi_cropland_peak(ndvi.data["ndvi"]) if ndvi.ok else None
        if peak is not None and peak < NDVI_CROP_MIN_PEAK:        # not a crop pixel: never compare it with the crop calendar
            ndvi = FetchResult.failed("MODIS NDVI", Msg("g.ndvi_notcrop", peak=peak, thr=NDVI_CROP_MIN_PEAK))
    sources = [res]
    curve, wins, obs, sm_anom = None, [], None, None
    unobs, unobs_months, curve_min = None, [], None
    root_w = F.root_wetness_summary(daily)
    gaps: list = [Msg("g.soil")]
    def span_years(df: pd.DataFrame) -> float:
        return (df.index.max() - df.index.min()).days / 365.25

    if ndvi.ok:
        sources.append(ndvi)
        nd_years = span_years(ndvi.data)
        curve = F.ndvi_seasonal_curve(ndvi.data["ndvi"])
        wins = F.bare_windows_from_ndvi(curve, NDVI_BARE_THRESHOLD)
        ob = F.observed_bare_summary(ndvi.data["ndvi"], NDVI_BARE_THRESHOLD)
        obs = ob["bare_days"] if ob else None
        unobs = ob["unobservable_days"] if ob else None
        unobs_months = ob["poor_months"] if ob else []
        curve_min = float(curve["median"].min())
        gaps.append(Msg("g.ndvi_short" if nd_years < 5 else "g.ndvi_ok", nv=ndvi.meta["n_valid"], nt=ndvi.meta["n_total"],
                        rng=ndvi.date_range, yrs=nd_years))
    else:
        gaps.append(Msg("g.ndvi_na", detail=_detail(ndvi)))
    if smap.ok:
        sources.append(smap)
        sm_years = span_years(smap.data)
        if sm_years >= MIN_YEARS_ANOMALY:
            sm_anom = F.soil_moisture_anomaly(smap.data.rename(columns={"soil_moisture": "SMAP"}), "SMAP")
            gaps.append(Msg("g.smap_info", rng=smap.date_range))
        else:
            gaps.append(Msg("g.smap_short", rng=smap.date_range, yrs=sm_years, minyrs=MIN_YEARS_ANOMALY))
    else:
        gaps.append(Msg("g.smap_na", detail=_detail(smap)))
    gaps += [Msg(k) for k in ("g.srtm", "g.irr_salt", "g.et0", "g.classes", "g.temps", "g.params")]
    if fld is not None:
        gaps.extend(fld.gap_notes)                 # field-specific notes (e.g. a common local crop that is not modelled)
    miss = {k: v for k, v in F.completeness(daily).items() if v > 0.01}
    if miss:
        gaps.append(Msg("g.power_gaps", cols=", ".join(miss)))
    return FieldContext(lat, lon, elev, daily, ann, cls, clim, sources, gaps, ndvi, smap, curve, wins, obs, unobs, unobs_months,
                        curve_min, sm_anom, root_w)


def ndvi_cropland_peak(ndvi: pd.Series) -> float | None:
    """Median over years of the yearly maximum NDVI (years with enough good observations); None if fewer than 2 such years."""
    d = ndvi.dropna()
    g = d.groupby(d.index.year)
    peaks = g.max()[g.count() >= MIN_OBS_PER_YEAR]
    return float(peaks.median()) if len(peaks) >= 2 else None


def _detail(res: FetchResult):
    """Translatable, file-free reason(s) a source failed (one Msg, or several joined); the raw message with file names stays in logs."""
    msg = res.message
    if isinstance(msg, Msg):
        return msg
    reasons = res.reasons
    if reasons:
        return reasons[0] if len(reasons) == 1 else Msg("g.joined", items=reasons)
    return msg


def run(ctx: FieldContext, current: tuple[str, ...], weights: Weights | None = None,
        n_alternatives: int = 4, irrigation_supply: float = 1.0,
        pinned: tuple[tuple[str, ...], ...] = (), n_per_rule: int = 1) -> list[RotationResult]:
    """Generate candidate rotations (current first) and score every one.

    Year classes are terciles of the *current* rotation's irrigation demand, shared by all
    candidates so dry/normal/wet columns are comparable.
    """
    weights = weights or Weights()
    db = load_crops()
    dc = DailyClimate(ctx.daily)
    from .rotations import schedule
    cur = schedule(current, db)
    demand = irrigation_demand_by_year(cur, planting_table(cur, db, dc))
    classes = classify_by_demand(demand)

    scored: dict[tuple, pd.DataFrame] = {}

    def score(rot: Rotation) -> pd.DataFrame:     # one scoring per rotation (memoised planting scores underneath)
        if rot.crops not in scored:
            scored[rot.crops] = score_rotation(rot, db, dc, weights, classes, irrigation_supply)
        return scored[rot.crops]

    def quick(rot: Rotation) -> float:  # used only to rank candidates within a rule family
        return float(score(rot)["total_abs"].median())

    rots = generate_candidates(current, db, ctx.clim, quick, n_alternatives, pinned, n_per_rule)
    out = [RotationResult(r, score(r), {}) for r in rots]
    compare.apply(out, weights)
    return out


def choose(pool: list[RotationResult], weights: Weights, n: int = 4,
           force: tuple[tuple[str, ...], ...] = ()) -> tuple[list[RotationResult], dict[str, bool]]:
    """Pick the rotations to display: current + the best candidate of each rule family (top n by fit).

    `pool` is every feasible candidate (current first). Scores are normalised first over the whole pool to
    choose, then again over the displayed options only (the fit is "compared among these options").
    Returns (display, tied-criteria flags). Works on copies, so the cached pool is never mutated.
    """
    from copy import copy
    pool = [RotationResult(r.rotation, r.scores.copy(), r.summary) for r in pool]
    compare.apply(pool, weights)
    best: dict[str, RotationResult] = {}
    for r in pool[1:]:
        if r.rotation.rule not in best or r.summary["fit"]["median"] > best[r.rotation.rule].summary["fit"]["median"]:
            best[r.rotation.rule] = r
    picks = sorted(best.values(), key=lambda r: -r.summary["fit"]["median"])[:n]
    for crops in force:
        hit = next((r for r in pool[1:] if r.rotation.crops == tuple(crops)), None)
        if hit and hit not in picks:
            picks = picks[:n - 1] + [hit]
    display = [pool[0], *picks]
    tied = compare.apply(display, weights)
    display[1:] = sorted(display[1:], key=lambda r: -r.summary["fit"]["median"])
    return display, tied
