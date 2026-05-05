import json
import os
from pathlib import Path

from groq import Groq
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()

_prompt = (Path(__file__).parent.parent / "prompts" / "complaint_drafter.txt").read_text()
_ward = json.loads(
    (Path(__file__).parent.parent / "config" / "bmc_ward.json").read_text()
)
_dept_map = {d["category"]: d for d in _ward["departments"]}

_client = Groq(api_key=os.environ.get("GROQ_API_KEY", ""))


class DraftRequest(BaseModel):
    category: str
    department: str
    description: str
    location: str
    image_url: str | None = None

@router.post("/draft")
async def draft(req: DraftRequest):
    dept_info = _dept_map.get(req.category, _dept_map["Other"])

    user_message = (
        f"Category: {req.category}\n"
        f"Department: {req.department}\n"
        f"Ward: BMC S-Ward, Powai, Mumbai\n"
        f"Location of issue: {req.location}\n"
        f"Issue description: {req.description}\n\n"
        "Write the formal complaint letter."
    )

    response = _client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": _prompt},
            {"role": "user", "content": user_message}
        ],
        response_format={"type": "json_object"}
    )

    try:
        raw = json.loads(response.choices[0].message.content)
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Draft generation error")

    return {
        "body": raw.get("body", ""),
        "subject": raw.get("subject", f"Civic Complaint: {req.category}"),
        "department": req.department,
        "category": req.category,
        "email": dept_info["email"],
        "portal_url": dept_info["portal"],
        "image_url": req.image_url,
    }
