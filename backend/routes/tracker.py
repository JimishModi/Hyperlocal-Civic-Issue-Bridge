from datetime import date

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from db import get_db


class ActionRequest(BaseModel):
    update_type: str  # 'bmc_responded', 'no_response', 'resolved', 'note'
    notes: str = ""

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

    updates_result = (
        db.table("grievance_updates")
        .select("update_type, notes, created_at")
        .eq("reference_code", code.upper())
        .order("created_at")
        .execute()
    )
    updates = [
        {"type": u["update_type"], "notes": u.get("notes", ""), "date": (u.get("created_at") or "")[:10]}
        for u in (updates_result.data or [])
    ]

    return {
        "status": grievance.get("status", "awaiting"),
        "category": grievance.get("issue_category", ""),
        "department": grievance.get("department_name", ""),
        "date_filed": filed_date,
        "days_since_filed": days_since,
        "escalations": escalations,
        "updates": updates,
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


@router.post("/track/{code}/action")
async def log_action(code: str, req: ActionRequest):
    db = get_db()
    exists = (
        db.table("grievances")
        .select("reference_code")
        .eq("reference_code", code.upper())
        .single()
        .execute()
    )
    if not exists.data:
        raise HTTPException(status_code=404, detail="Complaint not found")

    db.table("grievance_updates").insert({
        "reference_code": code.upper(),
        "update_type": req.update_type,
        "notes": req.notes,
    }).execute()

    if req.update_type == "resolved":
        db.table("grievances").update({"status": "resolved"}).eq("reference_code", code.upper()).execute()

    return {"success": True}
