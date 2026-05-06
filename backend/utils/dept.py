import json
from pathlib import Path

_cache = None

def _load_dept_data() -> dict:
    global _cache
    if _cache is None:
        path = Path(__file__).parent.parent / "config" / "bmc_ward.json"
        _cache = json.loads(path.read_text())
    return _cache

def get_dept_info(category: str) -> dict:
    """Returns the trusted department dict for a category. Falls back to 'Other'."""
    data = _load_dept_data()
    depts = data.get("departments", [])
    
    # Find matching category
    for d in depts:
        if d.get("category") == category:
            return d
            
    # Fallback to Other
    for d in depts:
        if d.get("category") == "Other":
            return d
            
    # Ultimate fallback if 'Other' is missing
    return {
        "category": "Other",
        "name": "BMC S-Ward Office — General",
        "email": "sward@mcgm.gov.in",
        "portal": data.get("portal_url", "https://mcgm.gov.in/grievance"),
        "keywords": []
    }
