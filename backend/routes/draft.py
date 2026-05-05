import json
import os
from pathlib import Path

import google.generativeai as genai
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

genai.configure(api_key=os.environ.get("GEMINI_API_KEY", ""))

router = APIRouter()

_prompt = (Path(__file__).parent.parent / "prompts" / "complaint_drafter.txt").read_text()
_ward = json.loads(
    (Path(__file__).parent.parent / "config" / "bmc_ward.json").read_text()
)
_dept_map = {d["category"]: d for d in _ward["departments"]}

# Gemini 2.0 Flash — free tier, strong enough for formal letter generation
_model = genai.GenerativeModel(
    model_name="gemini-2.0-flash",
    system_instruction=_prompt,
    generation_config=genai.GenerationConfig(response_mime_type="application/json"),
)


class DraftRequest(BaseModel):
    category: str
    department: str
    description: str
    location: str


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

    response = _model.generate_content(user_message)

    try:
        raw = json.loads(response.text)
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Draft generation error")

    return {
        "body": raw.get("body", ""),
        "subject": raw.get("subject", f"Civic Complaint: {req.category}"),
        "department": req.department,
        "category": req.category,
        "email": dept_info["email"],
        "portal_url": dept_info["portal"],
    }
