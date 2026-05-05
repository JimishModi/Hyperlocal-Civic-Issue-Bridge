import json
import os
from pathlib import Path

import google.generativeai as genai
from fastapi import APIRouter, File, Form, HTTPException, UploadFile

genai.configure(api_key=os.environ.get("GEMINI_API_KEY", ""))

router = APIRouter()

_prompt = (Path(__file__).parent.parent / "prompts" / "vision_classifier.txt").read_text()

# Gemini 2.0 Flash — free tier, native multimodal, handles image + text together
_model = genai.GenerativeModel(
    model_name="gemini-2.0-flash",
    system_instruction=_prompt,
    generation_config=genai.GenerationConfig(response_mime_type="application/json"),
)


@router.post("/classify")
async def classify(
    description: str = Form(""),
    image: UploadFile | None = File(None),
    latitude: float | None = Form(None),
    longitude: float | None = Form(None),
):
    location_str = (
        f"{latitude:.4f}, {longitude:.4f} (Powai, Mumbai)"
        if latitude and longitude
        else "Powai, Mumbai (exact location not provided)"
    )

    text_part = (
        f"Description: {description or '(no description)'}\n"
        f"Location: {location_str}\n\n"
        "Classify this civic issue."
    )

    parts = []
    if image:
        image_bytes = await image.read()
        media_type = image.content_type or "image/jpeg"
        parts.append({"mime_type": media_type, "data": image_bytes})
    parts.append(text_part)

    response = _model.generate_content(parts)

    try:
        raw = json.loads(response.text)
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Classification service error")

    return {
        "category": raw.get("category", "Other"),
        "department": raw.get("department", "BMC S-Ward Office"),
        "confidence": raw.get("confidence", 0.5),
        "description": raw.get("description_cleaned", description),
        "location": location_str,
    }
