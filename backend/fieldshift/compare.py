"""Normalise subscores across the candidate set and combine them with the farmer's priority weights.

For each priority criterion the natural value of every rotation (median over years) is min-max
scaled to 0-100 *across the options being compared* (water: irrigation demand in mm, lower is
better; the others: their 0-100 trait subscores, higher is better). If the options barely differ
(range below a floor) the criterion is a tie and every option gets 50. Weights are rescaled to sum to 1.
fit = sum(w * normalised) x (0.6 + 0.4*climate_suitability/100) x (0.85 + 0.15*pest_break/100)
"""
from __future__ import annotations

import numpy as np
import pandas as pd

from .scoring import PRIORITIES, Weights, summarize

FIT_LABEL = "Fit to your priorities (compared among these options)"
FIT_SHORT = "Fit to your priorities"
# minimum spread across options (natural units) for a criterion to count; else all options tie at 50
FLOORS = {"water_saving": 30.0,   # mm irrigation per year
          "soil_om": 5.0, "nitrogen": 5.0, "erosion": 5.0, "forage": 5.0, "income": 5.0}   # score points
BARE_DAYS_FLOOR = 10.0            # erosion also ties if bare-days differ by < 10 days/year
NATURAL = {"water_saving": "irrigation_demand_mm"}


def _natural(res, m: str) -> float:
    return float(res.scores[NATURAL.get(m, m)].median())


def apply(results: list, weights: Weights) -> dict[str, bool]:
    """Add norm_<criterion> and fit columns to each result's scores, refresh summaries.

    Returns {criterion: tied}. Safe to call repeatedly with new weights (raw columns are untouched).
    """
    w = weights.normalized()
    tied: dict[str, bool] = {}
    bare = [r.rotation.bare_days_per_year() for r in results]
    for m in PRIORITIES:
        vals = np.array([_natural(r, m) for r in results])
        lo, hi = vals.min(), vals.max()
        tie = (hi - lo) < FLOORS[m]
        if m == "erosion" and (max(bare) - min(bare)) < BARE_DAYS_FLOOR:
            tie = True
        tied[m] = bool(tie)
        for r in results:
            raw = r.scores[NATURAL.get(m, m)]
            if tie:
                r.scores[f"norm_{m}"] = 50.0
            else:
                n = (raw - lo) / (hi - lo) * 100
                r.scores[f"norm_{m}"] = (100 - n if m == "water_saving" else n).clip(0, 100)
    for r in results:
        sc = r.scores
        prior = sum(w[m] * sc[f"norm_{m}"] for m in PRIORITIES)
        sc["fit"] = prior * (0.6 + 0.4 * sc["suitability"] / 100) * (0.85 + 0.15 * sc["pest_break"] / 100)
        r.summary = summarize(sc, [*summarize_cols(sc)])
        r.tied = tied
    return tied


def summarize_cols(sc: pd.DataFrame) -> list[str]:
    return ["fit", "total_abs", *PRIORITIES, *[f"norm_{m}" for m in PRIORITIES], "suitability", "pest_break",
            "irrigation_mm_per_year", "irrigation_demand_mm", "heat_days", "frost_days", "yield_loss",
            *[c for c in sc.columns if c.startswith("heat_days_")], "n_kg", "bare_days"]
