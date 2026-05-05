from datetime import date

from fastapi import APIRouter, HTTPException

from db import get_db

router = APIRouter()


@router.get("/track/{code}")
async def track(code: str):
    db = get_db()

    result = (
        db.table("grievances")
        .select("*")
        .eq("reference_code", code.upper())
        .single()
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=404, detail="Complaint not found")

    grievance = result.data
    filed_date = grievance.get("filed_at", "")[:10]
    days_since = 0
    if filed_date:
        try:
            delta = date.today() - date.fromisoformat(filed_date)
            days_since = delta.days
        except ValueError:
            pass

    esc_result = (
        db.table("escalations")
        .select("escalation_type, triggered_at")
        .eq("grievance_id", grievance["id"])
        .execute()
    )

    escalations = [
        {"type": e["escalation_type"], "date": e["triggered_at"][:10]}
        for e in (esc_result.data or [])
    ]

    return {
        "status": grievance.get("status", "awaiting"),
        "category": grievance.get("issue_category", ""),
        "department": grievance.get("department_name", ""),
        "date_filed": filed_date,
        "days_since_filed": days_since,
        "escalations": escalations,
    }


@router.patch("/track/{code}/resolve")
async def resolve(code: str):
    db = get_db()
    result = (
        db.table("grievances")
        .update({"status": "resolved"})
        .eq("reference_code", code.upper())
        .neq("status", "resolved")
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Complaint not found or already resolved")
    return {"status": "resolved"}
