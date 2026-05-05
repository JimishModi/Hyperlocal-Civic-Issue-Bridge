import json
import os
from pathlib import Path

import google.generativeai as genai
from fastapi import APIRouter, File, Form, HTTPException, UploadFile

genai.configure(api_key=os.environ.get("GEMINI_API_KEY", ""))

router = APIRouter()

_prompt = (Path(__file__).parent.parent / "prompts" / "security_gate.txt").read_text()

# Gemini 2.0 Flash — free tier, fast, sufficient for binary safe/reject gate
_model = genai.GenerativeModel(
    model_name="gemini-2.0-flash",
    system_instruction=_prompt,
    generation_config=genai.GenerationConfig(response_mime_type="application/json"),
)


@router.post("/validate")
async def validate(
    description: str = Form(""),
    image: UploadFile | None = File(None),
    latitude: float | None = Form(None),
    longitude: float | None = Form(None),
):
    user_content = f"User description: {description or '(no description provided)'}"
    if latitude and longitude:
        user_content += f"\nLocation: {latitude:.4f}, {longitude:.4f}"

    response = _model.generate_content(user_content)

    try:
        result = json.loads(response.text)
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Validation service error")

    if result.get("status") == "reject":
        raise HTTPException(status_code=422, detail=result.get("reason", "Input rejected"))

    return {"status": "safe"}
