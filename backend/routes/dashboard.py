from fastapi import APIRouter, HTTPException
from db import get_db

router = APIRouter()


@router.get("/my-complaints")
async def my_complaints(email: str):
    if not email:
        raise HTTPException(status_code=400, detail="Email required")

    db = get_db()
    grievances = (
        db.table("grievances")
        .select("reference_code, issue_category, department_name, status, filed_at, email_sent_at, user_description")
        .eq("user_email", email)
        .order("filed_at", desc=True)
        .execute()
    )

    complaints = []
    for g in (grievances.data or []):
        code = g["reference_code"]
        updates = (
            db.table("grievance_updates")
            .select("update_type, notes, created_at")
            .eq("reference_code", code)
            .order("created_at")
            .execute()
        )
        complaints.append({
            "reference_code": code,
            "category": g.get("issue_category", ""),
            "department": g.get("department_name", ""),
            "status": g.get("status", "awaiting"),
            "date_filed": (g.get("filed_at") or "")[:10],
            "email_sent": bool(g.get("email_sent_at")),
            "description": g.get("user_description", ""),
            "updates": [
                {
                    "type": u["update_type"],
                    "notes": u.get("notes", ""),
                    "date": (u.get("created_at") or "")[:10],
                }
                for u in (updates.data or [])
            ],
        })

    return {"complaints": complaints}
