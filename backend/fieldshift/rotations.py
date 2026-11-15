"""Rotations: calendar scheduling, feasibility and rule-based candidate generation.

A rotation is an ordered crop sequence that repeats. `schedule` places each crop at the earliest
day in its sowing window after the previous crop is harvested (plus a gap), counting days from
1 January of cycle year 0 (365-day years). The cycle length is the smallest number of whole
years (<= 3) after which the first crop can be sown again. Overlaps are impossible by construction.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Callable

import numpy as np
import pandas as pd

from .crops import Crop
from .i18n import CropRef, Msg
from .features import gdd_daily

GAP_DAYS = 7
MAX_CYCLE_YEARS = 3
BARE_WINDOW_MIN_DAYS = 45


@dataclass(frozen=True)
class Planting:
    crop_id: str
    start: int   # absolute day (0 = 1 Jan of cycle year 0)
    days: int

    @property
    def end(self) -> int:
        return self.start + self.days


@dataclass
class Rotation:
    crops: tuple[str, ...]
    plantings: tuple[Planting, ...]
    cycle_years: int
    rule: str = "current"            # current | legume | cover | swap_drought | income | perennial | winter_crop | pinned
    detail: str = ""                 # what changed vs current, e.g. "adds hairy_vetch"
    added: tuple[str, ...] = ()
    removed: tuple[str, ...] = ()
    feasibility_notes: list[str] = field(default_factory=list)

    @property
    def key(self) -> str:
        return " > ".join(self.crops)

    def bare_days_per_year(self) -> float:
        used = sum(p.days for p in self.plantings)
        return max(0.0, (365 * self.cycle_years - used) / self.cycle_years)

    def bare_windows(self) -> list[tuple[int, int]]:
        """Bare gaps as (start_doy, length) within the cycle, longer than BARE_WINDOW_MIN_DAYS."""
        total = 365 * self.cycle_years
        covered = np.zeros(total, bool)
        for p in self.plantings:
            for d in range(p.start, min(p.end, p.start + total)):
                covered[d % total] = True
        out, d = [], 0
        while d < total:
            if not covered[d]:
                s = d
                while d < total and not covered[d]:
                    d += 1
                if d - s >= BARE_WINDOW_MIN_DAYS:
                    out.append((s, d - s))
            else:
                d += 1
        if len(out) > 1 and out[0][0] == 0 and out[-1][0] + out[-1][1] == total:
            first, last = out.pop(0), out.pop()   # merge window wrapping the cycle boundary
            out.append((last[0], last[1] + first[1]))
        return out


def schedule(crops: tuple[str, ...], db: dict[str, Crop]) -> Rotation | None:
    """Place crops on the calendar; None if the cycle cannot close within MAX_CYCLE_YEARS."""
    plantings: list[Planting] = []
    prev_end: int | None = None
    for cid in crops:
        a, b = db[cid]["sow_doy"]
        if prev_end is None:
            start = (a + b) // 2
        else:
            start = None
            for y in range(0, 5):
                if y * 365 + b >= prev_end + GAP_DAYS:
                    start = max(y * 365 + a, prev_end + GAP_DAYS)
                    break
            if start is None:
                return None
        pl = Planting(cid, start, int(db[cid]["days"]))
        plantings.append(pl)
        prev_end = pl.end
    a, b = db[crops[0]]["sow_doy"]
    for k in range(1, MAX_CYCLE_YEARS + 1):
        if k * 365 + b >= prev_end + GAP_DAYS and (k * 365 + b) - (plantings[0].start) >= 0:
            if max(k * 365 + a, prev_end + GAP_DAYS) <= k * 365 + b:
                return Rotation(tuple(crops), tuple(plantings), k)
    return None


@dataclass
class ClimateClimatology:
    """Day-of-year mean climate used for feasibility screening (365 entries each)."""
    tmin: np.ndarray
    tmax: np.ndarray
    last_frost_doy: float
    first_frost_doy: float

    @classmethod
    def from_daily(cls, df: pd.DataFrame, frost_table: pd.DataFrame) -> "ClimateClimatology":
        doy = np.minimum(df.index.day_of_year.values, 365)
        g = df.groupby(doy)
        return cls(g["T2M_MIN"].mean().reindex(range(1, 366)).values,
                   g["T2M_MAX"].mean().reindex(range(1, 366)).values,
                   float(frost_table["last_spring_frost_doy"].median()),
                   float(frost_table["first_autumn_frost_doy"].median()))


def check_feasible(rot: Rotation, db: dict[str, Crop], clim: ClimateClimatology,
                   gdd_cap: float = 30.0) -> tuple[bool, list[str]]:
    """Frost-free-season and GDD screening of every planting against median climate."""
    notes: list = []
    for p in rot.plantings:
        c = db[p.crop_id]
        idx = np.arange(p.start, p.end) % 365
        doy_start = p.start % 365
        if c["frost_kill_c"] > -3:  # frost-sensitive
            if not np.isnan(clim.last_frost_doy) and doy_start < clim.last_frost_doy - 5:
                notes.append(Msg("f.early", crop=CropRef(p.crop_id, c["name"]), day=doy_start, frost=clim.last_frost_doy))
            mature = (p.start + int(p.days * 0.85)) % 365
            if not np.isnan(clim.first_frost_doy) and p.start % 365 < mature and mature > clim.first_frost_doy + 5:
                notes.append(Msg("f.late", crop=CropRef(p.crop_id, c["name"])))
        if c["gdd_req"] > 0:
            gdd = gdd_daily(clim.tmin[idx], clim.tmax[idx], c["gdd_base"], gdd_cap).sum()
            if gdd < 0.85 * c["gdd_req"]:
                notes.append(Msg("f.gdd", crop=CropRef(p.crop_id, c["name"]), gdd=gdd, req=c["gdd_req"]))
    return (not notes, notes)


def _insertions(crops: tuple[str, ...], cid: str):
    for pos in range(len(crops) + 1):
        yield crops[:pos] + (cid,) + crops[pos:]


def _no_adjacent_repeat(crops: tuple[str, ...]) -> bool:
    return all(crops[i] != crops[(i + 1) % len(crops)] for i in range(len(crops))) or len(crops) == 1


def generate_candidates(current: tuple[str, ...], db: dict[str, Crop], clim: ClimateClimatology,
                        scorer: Callable[[Rotation], float], n_alternatives: int = 4,
                        pinned: tuple[tuple[str, ...], ...] = (), n_per_rule: int = 1) -> list[Rotation]:
    """Current rotation first, then up to n alternatives (best `n_per_rule` per rule family).

    `pinned` rotations are always included when calendar- and climate-feasible.
    """
    cur = schedule(current, db)
    if cur is None:
        raise ValueError(f"Current rotation {current} cannot be scheduled on the calendar")
    cur.feasibility_notes = check_feasible(cur, db, clim)[1]
    seen = {current}
    by_rule: dict[str, list[Rotation]] = {}

    def consider(rule: str, crops: tuple[str, ...], detail: str, added=(), removed=(),
                 same_cycle: bool = False) -> None:
        if crops in seen or not _no_adjacent_repeat(crops):
            return
        r = schedule(crops, db)
        if r is None or (same_cycle and r.cycle_years != cur.cycle_years):
            return
        ok, notes = check_feasible(r, db, clim)
        if not ok:
            return
        r.rule, r.detail, r.added, r.removed = rule, detail, tuple(added), tuple(removed)
        by_rule.setdefault(rule, []).append(r)

    for cid, c in db.items():
        if cid in current:
            continue
        for crops in _insertions(current, cid):
            if c["n_fixing"] and c["season"] in ("summer", "winter"):
                consider("legume", crops, Msg("d.adds", crop=CropRef(cid, c["name"])), (cid,))
            if c["season"] == "cover":
                consider("cover", crops, Msg("d.adds_bare", crop=CropRef(cid, c["name"])), (cid,), same_cycle=True)
            if c["season"] == "perennial":
                consider("perennial", crops, Msg("d.adds", crop=CropRef(cid, c["name"])), (cid,))
            if c["season"] == "winter" and not c["n_fixing"]:
                consider("winter_crop", crops, Msg("d.adds_break", crop=CropRef(cid, c["name"])), (cid,))
    for i, old in enumerate(current):
        oc = db[old]
        for cid, c in db.items():
            if cid in current or c["season"] != oc["season"] or c["season"] in ("cover", "perennial"):
                continue
            if c["income"] >= oc["income"] + 0.1:
                consider("income", current[:i] + (cid,) + current[i + 1:],
                         Msg("d.repl_income", old=CropRef(old, oc["name"]), new=CropRef(cid, c["name"])), (cid,), (old,))
            if c["drought_tol"] > oc["drought_tol"] and c["water_need_mm"] < oc["water_need_mm"]:
                consider("swap_drought", current[:i] + (cid,) + current[i + 1:],
                         Msg("d.repl_drought", old=CropRef(old, oc["name"]), new=CropRef(cid, c["name"])), (cid,), (old,))

    for crops in pinned:
        consider("pinned", tuple(crops), Msg("d.pinned", crops=tuple(CropRef(c, db[c]["name"]) for c in crops)))
    picks: list[Rotation] = []
    for rule, cands in by_rule.items():
        if rule != "pinned":
            picks.extend(sorted(cands, key=scorer, reverse=True)[:n_per_rule])
    picks.sort(key=scorer, reverse=True)
    picks = picks[:n_alternatives]
    keys = {r.crops for r in picks}
    picks += [r for r in by_rule.get("pinned", []) if r.crops not in keys]
    return [cur] + picks
