"""Shared types and disk cache for all fetchers."""
from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import pandas as pd

from ..config import CACHE_DIR, DEMO_CACHE_DIR


@dataclass
class FetchResult:
    """Tidy data plus provenance. `ok=False` means the source is a documented gap."""
    source: str
    data: pd.DataFrame
    ok: bool
    resolution: str = ""
    date_range: str = ""
    message: str = ""
    meta: dict[str, Any] = field(default_factory=dict)
    reasons: list = field(default_factory=list)   # file-free, translatable reasons for a failure (i18n.Msg); `message` keeps file names for logs

    @classmethod
    def failed(cls, source: str, message: str, reasons: list | None = None) -> "FetchResult":
        return cls(source=source, data=pd.DataFrame(), ok=False, message=message, reasons=list(reasons or []))


def cache_key(source: str, lat: float, lon: float, *parts: str) -> Path:
    raw = "|".join([source, f"{lat:.4f}", f"{lon:.4f}", *parts])
    h = hashlib.sha1(raw.encode()).hexdigest()[:10]
    return CACHE_DIR / f"{source}_{lat:.2f}_{lon:.2f}_{h}"


def _json_path(path: Path) -> Path:
    """Append .json (with_suffix would eat '.78_<hash>' from a name containing a decimal longitude)."""
    return path.with_name(path.name + ".json")


def read_json_cache(path: Path) -> Any | None:
    """Read a cached response: the committed demo cache first, then the live cache."""
    for base in (DEMO_CACHE_DIR, path.parent):
        p = _json_path(base / path.name)
        if p.exists():
            return json.loads(p.read_text())
    return None


def write_json_cache(path: Path, obj: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    _json_path(path).write_text(json.dumps(obj))
