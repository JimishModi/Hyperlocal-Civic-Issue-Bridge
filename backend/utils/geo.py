import math


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2
         + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2)
    return R * 2 * math.asin(math.sqrt(a))


def find_nearby_duplicate(db, category: str, lat: float, lon: float, radius_km: float = 0.2):
    """Return the first unresolved complaint of the same category within radius_km, or None."""
    rows = (
        db.table("grievances")
        .select("reference_code, status, filed_at, latitude, longitude")
        .eq("issue_category", category)
        .neq("status", "resolved")
        .execute()
    )
    for row in (rows.data or []):
        rlat = row.get("latitude")
        rlon = row.get("longitude")
        if rlat and rlon:
            if haversine_km(lat, lon, rlat, rlon) <= radius_km:
                return row
    return None
