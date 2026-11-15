"""NASA AppEEARS API client: submit one point-sample task for the demo fields and download the CSVs to data/raw/.

Credentials come from the environment or from `.env` (EARTHDATA_USERNAME / EARTHDATA_PASSWORD). They are used only
for the Basic-auth login request, are never logged or printed, and are masked in repr().
Product and layer names were verified against GET /api/product/<id> (see `verify_layers`).
"""
from __future__ import annotations

import datetime as dt
import json
import os
import time
from dataclasses import dataclass, field
from pathlib import Path

import requests

from ..config import DEMO_FIELDS, RAW_DIR, ROOT

BASE = "https://appeears.earthdatacloud.nasa.gov/api"
# Verified against the live product list: MOD13Q1.061 exists; SPL3SMP_E.005 does NOT (404), .006 is current.
LAYERS: dict[str, list[str]] = {
    "MOD13Q1.061": ["_250m_16_days_NDVI", "_250m_16_days_VI_Quality", "_250m_16_days_pixel_reliability"],
    "SPL3SMP_E.006": ["Soil_Moisture_Retrieval_Data_AM_soil_moisture", "Soil_Moisture_Retrieval_Data_AM_retrieval_qual_flag"],
}
START = "2019-01-01"
MAX_DOWNLOAD_BYTES = 200_000_000
STATE_FILE = Path(RAW_DIR) / ".appeears_task.json"


class CredentialsMissing(RuntimeError):
    pass


class TaskNotFound(RuntimeError):
    """HTTP 404 for the task: it was deleted or purged (not a transient error, so never retried)."""


@dataclass(frozen=True)
class Credentials:
    username: str = field(repr=False)
    password: str = field(repr=False)

    def __repr__(self) -> str:       # never expose secrets, even in tracebacks or logs
        return "Credentials(username=***, password=***)"


def load_credentials(env_path: Path | None = None) -> Credentials:
    """EARTHDATA_USERNAME / EARTHDATA_PASSWORD from the environment, else from the project's .env file."""
    vals = {k: os.environ.get(k, "") for k in ("EARTHDATA_USERNAME", "EARTHDATA_PASSWORD")}
    path = env_path or ROOT / ".env"
    if not all(vals.values()) and path.exists():
        for line in path.read_text().splitlines():
            line = line.strip()
            if "=" in line and not line.startswith("#"):
                k, v = line.split("=", 1)
                k = k.strip().removeprefix("export ").strip()
                if k in vals and not vals[k]:
                    vals[k] = v.strip().strip("'\"")
    missing = [k for k, v in vals.items() if not v]
    if missing:
        raise CredentialsMissing(f"missing {', '.join(missing)}: put them in {path} (one KEY=value per line) or the environment")
    return Credentials(vals["EARTHDATA_USERNAME"], vals["EARTHDATA_PASSWORD"])


def verify_layers() -> dict[str, list[str]]:
    """Check every product/layer against the public product API. Returns problems per product (empty = all fine)."""
    problems: dict[str, list[str]] = {}
    for pv, layers in LAYERS.items():
        r = requests.get(f"{BASE}/product/{pv}", timeout=60)
        if r.status_code != 200:
            problems[pv] = [f"product not found (HTTP {r.status_code})"]
            continue
        have = r.json()
        bad = [lyr for lyr in layers if lyr not in have]
        if bad:
            problems[pv] = [f"layer not found: {b}" for b in bad]
    return problems


# Points of the current request: three demo/preset fields plus two OSM-verified farmland candidates near the Fergana demo field
# (213 ha parcel 4.9 km away; 56 ha parcel 2.9 km away) to find a pixel with a cropland NDVI signal.
FIELD_POINTS = ("kansas", "karakalpakstan")
# The five points of the submitted task. "fergana_old" is the first Fergana demo point (summer NDVI peak 0.24: not cropland); the 213 ha
# candidate became the demo field.
EXTRA_POINTS = {"fergana_old": (40.43, 71.70), "fergana_213ha": (40.4229, 71.7576), "fergana_56ha": (40.4261, 71.7339)}


def task_points() -> dict[str, tuple[float, float]]:
    pts = {k: (DEMO_FIELDS[k].lat, DEMO_FIELDS[k].lon) for k in FIELD_POINTS}
    pts.update(EXTRA_POINTS)
    return pts


def build_task(end: dt.date | None = None, name: str = "fieldshift-points-2019") -> dict:
    """Point-sample task for `task_points()`, both products, START..end (dates are MM-DD-YYYY in the API)."""
    end = end or dt.date.today()
    start = dt.date.fromisoformat(START)
    return {
        "task_type": "point",
        "task_name": name,
        "params": {
            "dates": [{"startDate": start.strftime("%m-%d-%Y"), "endDate": end.strftime("%m-%d-%Y")}],
            "layers": [{"product": p, "layer": lyr} for p, ls in LAYERS.items() for lyr in ls],
            "coordinates": [{"id": k, "category": k, "latitude": la, "longitude": lo} for k, (la, lo) in task_points().items()],
        },
    }


TRANSIENT_STATUS = {429, 500, 502, 503, 504}


class Client:
    """Minimal AppEEARS session: login (Basic auth) -> bearer token. Requests re-login once on 401/403 (the token may
    have been invalidated by another session on the same account) and back off on transient errors."""

    def __init__(self, creds: Credentials, sleep=time.sleep):
        self._creds, self._token, self._sleep = creds, None, sleep
        self.http = requests.Session()
        self.relogins = 0

    def login(self) -> None:
        r = self.http.post(f"{BASE}/login", auth=(self._creds.username, self._creds.password), timeout=60)
        if r.status_code != 200:
            raise RuntimeError(f"AppEEARS login failed (HTTP {r.status_code}); check the Earthdata credentials and that the account has accepted the AppEEARS terms")
        self._token = r.json()["token"]
        self.http.headers["Authorization"] = f"Bearer {self._token}"

    def logout(self) -> None:
        """Explicit only: logging out may invalidate the token other sessions of this account are using."""
        if self._token:
            self.http.post(f"{BASE}/logout", timeout=30)
            self.http.headers.pop("Authorization", None)
            self._token = None

    def _request(self, method: str, url: str, retries: int = 5, **kw) -> requests.Response:
        """One logical request: re-login once on 401/403; exponential backoff (2..60 s) on 429/5xx/connection errors.

        `retries=0` disables the transient-error retries (used for task submission, where a lost response
        could mean the task WAS created); the 401/403 re-login is still allowed, since a rejected request creates nothing.
        """
        kw.setdefault("timeout", 60)
        relogged, delay, attempt = False, 2.0, 0
        while True:
            try:
                r = self.http.request(method, url, **kw)
            except (requests.ConnectionError, requests.Timeout) as e:
                if attempt >= retries:
                    raise
                attempt += 1
                self._sleep(delay); delay = min(delay * 2, 60)
                continue
            if r.status_code in (401, 403) and not relogged:
                relogged = True
                self.relogins += 1
                self.login()
                continue
            if r.status_code in TRANSIENT_STATUS and attempt < retries:
                attempt += 1
                self._sleep(delay); delay = min(delay * 2, 60)
                continue
            return r

    def submit(self, task: dict) -> str:
        r = self._request("POST", f"{BASE}/task", retries=0, json=task, timeout=120)
        if r.status_code not in (200, 202):
            raise RuntimeError(f"task submission failed (HTTP {r.status_code}): {r.text[:300]}")
        return r.json()["task_id"]

    def status(self, task_id: str) -> str:
        r = self._request("GET", f"{BASE}/task/{task_id}")
        if r.status_code == 404:
            raise TaskNotFound(f"task {task_id[:8]}… no longer exists on this account (deleted or purged)")
        r.raise_for_status()
        return r.json().get("status", "unknown")

    def wait(self, task_id: str, every: int = 60, timeout_s: int = 6 * 3600, max_failures: int = 20, log=print) -> str:
        """Poll until the task is done/error/expired. A failed poll is logged and retried next round, so a transient
        outage (or a second session on the same account) cannot kill the wait; `max_failures` consecutive failures do."""
        t0, failures = time.time(), 0
        while True:
            try:
                st = self.status(task_id)
                failures = 0
                log(f"{dt.datetime.now():%H:%M:%S} status={st} (relogins so far: {self.relogins})")
                if st in ("done", "error", "expired"):
                    return st
            except TaskNotFound as e:
                log(f"{dt.datetime.now():%H:%M:%S} {e}")
                return "not_found"
            except (requests.RequestException, RuntimeError, KeyError, ValueError) as e:
                failures += 1
                code = getattr(getattr(e, "response", None), "status_code", None)
                log(f"{dt.datetime.now():%H:%M:%S} poll failed ({type(e).__name__}{f', HTTP {code}' if code else ''}); consecutive failures: {failures}/{max_failures}")
                if failures >= max_failures:
                    raise
            if time.time() - t0 > timeout_s:
                return "timeout"
            self._sleep(every)

    def download(self, task_id: str, out_dir: Path | None = None) -> list[Path]:
        """Download the *-results.csv files of a finished task (server-provided names are sanitised)."""
        out_dir = Path(out_dir or RAW_DIR)
        out_dir.mkdir(parents=True, exist_ok=True)
        r = self._request("GET", f"{BASE}/bundle/{task_id}")
        r.raise_for_status()
        files = r.json()["files"]
        saved = []
        for f in files:
            name = Path(str(f["file_name"])).name                       # strip any directory part from the server's name
            if not name.lower().endswith("-results.csv") or not any(k in name for k in ("MOD13Q1", "SPL3SMP")):
                continue
            if int(f.get("file_size", 0)) > MAX_DOWNLOAD_BYTES:
                raise RuntimeError(f"{name} is unexpectedly large ({f['file_size']} bytes); not downloading")
            d = self._request("GET", f"{BASE}/bundle/{task_id}/{f['file_id']}", timeout=300)   # redirects to cloud storage
            d.raise_for_status()
            (out_dir / name).write_bytes(d.content)
            saved.append(out_dir / name)
        return saved


def save_state(task_id: str) -> None:
    STATE_FILE.parent.mkdir(parents=True, exist_ok=True)
    STATE_FILE.write_text(json.dumps({"task_id": task_id, "submitted": dt.datetime.now().isoformat(timespec="seconds")}))


def load_state() -> str | None:
    return json.loads(STATE_FILE.read_text())["task_id"] if STATE_FILE.exists() else None
