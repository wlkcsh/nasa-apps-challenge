"""Plotly figures for the Streamlit app (consistent farmer-friendly palette). All text goes through i18n (`lang`)."""
from __future__ import annotations

import pandas as pd
import plotly.graph_objects as go
from plotly.subplots import make_subplots

from .crops import load_crops
from .i18n import MONTHS as MONTHS_L
from .i18n import crop_name, tr
from .scoring import PRIORITIES

# Field Shift palette: forest / sage / olive on warm off-white, muted data colours (one hue per meaning).
C = {"rain": "#3F78A5", "et0": "#B9731F", "frost": "#7C9BB8", "heat": "#B04A35", "current": "#8A8470",
     "alt": ["#2F6B45", "#B9731F", "#3F78A5", "#7A5C8E"], "bare": "rgba(176,74,53,0.12)", "ink": "#232623",
     "muted": "#6B6F66", "grid": "#ECE8DC", "forest": "#2F6B45", "sage": "#8FA68A", "olive": "#6B7248"}
FONT = "Inter, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
TEMPLATE = go.layout.Template(layout=dict(
    font=dict(family=FONT, size=13, color=C["ink"]),
    title=dict(font=dict(size=15, color=C["ink"]), x=0, xanchor="left", y=0.97, yanchor="top"),
    xaxis=dict(showgrid=False, zeroline=False, linecolor=C["grid"], ticks="outside", tickcolor=C["grid"], title=dict(font=dict(size=12, color=C["muted"]))),
    yaxis=dict(gridcolor=C["grid"], zeroline=False, linecolor="rgba(0,0,0,0)", title=dict(font=dict(size=12, color=C["muted"]))),
    hoverlabel=dict(bgcolor="#FFFFFF", bordercolor=C["grid"], font=dict(family=FONT, size=12, color=C["ink"])),
    colorway=C["alt"]))
MONTHS = MONTHS_L["en"]
LAYOUT = dict(template=TEMPLATE, margin=dict(l=10, r=10, t=56, b=10), paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)",
              legend=dict(orientation="h", y=-0.18, x=0, font=dict(size=12)))
H = 340
LABEL = {"water_saving": "Water saving", "soil_om": "Soil organic matter", "nitrogen": "Nitrogen fixing",
         "erosion": "Erosion reduction", "forage": "Forage value", "income": "Market / income"}


def label(m: str, lang: str = "en") -> str:
    return tr(f"p.{m}", lang)


def color_for(i: int) -> str:
    return C["current"] if i == 0 else C["alt"][(i - 1) % len(C["alt"])]


def doy_to_date(doy: float, lang: str = "en") -> str:
    """Day of year -> 'Mar 12' (English) or 'Mar 12' with Uzbek month names (month first, then day)."""
    if pd.isna(doy):
        return "n/a"
    d = pd.Timestamp("2001-01-01") + pd.Timedelta(days=int(doy) - 1)
    return f"{MONTHS_L[lang][d.month - 1]} {d.day}"


def fig_water_balance(clim: pd.DataFrame, lang: str = "en") -> go.Figure:
    m = MONTHS_L[lang]
    f = go.Figure()
    f.add_bar(x=m, y=clim["PRECTOTCORR"], name=tr("viz.wb_rain", lang), marker_color=C["rain"])
    f.add_scatter(x=m, y=clim["ET0"], name=tr("viz.wb_et0", lang), mode="lines+markers", line=dict(color=C["et0"], width=3))
    f.update_layout(title=tr("viz.wb_title", lang), yaxis_title=tr("viz.wb_y", lang), height=H, **LAYOUT)
    return f


def fig_temperature(clim: pd.DataFrame, lang: str = "en") -> go.Figure:
    m = MONTHS_L[lang]
    f = go.Figure()
    f.add_scatter(x=m, y=clim["T2M_MAX"], name=tr("ui.t_max", lang), mode="lines+markers", line=dict(color=C["heat"], width=2.5), marker=dict(size=6))
    f.add_scatter(x=m, y=clim["T2M"], name=tr("ui.t_mean", lang), mode="lines", line=dict(color=C["olive"], width=2.5, dash="dot"))
    f.add_scatter(x=m, y=clim["T2M_MIN"], name=tr("ui.t_min", lang), mode="lines+markers", line=dict(color=C["frost"], width=2.5), marker=dict(size=6))
    f.add_hline(y=0, line_color=C["grid"], line_width=1.5)
    f.update_layout(title=tr("ui.chart_temp", lang), yaxis_title=tr("ui.t_y", lang), height=H, **LAYOUT)
    return f


def fig_frost(week_prob: pd.Series, lang: str = "en") -> go.Figure:
    wk = week_prob.reindex(range(1, 53), fill_value=0)
    f = go.Figure(go.Bar(x=wk.index, y=wk.values * 100, marker_color=C["frost"], hovertemplate="%{y:.0f}%<extra></extra>"))
    f.update_xaxes(title_text=tr("viz.week", lang))
    f.update_yaxes(title_text=tr("viz.pct_years", lang), range=[0, 100])
    f.update_layout(title=tr("ui.chart_frost", lang), height=H, **LAYOUT)
    return f


def fig_heat(heat_by_month: pd.Series, heat_thr: float = 35.0, lang: str = "en") -> go.Figure:
    f = go.Figure(go.Bar(x=MONTHS_L[lang], y=heat_by_month.reindex(range(1, 13), fill_value=0).values, marker_color=C["heat"],
                         hovertemplate="%{y:.1f}<extra></extra>"))
    f.update_yaxes(title_text=tr("viz.days", lang))
    f.update_layout(title=f'{tr("ui.chart_heat", lang)} (≥ {heat_thr:.0f} °C)', height=H, **LAYOUT)
    return f


def fig_frost_heat(week_prob: pd.Series, heat_by_month: pd.Series, heat_thr: float = 35.0, lang: str = "en") -> go.Figure:
    m = MONTHS_L[lang]
    f = make_subplots(rows=2, cols=1, vertical_spacing=0.22,
                      subplot_titles=(tr("viz.frost_title", lang), tr("viz.heat_title", lang, thr=heat_thr)))
    wk = week_prob.reindex(range(1, 53), fill_value=0)
    f.add_bar(x=wk.index, y=wk.values * 100, marker_color=C["frost"], showlegend=False, row=1, col=1)
    f.update_xaxes(title_text=tr("viz.week", lang), row=1, col=1)
    f.update_yaxes(title_text=tr("viz.pct_years", lang), row=1, col=1, range=[0, 100])
    f.add_bar(x=m, y=heat_by_month.reindex(range(1, 13), fill_value=0).values, marker_color=C["heat"],
              showlegend=False, row=2, col=1)
    f.update_yaxes(title_text=tr("viz.days", lang), row=2, col=1)
    f.update_layout(height=520, **{**LAYOUT, "margin": dict(l=10, r=10, t=60, b=10)})
    return f


def fig_calendar(rotation, title: str | None = None, lang: str = "en") -> go.Figure:
    db = load_crops()
    m = MONTHS_L[lang]
    total = 365 * rotation.cycle_years
    f = go.Figure()
    for s, n in rotation.bare_windows():
        for a, b in ((s, min(s + n, total)), (0, s + n - total) if s + n > total else (0, 0)):
            if b > a:
                f.add_vrect(x0=a, x1=b, fillcolor=C["bare"], line_width=0, layer="below")
    for i, p in enumerate(rotation.plantings):
        c = db[p.crop_id]
        name = crop_name(p.crop_id, lang, c["name"])
        for a, b in ((p.start % total, min(p.start % total + p.days, total)),
                     (0, p.start % total + p.days - total) if p.start % total + p.days > total else (0, 0)):
            if b > a:
                f.add_bar(y=[name], x=[b - a], base=[a], orientation="h", marker_color=C["alt"][0],
                          opacity=0.85, showlegend=False, hovertemplate=f"{name}<extra></extra>")
    ticks = [mm * 30.4 + y * 365 for y in range(rotation.cycle_years) for mm in (0, 3, 6, 9)]
    f.update_xaxes(tickvals=ticks, ticktext=[f"{m[mm]} {y + 1}" for y in range(rotation.cycle_years) for mm in (0, 3, 6, 9)],
                   range=[0, total])
    f.update_layout(title=title or tr("viz.cal_title", lang), height=170 + 50 * len(rotation.plantings), barmode="overlay", **LAYOUT)
    return f


def fig_radar(res, current, color: str, lang: str = "en") -> go.Figure:
    keys = list(PRIORITIES)
    labels = [tr(f"pshort.{m}", lang) for m in keys]
    f = go.Figure()
    cur = [current.summary[f"norm_{m}"]["median"] for m in keys]
    f.add_scatterpolar(r=cur + cur[:1], theta=labels + labels[:1], name=tr("viz.current", lang), line=dict(color=C["current"], dash="dot"))
    if res is not current:
        v = [res.summary[f"norm_{m}"]["median"] for m in keys]
        f.add_scatterpolar(r=v + v[:1], theta=labels + labels[:1], name=tr("viz.this", lang), fill="toself",
                           line=dict(color=color), opacity=0.8)
    f.update_layout(polar=dict(bgcolor="rgba(0,0,0,0)", radialaxis=dict(range=[0, 100], showticklabels=False, gridcolor="rgba(128,128,128,0.35)"),
                               angularaxis=dict(tickfont=dict(size=12), gridcolor="rgba(128,128,128,0.35)")), height=300,
                    **{**LAYOUT, "margin": dict(l=55, r=55, t=20, b=30), "legend": dict(orientation="h", y=-0.15)})
    return f


def fig_fit_by_year_type(display: list, lang: str = "en") -> go.Figure:
    db = load_crops()
    f = go.Figure()
    for i, r in enumerate(display):
        sc = r.scores
        med, lo, hi = [], [], []
        for cls in ("dry", "normal", "wet"):
            g = sc.loc[sc["year_class"] == cls, "fit"]
            med.append(g.median()); lo.append(g.median() - g.quantile(.1)); hi.append(g.quantile(.9) - g.median())
        name = " > ".join(crop_name(c, lang, db[c]["name"]) for c in r.rotation.crops)
        f.add_bar(x=[tr("viz.dry", lang), tr("viz.normal", lang), tr("viz.wet", lang)], y=med, name=name, marker_color=color_for(i),
                  error_y=dict(type="data", symmetric=False, array=hi, arrayminus=lo))
    f.update_layout(title=tr("viz.fit_title", lang, short=tr("fit.short", lang)),
                    yaxis=dict(title=tr("viz.rel", lang), range=[0, 105]), barmode="group", height=380, **LAYOUT)
    return f


def fig_ndvi(curve: pd.DataFrame, windows: list, threshold: float, lang: str = "en") -> go.Figure:
    m = MONTHS_L[lang]
    f = go.Figure()
    for st_, n in windows:
        f.add_vrect(x0=st_, x1=min(st_ + n, 366), fillcolor=C["bare"], line_width=0, layer="below")
        if st_ + n > 366:
            f.add_vrect(x0=0, x1=st_ + n - 366, fillcolor=C["bare"], line_width=0, layer="below")
    f.add_scatter(x=curve["doy"], y=curve["p75"], mode="lines", line=dict(width=0), showlegend=False, hoverinfo="skip")
    f.add_scatter(x=curve["doy"], y=curve["p25"], mode="lines", line=dict(width=0), fill="tonexty",
                  fillcolor="rgba(46,139,87,0.25)", name=tr("viz.ndvi_spread", lang))
    f.add_scatter(x=curve["doy"], y=curve["median"], mode="lines+markers", line=dict(color="#2e8b57", width=4), name=tr("viz.ndvi_med", lang))
    f.add_hline(y=threshold, line_dash="dot", line_color=C["heat"], annotation_text=tr("viz.ndvi_line", lang))
    f.update_xaxes(tickvals=[mm * 30.4 + 15 for mm in range(12)], ticktext=m, range=[0, 366])
    f.update_layout(title=tr("viz.ndvi_title", lang), yaxis_title=tr("viz.ndvi_y", lang), height=H, **LAYOUT)
    return f


def fig_soil_anomaly(z: pd.DataFrame, lang: str = "en") -> go.Figure:
    mm = MONTHS_L[lang]
    avg = z["z"].groupby(level="month").mean()
    f = go.Figure(go.Bar(x=[mm[i - 1] for i in avg.index], y=avg.values, marker_color=[C["heat"] if v < 0 else C["rain"] for v in avg.values]))
    f.update_layout(title=tr("viz.sm_title", lang), yaxis_title=tr("viz.sm_y", lang), height=H, **LAYOUT)
    return f


def fig_root_wetness(rw: pd.DataFrame, lang: str = "en") -> go.Figure:
    m = MONTHS_L[lang]
    f = go.Figure()
    f.add_scatter(x=m, y=rw["p90"], mode="lines", line=dict(width=0), showlegend=False, hoverinfo="skip")
    f.add_scatter(x=m, y=rw["p10"], mode="lines", line=dict(width=0), fill="tonexty",
                  fillcolor="rgba(43,123,186,0.22)", name=tr("viz.rw_range", lang))
    f.add_scatter(x=m, y=rw["median"], mode="lines", line=dict(color=C["rain"], width=3), name=tr("viz.rw_med", lang))
    f.add_scatter(x=m, y=rw["latest"], mode="lines+markers", line=dict(color=C["et0"], width=3),
                  name=f"{rw.attrs.get('latest_year', 'latest')}")
    f.update_layout(title=tr("viz.rw_title", lang), yaxis=dict(title=tr("viz.rw_y", lang), range=[0, 1]), height=H, **LAYOUT)
    return f
