"""Field-level climate features derived from NASA POWER daily data.

All functions are pure (DataFrame in, DataFrame/scalar out) so they are easy to test.
Expected daily columns: T2M, T2M_MAX, T2M_MIN, PRECTOTCORR, RH2M, WS2M,
ALLSKY_SFC_SW_DWN (MJ m-2 day-1), GWETTOP, GWETROOT; DatetimeIndex.
"""
from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import pandas as pd

SIGMA = 4.903e-9  # Stefan-Boltzmann, MJ K-4 m-2 day-1
GSC = 0.0820      # solar constant, MJ m-2 min-1


# ---------------------------------------------------------------- ET0 (FAO-56)
def sat_vp(t_c: np.ndarray | float) -> np.ndarray | float:
    """Saturation vapour pressure (kPa), FAO-56 eq. 11."""
    return 0.6108 * np.exp(17.27 * t_c / (t_c + 237.3))


def extraterrestrial_radiation(lat_deg: float, doy: np.ndarray | int) -> np.ndarray:
    """Ra (MJ m-2 day-1), FAO-56 eq. 21."""
    phi = np.radians(lat_deg)
    doy = np.asarray(doy, dtype=float)
    dr = 1 + 0.033 * np.cos(2 * np.pi * doy / 365)
    delta = 0.409 * np.sin(2 * np.pi * doy / 365 - 1.39)
    ws = np.arccos(np.clip(-np.tan(phi) * np.tan(delta), -1, 1))
    return (24 * 60 / np.pi) * GSC * dr * (
        ws * np.sin(phi) * np.sin(delta) + np.cos(phi) * np.cos(delta) * np.sin(ws))


def et0_penman_monteith(tmax, tmin, rs, ea, u2, elev_m: float, lat_deg: float, doy) -> np.ndarray:
    """Daily reference ET0 (mm/day), FAO-56 Penman-Monteith (eq. 6), G = 0.

    tmax/tmin: °C, rs: MJ m-2 day-1, ea: actual vapour pressure kPa, u2: wind at 2 m (m/s).
    """
    tmax, tmin, rs, ea, u2 = (np.asarray(x, dtype=float) for x in (tmax, tmin, rs, ea, u2))
    tmean = (tmax + tmin) / 2
    pressure = 101.3 * ((293 - 0.0065 * elev_m) / 293) ** 5.26
    gamma = 0.000665 * pressure
    delta = 4098 * sat_vp(tmean) / (tmean + 237.3) ** 2
    es = (sat_vp(tmax) + sat_vp(tmin)) / 2
    ra = extraterrestrial_radiation(lat_deg, doy)
    rso = (0.75 + 2e-5 * elev_m) * ra
    rns = (1 - 0.23) * rs
    ratio = np.clip(rs / np.where(rso > 0, rso, np.nan), 0.3, 1.0)
    rnl = SIGMA * ((tmax + 273.16) ** 4 + (tmin + 273.16) ** 4) / 2 * (
        0.34 - 0.14 * np.sqrt(np.maximum(ea, 0))) * (1.35 * ratio - 0.35)
    rn = rns - rnl
    num = 0.408 * delta * rn + gamma * 900 / (tmean + 273) * u2 * (es - ea)
    et0 = num / (delta + gamma * (1 + 0.34 * u2))
    return np.maximum(et0, 0)


def add_et0(df: pd.DataFrame, lat: float, elev_m: float) -> pd.DataFrame:
    """Return df with an `ET0` column computed from POWER variables."""
    out = df.copy()
    es = (sat_vp(out["T2M_MAX"]) + sat_vp(out["T2M_MIN"])) / 2
    ea = out["RH2M"] / 100 * es  # FAO-56 eq. 19: mean RH with the mean of es(Tmax), es(Tmin)
    ea = np.minimum(ea, es)
    out["ET0"] = et0_penman_monteith(out["T2M_MAX"], out["T2M_MIN"], out["ALLSKY_SFC_SW_DWN"],
                                     ea, out["WS2M"], elev_m, lat, out.index.day_of_year)
    return out


# ------------------------------------------------------------- GDD, heat, frost
def gdd_daily(tmin, tmax, base: float, upper: float = 30.0) -> np.ndarray:
    """Growing degree days, modified method (temps clipped to [base, upper])."""
    tmin = np.clip(np.asarray(tmin, float), base, upper)
    tmax = np.clip(np.asarray(tmax, float), base, upper)
    return (tmin + tmax) / 2 - base


def gdd_by_year(df: pd.DataFrame, base: float, upper: float = 30.0,
                start_doy: int = 1, end_doy: int = 366) -> pd.Series:
    """Accumulated GDD per year within a day-of-year window (non-wrapping)."""
    d = df[(df.index.day_of_year >= start_doy) & (df.index.day_of_year <= end_doy)]
    g = pd.Series(gdd_daily(d["T2M_MIN"], d["T2M_MAX"], base, upper), index=d.index)
    return g.groupby(g.index.year).sum()


def heat_stress_days(df: pd.DataFrame, threshold: float = 35.0) -> pd.Series:
    """Days per year with Tmax >= threshold."""
    return (df["T2M_MAX"] >= threshold).groupby(df.index.year).sum()


def frost_table(df: pd.DataFrame, lat: float, threshold: float = 0.0) -> pd.DataFrame:
    """Per year: last spring frost doy, first autumn frost doy, frost-free days, frost days.

    "Spring" = first half of the calendar year in the northern hemisphere (second half in
    the southern); the year boundary is split at 1 July (day 182).
    """
    rows = []
    for year, g in df.groupby(df.index.year):
        frost = g[g["T2M_MIN"] <= threshold]
        doy = frost.index.day_of_year
        first_half, second_half = doy[doy <= 182], doy[doy > 182]
        spring, autumn = (first_half, second_half) if lat >= 0 else (second_half, first_half)
        last_spring = (spring.max() if len(spring) else np.nan) if lat >= 0 else \
                      (spring.min() if len(spring) else np.nan)
        first_autumn = (autumn.min() if len(autumn) else np.nan) if lat >= 0 else \
                       (autumn.max() if len(autumn) else np.nan)
        rows.append(dict(year=year, last_spring_frost_doy=last_spring,
                         first_autumn_frost_doy=first_autumn, frost_days=len(frost),
                         frost_free_days=(first_autumn - last_spring)
                         if lat >= 0 and not (np.isnan(last_spring) or np.isnan(first_autumn))
                         else np.nan))
    return pd.DataFrame(rows).set_index("year")


def frost_probability_by_week(df: pd.DataFrame, threshold: float = 0.0) -> pd.Series:
    """Fraction of years in which each week (1..53) has at least one Tmin <= threshold day."""
    wk = np.minimum((df.index.day_of_year - 1) // 7 + 1, 52)
    hit = (df["T2M_MIN"] <= threshold).groupby([df.index.year, wk]).any()
    return hit.groupby(level=1).mean().rename("frost_probability")


# ------------------------------------------------------ climatology and trends
def monthly_climatology(df: pd.DataFrame) -> pd.DataFrame:
    """Mean monthly T (mean/max/min), total P and ET0 averaged across years."""
    cols = {"T2M": "mean", "T2M_MAX": "mean", "T2M_MIN": "mean"}
    m = df.groupby([df.index.year, df.index.month]).agg(
        {**cols, "PRECTOTCORR": "sum", **({"ET0": "sum"} if "ET0" in df else {})})
    clim = m.groupby(level=1).mean()
    clim.index.name = "month"
    if "ET0" in clim:
        clim["water_balance"] = clim["PRECTOTCORR"] - clim["ET0"]
    return clim


@dataclass
class Trend:
    slope_per_decade: float
    ci_low: float
    ci_high: float
    significant: bool  # CI excludes zero


def _theil_sen(x: np.ndarray, y: np.ndarray, n_boot: int = 500, seed: int = 0) -> tuple[float, float, float]:
    """Theil-Sen slope (median of pairwise slopes) with a bootstrap 95% CI."""
    def slope(xi: np.ndarray, yi: np.ndarray) -> float:
        i, j = np.triu_indices(len(xi), k=1)
        dx = xi[j] - xi[i]
        ok = dx != 0
        return float(np.median((yi[j] - yi[i])[ok] / dx[ok])) if ok.any() else 0.0
    rng = np.random.default_rng(seed)
    boots = [slope(x[idx], y[idx]) for idx in (rng.integers(0, len(x), len(x)) for _ in range(n_boot))]
    lo, hi = np.percentile(boots, [2.5, 97.5])
    return slope(x, y), float(lo), float(hi)


def theil_sen_trend(series: pd.Series) -> Trend:
    """Theil-Sen slope (per decade) with bootstrap 95% CI over an annual series indexed by year."""
    s = series.dropna()
    slope, lo, hi = _theil_sen(s.index.values.astype(float), s.values.astype(float))
    return Trend(slope * 10, lo * 10, hi * 10, bool(lo > 0 or hi < 0))


def monthly_water_balance(df: pd.DataFrame) -> pd.DataFrame:
    """Month-by-month (per year) P, ET0 and P - ET0."""
    m = df.groupby([df.index.year, df.index.month]).agg(
        P=("PRECTOTCORR", "sum"), ET0=("ET0", "sum"))
    m["WB"] = m["P"] - m["ET0"]
    m.index.names = ["year", "month"]
    return m


def soil_moisture_anomaly(df: pd.DataFrame, col: str = "GWETROOT") -> pd.DataFrame:
    """Monthly z-score of `col` against the same calendar month across years."""
    m = df[col].groupby([df.index.year, df.index.month]).mean()
    m.index.names = ["year", "month"]
    g = m.groupby(level="month")
    z = (m - g.transform("mean")) / g.transform("std").replace(0, np.nan)
    return pd.DataFrame({col: m, "z": z})


# ----------------------------------------------------------- annual + classes
def annual_features(df: pd.DataFrame, lat: float, heat_threshold: float = 35.0) -> pd.DataFrame:
    """One row per complete year with the headline climate numbers."""
    yr = df.index.year
    out = pd.DataFrame({
        "t_mean": df["T2M"].groupby(yr).mean(),
        "precip": df["PRECTOTCORR"].groupby(yr).sum(),
        "heat_days": heat_stress_days(df, heat_threshold),
        "soil_moist_root": df["GWETROOT"].groupby(yr).mean(),
    })
    if "ET0" in df:
        out["et0"] = df["ET0"].groupby(yr).sum()
        out["water_balance"] = out["precip"] - out["et0"]
    out = out.join(frost_table(df, lat))
    counts = df["T2M"].groupby(yr).count()
    return out[counts >= 360]  # drop incomplete years


def classify_years(ann: pd.DataFrame) -> pd.Series:
    """dry / normal / wet by annual-precipitation terciles (water balance reported alongside)."""
    lo, hi = ann["precip"].quantile([1 / 3, 2 / 3])
    cls = pd.Series("normal", index=ann.index, name="year_class")
    cls[ann["precip"] <= lo] = "dry"
    cls[ann["precip"] >= hi] = "wet"
    return cls


def completeness(df: pd.DataFrame) -> dict[str, float]:
    """Fraction of missing values per column (for the information-gaps section)."""
    return df.isna().mean().round(4).to_dict()


# ------------------------------------------------------------------ NDVI (satellite) features
def ndvi_seasonal_curve(ndvi: pd.Series, bin_days: int = 16) -> pd.DataFrame:
    """Median and p25/p75 NDVI by 16-day period of the year across all years (NaNs ignored)."""
    s = ndvi.dropna()
    period = (s.index.day_of_year - 1) // bin_days
    g = s.groupby(period)
    out = pd.DataFrame({"median": g.median(), "p25": g.quantile(.25), "p75": g.quantile(.75), "n": g.count()})
    out.insert(0, "doy", out.index * bin_days + bin_days // 2)
    return out


def bare_windows_from_ndvi(curve: pd.DataFrame, threshold: float = 0.2, min_days: int = 16,
                           bin_days: int = 16) -> list[tuple[int, int]]:
    """Windows (start_doy, length_days) where the median seasonal NDVI is below `threshold`.

    Periods without data are treated as unknown (they break a window). A window touching the year
    boundary on both sides is merged.
    """
    n = 365 // bin_days + 1
    med = curve["median"].reindex(range(n))
    low = (med < threshold).values
    wins, i = [], 0
    while i < n:
        if low[i]:
            j = i
            while j + 1 < n and low[j + 1]:
                j += 1
            wins.append([i * bin_days + 1, (j - i + 1) * bin_days])
            i = j + 1
        else:
            i += 1
    if len(wins) > 1 and wins[0][0] == 1 and wins[-1][0] + wins[-1][1] >= 365:
        last = wins.pop(); wins[0] = [last[0], last[1] + wins[0][1]]
    return [(s, l) for s, l in wins if l >= min_days]


def observed_bare_summary(ndvi: pd.Series, threshold: float = 0.2, max_gap_days: int = 24) -> dict | None:
    """Bare days from the satellite, counting only days that have a quality-passed observation within `max_gap_days`.

    Observations that fail QA (snow, cloud, shadow) are removed; the NDVI of the days between the remaining ones is linearly
    interpolated, but a day whose nearest good observation is further than `max_gap_days` away is **not observable** and is
    never counted as bare or as not bare. Years with fewer than 12 good observations are skipped.
    A calendar month in which fewer than half of all composites pass QA (median over the record) is also **not observable**: the few
    clear days left are a biased sample (snow-covered and cloudy dates are exactly the ones removed), so a count of 0 there would
    mean "not seen", not "not bare".
    Returns the median per year of bare days (observable days only) and of not-observable days, the calendar months that are poorly
    observed, and for each month the share of composites that pass QA; None if no year qualifies.
    """
    pass_rate = ndvi.notna().groupby(ndvi.index.month).mean()
    poor = [int(m) for m, v in pass_rate.items() if v < 0.5]
    d = ndvi.dropna()
    obs_days = d.index.values.astype("datetime64[D]")
    bare, unobs, share = {}, {}, {}
    for y, g in d.groupby(d.index.year):
        if len(g) < 12:
            continue
        days = pd.date_range(f"{y}-01-01", f"{y}-12-31")
        daily = g.reindex(g.index.union(days)).interpolate("time", limit_area="inside").reindex(days)
        dd = days.values.astype("datetime64[D]")
        i = np.searchsorted(obs_days, dd)
        left = np.where(i > 0, np.abs((dd - obs_days[np.clip(i - 1, 0, len(obs_days) - 1)]).astype(int)), 10**6)
        right = np.where(i < len(obs_days), np.abs((obs_days[np.clip(i, 0, len(obs_days) - 1)] - dd).astype(int)), 10**6)
        observable = (np.minimum(left, right) <= max_gap_days) & ~days.month.isin(poor)
        bare[y] = int(((daily.values < threshold) & observable).sum())
        unobs[y] = int((~observable).sum())
        share[y] = pd.Series(observable, index=days).groupby(days.month).mean()
    if not bare:
        return None
    sh = pd.DataFrame(share).median(axis=1)
    return {"bare_days": float(np.median(list(bare.values()))), "unobservable_days": float(np.median(list(unobs.values()))),
            "observable_share_by_month": sh, "poor_months": poor, "pass_rate_by_month": pass_rate, "years": sorted(bare)}


def observed_bare_days_per_year(ndvi: pd.Series, threshold: float = 0.2) -> pd.Series:
    """Per year: days with linearly interpolated NDVI below threshold (years with <12 valid obs dropped)."""
    out = {}
    for y, g in ndvi.dropna().groupby(ndvi.dropna().index.year):
        if len(g) < 12:
            continue
        days = pd.date_range(f"{y}-01-01", f"{y}-12-31")
        daily = g.reindex(g.index.union(days)).interpolate("time", limit_area="inside").reindex(days)
        out[y] = int((daily < threshold).sum())   # days outside the first/last observation stay NaN, not counted
    return pd.Series(out, name="observed_bare_days")


def root_wetness_summary(df: pd.DataFrame, col: str = "GWETROOT") -> pd.DataFrame:
    """Monthly root-zone wetness (0 dry .. 1 saturated, NASA POWER model) for the soil-moisture chart.

    Columns per calendar month: median, p10, p90 over all years, `latest` (the last complete year) and its z-score.
    """
    m = soil_moisture_anomaly(df, col)
    g = m[col].groupby(level="month")
    out = pd.DataFrame({"median": g.median(), "p10": g.quantile(.1), "p90": g.quantile(.9)})
    last = m.index.get_level_values("year").max()
    latest = m.xs(last, level="year")
    out["latest"], out["latest_z"] = latest[col], latest["z"]
    out.attrs["latest_year"] = int(last)
    return out
