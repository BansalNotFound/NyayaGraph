import os
import json
from typing import Optional, List
from fastapi import APIRouter, Query, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/api/v1/uidb", tags=["UIDB Unidentified Dossiers"])

# Locate dataset path
DATASET_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "data", "uidb_dataset.json")
FE_DATASET_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "..", "frontend", "public", "data", "uidb_dataset.json")

def load_uidb_data() -> List[dict]:
    for path in [DATASET_PATH, FE_DATASET_PATH]:
        if os.path.exists(path):
            try:
                with open(path, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception:
                pass
    return []

@router.get("/records")
def get_uidb_records(
    query: Optional[str] = None,
    police_station: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
):
    """
    Get scraped & translated MP Police CCTNS Unidentified Dead Bodies / Persons records.
    """
    data = load_uidb_data()
    if not data:
        return {"total": 0, "records": [], "message": "Dataset initializing or empty"}

    filtered = data
    if query:
        q = query.lower().strip()
        filtered = [
            r for r in filtered
            if q in r.get("name_en", "").lower()
            or q in r.get("name_hi", "").lower()
            or q in r.get("police_station_en", "").lower()
            or q in r.get("police_station_hi", "").lower()
            or q in r.get("reg_number", "").lower()
        ]

    if police_station:
        ps_q = police_station.lower().strip()
        filtered = [
            r for r in filtered
            if ps_q in r.get("police_station_en", "").lower()
            or ps_q in r.get("police_station_hi", "").lower()
        ]

    total = len(filtered)
    paged = filtered[offset : offset + limit]

    return {
        "total": total,
        "offset": offset,
        "limit": limit,
        "records": paged,
    }

@router.get("/stats")
def get_uidb_stats():
    """Summary metrics of UIDB dataset."""
    data = load_uidb_data()
    if not data:
        return {"total": 0, "with_photo": 0, "unique_police_stations": 0}

    with_photo = sum(1 for r in data if r.get("has_local_photo"))
    ps_counts = {}
    for r in data:
        ps = r.get("police_station_en") or "Unknown"
        ps_counts[ps] = ps_counts.get(ps, 0) + 1

    sorted_ps = sorted(ps_counts.items(), key=lambda x: x[1], reverse=True)

    return {
        "total_records": len(data),
        "with_local_photo": with_photo,
        "top_police_stations": sorted_ps[:10],
        "state": "Madhya Pradesh",
        "source": "MP Police CCTNS SCRB",
    }

@router.get("/record/{record_id}")
def get_uidb_record(record_id: str):
    """Fetch single UIDB record by ID or reg_number."""
    data = load_uidb_data()
    for r in data:
        if r.get("id") == record_id or r.get("image_id") == record_id or r.get("reg_number") == record_id:
            return r
    raise HTTPException(status_code=404, detail=f"Record {record_id} not found")
