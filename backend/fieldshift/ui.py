"""Field Shift design system: CSS tokens + small HTML components used by app.py.

Everything visual lives here (colours, type, spacing, cards, KPI tiles, comparison table). No text is hard-coded: callers pass
already-translated strings. All strings are HTML-escaped here unless a parameter is documented as markup.
"""
from __future__ import annotations

from html import escape as esc

import streamlit as st

LOGO_SVG = ('<svg viewBox="0 0 32 32" width="30" height="30" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">'
            '<rect width="32" height="32" rx="8" fill="#2F6B45"/>'
            '<path d="M6 12.5 L26 7.5" stroke="#CFE0C8" stroke-width="3" stroke-linecap="round"/>'
            '<path d="M6 19 L26 14" stroke="#EAF1E4" stroke-width="3" stroke-linecap="round"/>'
            '<path d="M6 25.5 L26 20.5" stroke="#B9C48A" stroke-width="3" stroke-linecap="round"/></svg>')

# faint contour lines for the hero panel (decorative)
_CONTOUR = ("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='420' height='200' viewBox='0 0 420 200' fill='none' "
            "stroke='%232F6B45' stroke-opacity='0.13' stroke-width='1.2'><path d='M0 150C80 120 130 170 210 140S350 90 420 120'/>"
            "<path d='M0 120C80 90 130 140 210 110S350 60 420 90'/><path d='M0 90C80 60 130 110 210 80S350 30 420 60'/>"
            "<path d='M0 60C80 30 130 80 210 50S350 0 420 30'/><path d='M0 180C80 150 130 200 210 170S350 120 420 150'/></svg>")

CSS = """
<style>
:root{
  --fs-forest:#2F6B45; --fs-forest-d:#234E35; --fs-sage:#8FA68A; --fs-sage-l:#E8EEE2; --fs-olive:#6B7248;
  --fs-bg:#FAF8F3; --fs-surface:#FFFFFF; --fs-ink:#232623; --fs-muted:#6B6F66; --fs-border:#E3DFD3; --fs-amber:#B9731F;
  --fs-font: Inter, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
}
html, body, .stApp, [class*="css"]{font-family:var(--fs-font); color:var(--fs-ink);}
.stApp{background:var(--fs-bg);}
#MainMenu, footer, [data-testid="stToolbar"], [data-testid="stDecoration"]{visibility:hidden; height:0;}
header[data-testid="stHeader"]{background:transparent; pointer-events:none;}
header[data-testid="stHeader"] button, header[data-testid="stHeader"] a{pointer-events:auto;}
.block-container{max-width:min(1640px, 96vw); padding:1.1rem 2rem 3.5rem;}
h1,h2,h3,h4{color:var(--fs-ink); letter-spacing:-0.01em; font-weight:650;}
[data-testid="stMarkdownContainer"] h2, h2{font-size:1.2rem !important; margin:2.1rem 0 .15rem !important; padding:0 !important; font-weight:650 !important;}
h3{font-size:1.05rem;} [data-testid="stMarkdownContainer"] h4{font-size:1rem !important;}
p, li, label, .stMarkdown{font-size:15px;}
[data-testid="stCaptionContainer"]{color:var(--fs-muted);}
section[data-testid="stSidebar"]{background:#F3F1E8; border-right:1px solid var(--fs-border);}
section[data-testid="stSidebar"] .block-container{padding-top:1.2rem;}
section[data-testid="stSidebar"][aria-expanded="true"]{min-width:340px; max-width:340px;}
.fs-rotprev{display:flex; flex-wrap:wrap; align-items:center; gap:.3rem; margin:.1rem 0 .7rem;}
.fs-rotprev span.c{background:var(--fs-sage-l); border:1px solid #D3DDC9; color:var(--fs-forest-d); border-radius:6px; padding:.12rem .55rem; font-size:.82rem; font-weight:600;}
.fs-rotprev span.a{color:var(--fs-muted);}
.fs-grp{font-size:.74rem; font-weight:650; color:var(--fs-olive); margin:.5rem 0 .1rem; text-transform:uppercase; letter-spacing:.06em;}
.st-key-sidecrops{background:#fff; border:1px solid var(--fs-border) !important; border-radius:10px; padding:.6rem .7rem .6rem;}
.fs-side-h{font-size:.72rem; text-transform:uppercase; letter-spacing:.08em; color:var(--fs-muted); font-weight:650; margin:1.1rem 0 .35rem;}

/* ---------- header ---------- */
.fs-brand{display:flex; align-items:center; gap:.65rem; padding:.2rem 0;}
.fs-brand b{font-size:1.15rem; letter-spacing:-0.02em; font-weight:700; display:block; line-height:1.1;}
.fs-brand span{font-size:.74rem; color:var(--fs-muted); display:block; line-height:1.2; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;}
.st-key-nav [role="radiogroup"], .st-key-langbox [role="radiogroup"]{gap:.2rem; flex-wrap:wrap;}
.st-key-nav label[data-testid="stRadioOption"], .st-key-langbox label[data-testid="stRadioOption"]{
  margin:0; padding:.38rem .85rem; border-radius:8px; cursor:pointer; border:1px solid transparent; background:transparent;}
.st-key-nav label[data-testid="stRadioOption"] > div > div:first-child, .st-key-langbox label[data-testid="stRadioOption"] > div > div:first-child{display:none;}
.st-key-nav label[data-testid="stRadioOption"] p, .st-key-langbox label[data-testid="stRadioOption"] p{font-size:.9rem; font-weight:550; color:var(--fs-muted);}
.st-key-nav label[data-testid="stRadioOption"]:hover, .st-key-langbox label[data-testid="stRadioOption"]:hover{background:#EFECE2;}
.st-key-nav label[data-testid="stRadioOption"][data-selected="true"]{background:var(--fs-sage-l); border-color:#D3DDC9;}
.st-key-nav label[data-testid="stRadioOption"][data-selected="true"] p{color:var(--fs-forest-d);}
.st-key-langbox [role="radiogroup"]{background:#EFECE2; border-radius:9px; padding:3px; display:inline-flex; gap:2px; float:right;}
.st-key-langbox label[data-testid="stRadioOption"]{padding:.25rem .7rem;}
.st-key-langbox label[data-testid="stRadioOption"][data-selected="true"]{background:#fff; border-color:var(--fs-border); box-shadow:0 1px 1px rgba(0,0,0,.04);}
.st-key-langbox label[data-testid="stRadioOption"][data-selected="true"] p{color:var(--fs-ink);}
.st-key-langbox [data-testid="stWidgetLabel"]{display:none;}
.fs-lyrs{display:flex; flex-wrap:wrap; gap:.25rem .9rem; font-size:.78rem; color:var(--fs-muted); margin:.15rem 0 .2rem;}
.fs-lyrs .h{text-transform:uppercase; letter-spacing:.06em; font-weight:650; font-size:.7rem;}
.fs-lyr b{color:var(--fs-ink); font-weight:600;} .fs-lyr.off{color:#8A5313;}
.fs-rule{height:1px; background:var(--fs-border); margin:.5rem 0 .9rem;}
.fs-notice{font-size:.82rem; color:var(--fs-muted); display:flex; gap:.5rem; align-items:center; margin:.1rem 0 .6rem;}
.fs-notice i{width:7px; height:7px; border-radius:50%; background:var(--fs-amber); display:inline-block; flex:none;}

/* ---------- panels (bordered containers whose key starts with panel) ---------- */
[class*="st-key-panel"]{background:var(--fs-surface); border:1px solid var(--fs-border) !important; border-radius:10px; padding:.35rem .5rem;}
.st-key-panel_summary{border-left:4px solid var(--fs-forest) !important;}
[class*="st-key-bar"]{background:var(--fs-surface); border:1px solid var(--fs-border) !important; border-radius:10px; padding:.5rem .8rem .2rem;}

/* ---------- hero (selected field) ---------- */
.st-key-hero{background:var(--fs-sage-l) url("%CONTOUR%") right bottom/auto 70% no-repeat; border:1px solid #D3DDC9 !important; border-radius:12px; padding:1.1rem 1.4rem 1rem; margin:.3rem 0 .4rem;}
.fs-eyebrow{font-size:.72rem; text-transform:uppercase; letter-spacing:.09em; color:var(--fs-forest); font-weight:700;}
.fs-hero h1{font-size:1.75rem; margin:.1rem 0 .45rem; line-height:1.15;}
.fs-meta{display:flex; flex-wrap:wrap; gap:.4rem .5rem; align-items:center; margin-bottom:.55rem;}
.fs-coord{display:inline-flex; align-items:center; gap:.35rem; background:#fff; border:1px solid #D3DDC9; border-radius:7px; padding:.14rem .6rem; font-size:.84rem; font-weight:600; font-variant-numeric:tabular-nums;}
.fs-coord svg{width:12px; height:12px; flex:none;}
.fs-meta .lbl{font-size:.78rem; color:var(--fs-muted); margin-left:.3rem;}
.fs-hero p.lead{max-width:600px; font-size:.97rem; color:#3B3F39; margin:.2rem 0 .3rem;}

/* ---------- data availability ---------- */
.fs-data{background:rgba(255,255,255,.72); border:1px solid #D3DDC9; border-radius:10px; padding:.7rem .9rem .6rem; backdrop-filter:blur(2px);}
.fs-data h4{padding:0 !important; line-height:1.2 !important; font-size:.72rem !important; text-transform:uppercase; letter-spacing:.08em; color:var(--fs-muted); margin:0 0 .35rem !important; font-weight:650;}
.fs-dr{display:flex; align-items:center; gap:.55rem; padding:.28rem 0; border-top:1px solid #E8E5DA; font-size:.85rem;}
.fs-dr:first-of-type{border-top:none;}
.fs-dr .dot{width:9px; height:9px; border-radius:50%; flex:none;}
.fs-dr.ok .dot{background:var(--fs-forest);}
.fs-dr.miss .dot{background:transparent; border:2px solid var(--fs-amber);}
.fs-dr.na .dot{background:transparent; border:2px solid #BDB8A6; width:9px; height:2px; border-radius:2px; border-width:0; background:#BDB8A6; height:3px;}
.fs-dr .nm{flex:1; color:var(--fs-ink);}
.fs-dr .st{font-size:.76rem; font-weight:600;}
.fs-dr.ok .st{color:var(--fs-forest-d);} .fs-dr.miss .st{color:#8A5313;} .fs-dr.na .st{color:var(--fs-muted);}
.fs-dnote{font-size:.76rem; color:var(--fs-muted); margin-top:.4rem; line-height:1.4;}

/* ---------- KPI tiles ---------- */
.fs-kpis{display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); gap:10px;}
.fs-kpis.c3{grid-template-columns:repeat(3,minmax(0,1fr)); grid-auto-rows:minmax(212px,1fr);}
.fs-kpi{background:var(--fs-surface); border:1px solid var(--fs-border); border-radius:10px; padding:.8rem .95rem .75rem;}
.fs-kpi .n{font-size:.74rem; text-transform:uppercase; letter-spacing:.06em; color:var(--fs-muted); font-weight:650;}
.fs-kpi .v{font-size:1.75rem; font-weight:680; letter-spacing:-0.02em; line-height:1.15; margin:.15rem 0 .05rem;}
.fs-kpi .v small{font-size:.8rem; color:var(--fs-muted); font-weight:550; letter-spacing:0; margin-left:.25rem;}
.fs-kpi .d{font-size:.8rem; color:var(--fs-muted); line-height:1.35;}
.fs-kpi .c{font-size:.78rem; color:var(--fs-forest-d); border-top:1px dashed var(--fs-border); margin-top:.45rem; padding-top:.35rem; line-height:1.35;}
.fs-kpi .c.warn{color:#8A5313;}

/* ---------- comparison table ---------- */
.fs-tablewrap{overflow-x:auto; background:var(--fs-surface); border:1px solid var(--fs-border); border-radius:10px;}
table.fs-table{border-collapse:collapse; width:100%; min-width:560px; font-size:.88rem;}
.fs-table th{background:#F6F4EC; text-align:left; font-weight:650; padding:.6rem .8rem; border-bottom:1px solid var(--fs-border); vertical-align:bottom;}
.fs-table th small{display:block; color:var(--fs-muted); font-weight:500; font-size:.72rem;}
.fs-table td{padding:.55rem .8rem; border-bottom:1px solid #F0EDE2; vertical-align:top;}
.fs-table tr:last-child td{border-bottom:none;}
.fs-table td.m{color:var(--fs-muted); width:28%;}
.fs-table tr.nt td{font-size:.78rem; color:var(--fs-muted); white-space:normal; padding:.3rem .8rem; font-style:italic;}
.fs-table tr.grp td{background:#F6F4EC; font-size:.72rem; text-transform:uppercase; letter-spacing:.07em; font-weight:700; color:var(--fs-olive); padding:.4rem .8rem;}
.fs-table th.top{background:#EEF4E8; border-top:3px solid var(--fs-forest);}
.fs-table .tag2{display:inline-block; background:var(--fs-forest); color:#fff; font-size:.64rem; letter-spacing:.05em; text-transform:uppercase; padding:.05rem .4rem; border-radius:4px; margin-bottom:.25rem;}
.fs-table td.best{font-weight:680; color:var(--fs-forest-d); background:#F1F6EC;}
.fs-table td.cur, .fs-table th.cur{border-left:3px solid #CFC8B4;}
.fs-table .num{font-variant-numeric:tabular-nums;}

/* ---------- option cards ---------- */
.fs-opt-h{font-size:1.02rem; font-weight:680; line-height:1.3; margin-bottom:.25rem;}
.fs-tag{display:inline-block; font-size:.7rem; font-weight:650; letter-spacing:.04em; text-transform:uppercase; padding:.12rem .5rem; border-radius:5px;
  background:#ECE8DC; color:#5C584A;}
.fs-tag.top{background:var(--fs-forest); color:#fff;}
.fs-tag.new{background:var(--fs-sage-l); color:var(--fs-forest-d);}
.fs-score{display:flex; align-items:baseline; gap:.4rem; margin:.5rem 0 .2rem;}
.fs-score b{font-size:2.3rem; font-weight:700; letter-spacing:-0.03em; color:var(--fs-forest-d); line-height:1;}
.fs-score span{font-size:.8rem; color:var(--fs-muted);}
.fs-bar{height:6px; background:#ECE8DC; border-radius:4px; overflow:hidden; margin:.1rem 0 .35rem;}
.fs-bar i{display:block; height:100%; background:var(--fs-forest); border-radius:4px;}
.fs-line{font-size:.85rem; margin:.18rem 0; color:var(--fs-ink);}
.st-key-panel_cardtop{border:2px solid var(--fs-forest) !important;}
.fs-next{display:flex; gap:1rem; align-items:center; justify-content:space-between;}
.fs-next b{font-size:1.05rem;} .fs-next span{color:var(--fs-muted); font-size:.9rem;}
.fs-summary{border-left:4px solid var(--fs-forest); padding:.2rem 0 .2rem 1rem;}

/* ---------- widgets ---------- */
.stButton > button[kind="primary"], .stFormSubmitButton > button[kind="primary"]{background:var(--fs-forest); border:1px solid var(--fs-forest-d); border-radius:8px; font-weight:600;}
.stButton > button[kind="primary"]:hover{background:var(--fs-forest-d);}
.stButton > button, .stFormSubmitButton > button{border-radius:8px;}
[data-testid="stExpander"]{border:1px solid var(--fs-border); border-radius:9px; background:var(--fs-surface);}
[data-testid="stExpander"] summary{font-weight:600;}
[data-baseweb="select"] > div, [data-testid="stNumberInput"] input{border-radius:8px; background:#fff;}
[data-testid="stDataFrame"]{border:1px solid var(--fs-border); border-radius:10px;}
[data-testid="stAlert"]{border-radius:9px;}

@media (max-width: 760px){
  .block-container{padding:.8rem .8rem 2.5rem; max-width:100vw;}
  .st-key-hero{padding:1rem; background-image:none;}
  .fs-hero h1{font-size:1.4rem;}
  .st-key-langbox [role="radiogroup"]{float:none;}
  .fs-kpis, .fs-kpis.c3{grid-template-columns:repeat(2,minmax(0,1fr));}
  .fs-kpi .v{font-size:1.4rem;}
}
</style>
""".replace("%CONTOUR%", _CONTOUR.replace('"', "'"))


def inject_css() -> None:
    st.markdown(CSS, unsafe_allow_html=True)


def brand(tagline: str) -> str:
    return f'<div class="fs-brand">{LOGO_SVG}<div><b>Field Shift</b><span>{esc(tagline)}</span></div></div>'


def side_heading(text: str) -> None:
    st.markdown(f'<div class="fs-side-h">{esc(text)}</div>', unsafe_allow_html=True)


def notice(text: str) -> None:
    st.markdown(f'<div class="fs-notice"><i></i><span>{esc(text)}</span></div>', unsafe_allow_html=True)


def chip(text: str, on: bool = True) -> str:
    return f'<span class="fs-chip{"" if on else " off"}"><i></i>{esc(text)}</span>'


PIN = '<svg viewBox="0 0 16 16" fill="none" stroke="#2F6B45" stroke-width="1.6"><path d="M8 14.5s5-4.4 5-8.2A5 5 0 0 0 3 6.3c0 3.8 5 8.2 5 8.2z"/><circle cx="8" cy="6.3" r="1.7"/></svg>'


def hero_left(eyebrow: str, title: str, coords: str, extra: list[str], grows_label: str, crops: list[str], lead: str) -> str:
    """Selected-field card text: name, scannable coordinate chips, rotation chips, one-line purpose."""
    chips = f'<span class="fs-coord">{PIN}{esc(coords)}</span>' + "".join(
        f'<span class="fs-coord" style="font-weight:550" title="{esc(x[1])}">{esc(x[0])}</span>' if isinstance(x, tuple) else
        f'<span class="fs-coord" style="font-weight:550">{esc(x)}</span>' for x in extra)
    rot = '<span class="lbl">' + esc(grows_label) + '</span><span class="fs-rotprev" style="margin:0">' + '<span class="a">→</span>'.join(
        f'<span class="c">{esc(c)}</span>' for c in crops) + "</span>"
    return (f'<div class="fs-hero"><div class="fs-eyebrow">{esc(eyebrow)}</div><h1>{esc(title)}</h1>'
            f'<div class="fs-meta">{chips}</div><div class="fs-meta">{rot}</div><p class="lead">{esc(lead)}</p></div>')


def data_status(title: str, rows: list[tuple[str, str, str, str]], note: str = "") -> str:
    """rows: (name, state in {ok, miss, na}, status text, tooltip). Three visually distinct states."""
    body = "".join(f'<div class="fs-dr {stt}" title="{esc(tip)}"><span class="dot"></span><span class="nm">{esc(nm)}</span>'
                   f'<span class="st">{esc(txt)}</span></div>' for nm, stt, txt, tip in rows)
    return f'<div class="fs-data"><h4>{esc(title)}</h4>{body}' + (f'<div class="fs-dnote">{esc(note)}</div>' if note else "") + "</div>"


def rotation_preview(crops: list[str]) -> None:
    st.markdown('<div class="fs-rotprev">' + '<span class="a">→</span>'.join(f'<span class="c">{esc(c)}</span>' for c in crops) + "</div>",
                unsafe_allow_html=True)


def layer_line(title: str, items: list[tuple[str, str, str, bool]]) -> str:
    """One quiet line under the map: each NASA layer with its observation date, or 'unavailable' in amber."""
    parts = "".join(f'<span class="fs-lyr{"" if ok else " off"}" title="{esc(tip)}"><b>{esc(n)}</b> {esc(txt)}</span>' for n, txt, tip, ok in items)
    return f'<div class="fs-lyrs"><span class="h">{esc(title)}</span>{parts}</div>'


def group_label(text: str) -> None:
    st.markdown(f'<div class="fs-grp">{esc(text)}</div>', unsafe_allow_html=True)


def kpi(name: str, value: str, unit: str, desc: str, ctx: str = "", warn: bool = False) -> str:
    unit_html = f"<small>{esc(unit)}</small>" if unit else ""
    ctx_html = f'<div class="c{" warn" if warn else ""}">{esc(ctx)}</div>' if ctx else ""
    return (f'<div class="fs-kpi"><div class="n">{esc(name)}</div><div class="v">{esc(value)}{unit_html}</div>'
            f'<div class="d">{esc(desc)}</div>{ctx_html}</div>')


def kpi_grid(items: list[str], cols: int | None = None) -> None:
    cls = f"fs-kpis c{cols}" if cols else "fs-kpis"
    st.markdown(f'<div class="{cls}">{"".join(items)}</div>', unsafe_allow_html=True)


def section(title: str, sub: str = "") -> None:
    st.markdown(f"## {title}")
    if sub:
        st.caption(sub)


def compare_table(head: list[tuple[str, str, bool]], rows: list, metric_label: str, top: int | None = None, top_tag: str = "") -> None:
    """head: (name, small tag, is_current) per option. rows: (measure, cell texts, best indexes) or ("__group__", label).
    `top` = index of the highlighted (best-fit) option. All texts are escaped."""
    def th_cell(i, n, tag, cur):
        mark = f'<span class="tag2">{esc(top_tag)}</span><br>' if top == i and top_tag else ""
        return f'<th class="{"cur" if cur else ""}{" top" if top == i else ""}">{mark}{esc(n)}<small>{esc(tag)}</small></th>'
    th = "".join(th_cell(i, n, tag, cur) for i, (n, tag, cur) in enumerate(head))
    body = ""
    for row in rows:
        if row[0] == "__group__":
            body += f'<tr class="grp"><td colspan="{len(head) + 1}">{esc(row[1])}</td></tr>'
            continue
        if row[0] == "__note__":
            body += f'<tr class="nt"><td colspan="{len(head) + 1}">{esc(row[1])}</td></tr>'
            continue
        label, cells, best = row
        tds = "".join(f'<td class="num{" best" if i in best else ""}{" cur" if head[i][2] else ""}">{esc(c)}</td>' for i, c in enumerate(cells))
        body += f'<tr><td class="m">{esc(label)}</td>{tds}</tr>'
    st.markdown(f'<div class="fs-tablewrap"><table class="fs-table"><thead><tr><th>{esc(metric_label)}</th>{th}</tr></thead>'
                f'<tbody>{body}</tbody></table></div>', unsafe_allow_html=True)


def score_block(fit: float, caption: str) -> str:
    pct = max(0.0, min(100.0, fit))
    return (f'<div class="fs-score"><b>{fit:.0f}</b><span>/ 100</span></div><div class="fs-bar"><i style="width:{pct:.0f}%"></i></div>'
            f'<div class="fs-line" style="color:var(--fs-muted);font-size:.78rem">{esc(caption)}</div>')
