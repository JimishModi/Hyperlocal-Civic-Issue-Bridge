import json
import random
import string
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from db import get_db
from services.mailer import send_complaint_to_bmc

router = APIRouter()

WARD = "S-Ward"

_ward = json.loads(
    (Path(__file__).parent.parent / "config" / "bmc_ward.json").read_text()
)
PORTAL_URL = _ward["portal_url"]
RESPONSE_WINDOW = _ward["response_window_days"]


class FileRequest(BaseModel):
    body: str            # the AI-drafted complaint letter approved by user
    subject: str = ""
    department: str
    category: str
    email: str           # BMC department email
    description: str = ""
    user_email: str = "" # citizen's email — for CC + 14-day reminder


def _generate_reference_code() -> str:
    return "".join(random.choices(string.ascii_uppercase + string.digits, k=8))


@router.post("/file")
async def file_complaint(req: FileRequest):
    db = get_db()
    code = _generate_reference_code()
    subject = req.subject or f"Civic Complaint: {req.category} — {WARD}, Powai"

    result = (
        db.table("grievances")
        .insert({
            "reference_code": code,
            "ward": WARD,
            "issue_category": req.category,
            "department_name": req.department,
            "department_email": req.email,
            "user_description": req.description or req.body,
            "draft_complaint": req.body,
            "status": "awaiting",
            "user_email": req.user_email or None,
        })
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to save complaint")

    # Send email to BMC, CC citizen
    email_sent = send_complaint_to_bmc(
        to_email=req.email,
        cc_email=req.user_email or None,
        subject=subject,
        body=req.body,
        reference_code=code,
    )

    # Update email_sent_at if successful
    if email_sent:
        db.table("grievances").update({
            "email_sent_at": datetime.now(timezone.utc).isoformat()
        }).eq("reference_code", code).execute()

    return {
        "reference_code": code,
        "email_sent": email_sent,
        "process_breakdown": {
            "step_1": {
                "title": "Complaint emailed to BMC",
                "detail": f"Your complaint has been sent to {req.department} at {req.email}.",
                "done": email_sent,
            },
            "step_2": {
                "title": "BMC must respond within 15 days",
                "detail": (
                    f"Under BMC's Grievance Redressal Guidelines, {req.department} "
                    f"must acknowledge and act within {RESPONSE_WINDOW} days of receipt."
                ),
                "done": False,
            },
            "step_3": {
                "title": "We'll check in with you on day 14",
                "detail": (
                    "You'll receive a reminder email on day 14 asking if BMC has responded. "
                    "If not, we'll guide you through escalation to CPGRAMS."
                    if req.user_email
                    else "Add your email next time to get a 14-day reminder automatically."
                ),
                "done": False,
            },
            "step_4": {
                "title": "Escalate to CPGRAMS if needed",
                "detail": (
                    "If BMC does not respond after 15 days, you can escalate to CPGRAMS "
                    "(Central Government grievance portal). We'll draft all required documents."
                ),
                "done": False,
            },
        },
    }
