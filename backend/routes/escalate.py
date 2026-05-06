import json
import os
from datetime import date
from pathlib import Path

from groq import AsyncGroq
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from db import get_db

router = APIRouter()

_bmc_prompt = (Path(__file__).parent.parent / "prompts" / "escalation.txt").read_text()
_cpgrams_prompt = (Path(__file__).parent.parent / "prompts" / "cpgrams_guide.txt").read_text()

_ward = json.loads(
    (Path(__file__).parent.parent / "config" / "bmc_ward.json").read_text()
)
_dept_map = {d["category"]: d for d in _ward["departments"]}

_client = AsyncGroq(api_key=os.environ.get("GROQ_API_KEY", ""))


class EscalateRequest(BaseModel):
    reference_code: str
    type: str  # "followup" | "rti" | "cpgrams"
    category: str
    department: str


def _days_since(filed_at: str) -> int:
    try:
        return (date.today() - date.fromisoformat(filed_at[:10])).days
    except ValueError:
        return 0


@router.post("/escalate")
async def escalate(req: EscalateRequest):
    dept_info = _dept_map.get(req.category, _dept_map["Other"])

    db = get_db()
    grievance_res = (
        db.table("grievances")
        .select("id, filed_at")
        .eq("reference_code", req.reference_code.upper())
        .single()
        .execute()
    )
    days_elapsed = _days_since(grievance_res.data["filed_at"]) if grievance_res.data else 0

    # ── CPGRAMS path ──
    if req.type == "cpgrams":
        user_message = (
            f"Original BMC complaint reference: {req.reference_code}\n"
            f"Category: {req.category}\n"
            f"Department that failed to act: {req.department}\n"
            f"Days elapsed without response: {days_elapsed}\n"
            f"Ward: BMC S-Ward, Powai, Mumbai\n\n"
            "Generate the CPGRAMS complaint letter and filing guide."
        )
        response = await _client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": _cpgrams_prompt},
                {"role": "user", "content": user_message}
            ],
            response_format={"type": "json_object"}
        )
        try:
            raw = json.loads(response.choices[0].message.content)
        except json.JSONDecodeError:
            raise HTTPException(status_code=500, detail="CPGRAMS generation error")

        _save_escalation(db, grievance_res, "rti", raw.get("body", ""), days_elapsed)

        return {
            "body": raw.get("body", ""),
            "subject": raw.get("subject", f"CPGRAMS Escalation — {req.reference_code}"),
            "email": dept_info["email"],
            "portal_url": raw.get("portal_url", "https://pgportal.gov.in"),
            "escalation_path": "cpgrams",
            "filing_steps": raw.get("filing_steps", []),
            "expected_response_days": raw.get("expected_response_days", 30),
            "process_breakdown": {
                "what": "Filing a grievance with the Central Government's CPGRAMS portal.",
                "why": (
                    f"BMC {req.department} has not responded in {days_elapsed} days, "
                    "exceeding the 15-day statutory window."
                ),
                "where": "https://pgportal.gov.in — Government of India's official grievance portal",
                "expected_response": (
                    "CPGRAMS forwards your complaint to the state nodal officer within 5 days. "
                    "Resolution expected within 30 days."
                ),
                "after_cpgrams": (
                    "If CPGRAMS also fails, the next step is the Maharashtra Lokayukta or consumer court."
                ),
            },
        }

    # ── BMC follow-up / RTI path ──
    db_type = "follow_up" if req.type == "followup" else "rti"
    user_message = (
        f"Escalation type: {req.type}\n"
        f"Original complaint reference: {req.reference_code}\n"
        f"Category: {req.category}\n"
        f"Department: {req.department}\n"
        f"Days elapsed: {days_elapsed}\n"
        f"Ward: BMC S-Ward, Powai, Mumbai\n"
        f"RTI Officer: {_ward['rti_officer']}\n\n"
        "Write the escalation document."
    )

    response = await _client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": _bmc_prompt},
            {"role": "user", "content": user_message}
        ],
        response_format={"type": "json_object"}
    )
    try:
        raw = json.loads(response.choices[0].message.content)
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Escalation generation error")

    _save_escalation(db, grievance_res, db_type, raw.get("body", ""), days_elapsed)

    next_step = (
        "If the department still does not respond within 7 days of this follow-up, "
        "proceed to RTI then CPGRAMS escalation from the app."
        if req.type == "followup"
        else "If the RTI response is unsatisfactory, proceed to CPGRAMS escalation."
    )

    return {
        "body": raw.get("body", ""),
        "subject": raw.get("subject", f"Escalation: {req.type.upper()} — {req.reference_code}"),
        "email": dept_info["email"], # TRUSTED
        "portal_url": dept_info["portal"], # TRUSTED
        "escalation_path": req.type,
        "filing_steps": raw.get("filing_steps", []),
        "process_breakdown": {
            "what": (
                "A formal follow-up letter reminding the department of the overdue complaint."
                if req.type == "followup"
                else "An RTI application demanding disclosure of action taken on your complaint."
            ),
            "where": f"Email to {dept_info['email']} and file on {dept_info['portal']}",
            "expected_response": (
                "Department must acknowledge within 7 days and resolve within 15 days of this letter."
                if req.type == "followup"
                else "Under RTI Act 2005, the PIO must respond within 30 days."
            ),
            "next_step": next_step,
        },
    }


def _save_escalation(db, grievance_res, db_type: str, draft_text: str, days_elapsed: int):
    if not grievance_res.data:
        return
    db.table("escalations").insert({
        "grievance_id": grievance_res.data["id"],
        "escalation_type": db_type,
        "draft_text": draft_text,
        "days_elapsed": days_elapsed,
    }).execute()
    db.table("grievances").update({"status": "escalated"}).eq(
        "id", grievance_res.data["id"]
    ).execute()
