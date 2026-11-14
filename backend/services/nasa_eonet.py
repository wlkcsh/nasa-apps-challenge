import math
import sys
from pathlib import Path
from typing import List
import httpx

BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from models import HazardEvent

TARGET_CATEGORIES = {"drought", "dusthaze", "wildfires", "severestorms"}

def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate the great-circle distance between two points on Earth in km."""
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2.0) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(dlon / 2.0) ** 2
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return round(R * c, 1)

async def fetch_regional_hazards(lat: float, lon: float, max_radius_km: float = 1500.0) -> List[HazardEvent]:
    """
    Query NASA EONET v3 for active hazards within 1,500 km of field coordinates.
    Returns filtered hazards or clean empty list on timeout/error.
    """
    url = "https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=20"
    headers = {"User-Agent": "FieldShiftUzbekistan/1.0 (NASA Space Apps)"}

    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp = await client.get(url, headers=headers)
            resp.raise_for_status()
            data = resp.json()
            events = data.get("events", [])

            results: List[HazardEvent] = []
            for ev in events:
                cats = ev.get("categories", [])
                matched_cat = None
                for cat in cats:
                    cid = str(cat.get("id", "")).lower()
                    if cid in TARGET_CATEGORIES or any(t in cid for t in ("fire", "storm", "drought", "dust", "haze")):
                        matched_cat = cat.get("title", cat.get("id", "Hazard"))
                        break

                if not matched_cat:
                    continue

                geoms = ev.get("geometry", [])
                if not geoms:
                    continue

                latest_geom = geoms[-1]
                coords = latest_geom.get("coordinates")
                if not coords or len(coords) < 2:
                    continue

                ev_lon = float(coords[0])
                ev_lat = float(coords[1])
                dist = haversine_km(lat, lon, ev_lat, ev_lon)

                if dist <= max_radius_km:
                    results.append(
                        HazardEvent(
                            title=ev.get("title", "Regional Hazard"),
                            category=matched_cat,
                            date=latest_geom.get("date", "")[:10],
                            distance_km=dist,
                        )
                    )

            results.sort(key=lambda x: x.distance_km)
            return results
    except Exception:
        # Graceful empty fallback so offline or slow network conditions never break
        return []
