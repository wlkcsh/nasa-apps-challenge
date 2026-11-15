"""Transparent scoring of rotations, per cycle start year, from climate features and crop traits.

Per planting, from that year's daily weather:
  suitability = 100 * temp_fit * (1 - 0.5*frost_pen) * (1 - 0.5*heat_pen) * gdd_sufficiency
  ETc = sum(Kc_d * ET0_d);  effective rain = min(0.8 * P, ETc);  irrigation demand = ETc - eff. rain
Irrigation supply (fraction `s`, default 1): water available to a planting = s * P90 of that
planting's demand over the record (the "design" demand). If demand > supply:
  relative ET deficit = (demand - supply)/ETc;  yield loss = min(1, Ky * deficit)   (FAO-33: 1-Ya/Ym = Ky*(1-ETa/ETm));
  Ky is the published FAO-33 value where available, else 0.6 + 0.9*(1 - drought_tol) (flagged approx).
  suitability is multiplied by (1 - loss); applied irrigation = supply.
  yield_loss (shown as 'yield at risk') is the water-shortage loss only. Heat is reported as exposure
  (days above the crop's threshold in its season, heat_days_<i> per planting), never converted to yield.
  Heat and frost still enter the suitability score (and through it the fit) as before.
Rotation-level (per year of the cycle):
  water_saving = 100 * (1 - FULL irrigation demand per year / 1200)   (a rotation property: shortage does not 'save' water)
  nitrogen     = 100 * sum(n_credit) / years / 50
  soil_om      = 100 * sum(om * days) / (365 * years) / 0.6
  erosion      = 100 * sum(cover * days) / (365 * years) / 0.8
  forage       = 100 * sum(forage * yield_factor) / years / 0.6
  income       = 100 * sum(income * yield_factor) / years / 0.9    (yield_factor = suitability/100;
                 cover crops have income <= 0 = seed + termination cost)
  pest_break   = 100 * (1 - share of cyclic neighbours from the same family)
total_abs = weighted mean of the six priority subscores x (0.6 + 0.4*suitability/100) x (0.85 + 0.15*pest_break/100).
(total_abs is used only to rank candidates within a rule family; the number shown to users is the
normalised 'fit' from compare.py.)
Year classes (dry/normal/wet) come from terciles of irrigation demand (high demand = "dry").
"""
from __future__ import annotations

from dataclasses import dataclass, fields

import numpy as np
import pandas as pd

from .crops import Crop, kc_curve
from .features import gdd_daily
from .rotations import Planting, Rotation

PRIORITIES = ["water_saving", "soil_om", "nitrogen", "erosion", "forage", "income"]
REF_IRRIGATION_MM = 1200.0
GDD_CAP = 30.0


@dataclass
class Weights:
    water_saving: float = 1.0
    soil_om: float = 1.0
    nitrogen: float = 1.0
    erosion: float = 1.0
    forage: float = 1.0
    income: float = 1.0

    def as_dict(self) -> dict[str, float]:
        return {f.name: getattr(self, f.name) for f in fields(self)}

    def normalized(self) -> dict[str, float]:
        """Weights rescaled to sum to 1 (equal weights if all are zero)."""
        d = self.as_dict()
        tot = sum(d.values())
        return {k: v / tot for k, v in d.items()} if tot > 0 else {k: 1 / len(d) for k in d}


PROFILES = {
    "water-first": Weights(water_saving=8),
    "income-first": Weights(income=8),
    "soil-first": Weights(soil_om=4, nitrogen=4, erosion=4),
}


class DailyClimate:
    """Numpy view of the daily weather for fast window slicing."""

    def __init__(self, df: pd.DataFrame):
        self.start = df.index[0]
        self.n = len(df)
        self.tmin, self.tmax = df["T2M_MIN"].values, df["T2M_MAX"].values
        self.tmean, self.et0, self.p = df["T2M"].values, df["ET0"].values, df["PRECTOTCORR"].values
        self.first_year, self.last_year = df.index.year.min(), df.index.year.max()
        self.memo: dict = {}   # (crop, start, days, year) -> planting result, shared by all rotations

    def window(self, year: int, start: int, days: int) -> slice | None:
        i0 = (pd.Timestamp(year=year, month=1, day=1) - self.start).days + start
        return slice(i0, i0 + days) if i0 >= 0 and i0 + days <= self.n else None


def _trapezoid(t: np.ndarray, tmin: float, lo: float, hi: float, tmax: float) -> np.ndarray:
    up = np.clip((t - tmin) / max(lo - tmin, 1e-6), 0, 1)
    down = np.clip((tmax - t) / max(tmax - hi, 1e-6), 0, 1)
    return np.minimum(up, down)


def score_planting(pl: Planting, crop: Crop, clim: DailyClimate, sl: slice) -> dict[str, float]:
    tmean, tmin, tmax = clim.tmean[sl], clim.tmin[sl], clim.tmax[sl]
    temp_fit = float(_trapezoid(tmean, crop["t_min"], *crop["t_opt"], crop["t_max"]).mean())
    frost_days = int((tmin <= crop["frost_kill_c"]).sum())
    heat_days = int((tmax >= crop["heat_thr_c"]).sum())
    frost_pen = min(1.0, frost_days / 3)
    heat_pen = min(1.0, (heat_days / pl.days) / 0.4)  # 40% of season days hot = full penalty
    gdd = float(gdd_daily(tmin, tmax, crop["gdd_base"], GDD_CAP).sum())
    gdd_suff = min(1.0, gdd / crop["gdd_req"]) if crop["gdd_req"] > 0 else 1.0
    suit = 100 * temp_fit * (1 - 0.5 * frost_pen) * (1 - 0.5 * heat_pen) * gdd_suff
    etc = float((np.array(kc_curve(crop, pl.days)) * clim.et0[sl]).sum())
    rain = float(clim.p[sl].sum())
    eff = min(0.8 * rain, etc)
    return dict(suitability=suit, temp_fit=temp_fit, frost_days=frost_days, heat_days=heat_days,
                gdd=gdd, etc_mm=etc, rain_mm=rain, eff_rain_mm=eff, irrigation_mm=etc - eff)


def static_subscores(rot: Rotation, db: dict[str, Crop]) -> dict[str, float]:
    """Subscores that depend only on crop traits and the calendar (not on yearly weather)."""
    k = rot.cycle_years
    pls = [(p, db[p.crop_id]) for p in rot.plantings]
    n = sum(c["n_credit"] for _, c in pls) / k
    om = sum(c["om"] * p.days for p, c in pls) / (365 * k)
    cover = sum(c["cover"] * p.days for p, c in pls) / (365 * k)
    fam = [c["family"] for _, c in pls]
    same = sum(fam[i] == fam[(i + 1) % len(fam)] for i in range(len(fam))) if len(fam) > 1 else 1
    pest = 100 * (1 - same / max(len(fam), 1))
    return dict(nitrogen=min(100, 100 * n / 50), soil_om=min(100, 100 * om / 0.6),
                erosion=min(100, 100 * cover / 0.8), pest_break=pest,
                bare_days=rot.bare_days_per_year())


def _memo_planting(p: Planting, crop: Crop, clim: DailyClimate, sl: slice, year: int) -> dict:
    key = (p.crop_id, p.start, p.days, year)
    if key not in clim.memo:
        clim.memo[key] = score_planting(p, crop, clim, sl)
    return clim.memo[key]


def planting_table(rot: Rotation, db: dict[str, Crop], clim: DailyClimate) -> dict[int, list[dict]]:
    """Raw (full-demand) per-planting results for every start year with complete data."""
    out: dict[int, list[dict]] = {}
    for y in range(clim.first_year, clim.last_year + 1):
        sls = [clim.window(y, p.start, p.days) for p in rot.plantings]
        if all(sl is not None for sl in sls):
            out[y] = [_memo_planting(p, db[p.crop_id], clim, sl, y) for p, sl in zip(rot.plantings, sls)]
    return out


def irrigation_demand_by_year(rot: Rotation, table: dict[int, list[dict]]) -> pd.Series:
    """Full irrigation demand (mm per year of cycle) per start year."""
    return pd.Series({y: sum(r["irrigation_mm"] for r in rows) / rot.cycle_years
                      for y, rows in table.items()}, name="irrigation_demand")


def classify_by_demand(demand: pd.Series) -> pd.Series:
    """dry (top tercile of irrigation demand) / normal / wet (bottom tercile)."""
    lo, hi = demand.quantile([1 / 3, 2 / 3])
    cls = pd.Series("normal", index=demand.index, name="year_class")
    cls[demand >= hi] = "dry"
    cls[demand <= lo] = "wet"
    return cls


def score_rotation(rot: Rotation, db: dict[str, Crop], clim: DailyClimate, weights: Weights,
                   year_classes: pd.Series, irrigation_supply: float = 1.0,
                   table: dict[int, list[dict]] | None = None) -> pd.DataFrame:
    """One row per cycle start year with all subscores and the year's dry/normal/wet class."""
    static = static_subscores(rot, db)
    table = table or planting_table(rot, db, clim)
    k = rot.cycle_years
    # design demand per planting = P90 over years; available water = supply * design demand
    design = [np.percentile([rows[i]["irrigation_mm"] for rows in table.values()], 90)
              for i in range(len(rot.plantings))]
    w = weights.as_dict()
    rows_out = []
    for y, rows in table.items():
        suits, applied, losses, forage, income = [], [], [], 0.0, 0.0
        for i, (p, r) in enumerate(zip(rot.plantings, rows)):
            c = db[p.crop_id]
            demand, supply = r["irrigation_mm"], irrigation_supply * design[i]
            short = max(0.0, demand - supply)
            loss = min(1.0, c["ky"] * short / r["etc_mm"]) if r["etc_mm"] > 0 else 0.0
            suit = r["suitability"] * (1 - loss)
            suits.append(suit); losses.append(loss); applied.append(demand - short)
            forage += c["forage"] * suit / 100
            income += c["income"] * suit / 100
        suit_m, irr = float(np.mean(suits)), sum(applied) / k
        full = sum(r['irrigation_mm'] for r in rows) / k
        sub = dict(water_saving=float(np.clip(100 * (1 - full / REF_IRRIGATION_MM), 0, 100)),
                   soil_om=static["soil_om"], nitrogen=static["nitrogen"], erosion=static["erosion"],
                   forage=float(np.clip(100 * forage / k / 0.6, 0, 100)),
                   income=float(np.clip(100 * income / k / 0.9, 0, 100)))
        prior = sum(w[m] * sub[m] for m in PRIORITIES) / max(sum(w.values()), 1e-9)
        total = prior * (0.6 + 0.4 * suit_m / 100) * (0.85 + 0.15 * static["pest_break"] / 100)
        rows_out.append(dict(year=y, total_abs=total, suitability=suit_m, pest_break=static["pest_break"],
                             irrigation_mm_per_year=irr, irrigation_demand_mm=full, bare_days=static["bare_days"],
                             yield_loss=float(np.mean(losses)),
                             **{f"heat_days_{i}": r_["heat_days"] for i, r_ in enumerate(rows)},
                             n_kg=sum(db[p.crop_id]['n_credit'] for p in rot.plantings) / k,
                             heat_days=sum(r["heat_days"] for r in rows) / k,
                             frost_days=sum(r["frost_days"] for r in rows) / k, **sub))
    df = pd.DataFrame(rows_out).set_index("year")
    df["year_class"] = year_classes.reindex(df.index)
    return df


def summarize(scores: pd.DataFrame, cols: list[str] | None = None) -> dict[str, dict[str, float]]:
    """Median and p10-p90 across all years and for each year class, per column (vectorised)."""
    cols = cols or ["total_abs", *PRIORITIES, "suitability", "pest_break", "irrigation_mm_per_year",
                    "heat_days", "frost_days", "yield_loss", "irrigation_demand_mm", "n_kg", "bare_days"]
    arr = scores[cols].to_numpy(float)
    med = np.nanmedian(arr, axis=0)
    p10, p90 = np.nanpercentile(arr, [10, 90], axis=0)
    out = {c: {"median": float(med[i]), "p10": float(p10[i]), "p90": float(p90[i])} for i, c in enumerate(cols)}
    cls = scores["year_class"].to_numpy(object)
    for k in sorted({x for x in cls if isinstance(x, str)}):
        m = np.array([x == k for x in cls])
        mm = np.nanmedian(arr[m], axis=0)
        for i, c in enumerate(cols):
            out[c][f"median_{k}"] = float(mm[i])
    return out
