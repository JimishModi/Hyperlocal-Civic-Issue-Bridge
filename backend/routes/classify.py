import base64
import json
import os
from pathlib import Path

from groq import Groq
from fastapi import APIRouter, File, Form, HTTPException, UploadFile

client = Groq(api_key=os.environ.get("GROQ_API_KEY", ""))

router = APIRouter()

_prompt = (Path(__file__).parent.parent / "prompts" / "vision_classifier.txt").read_text()


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

    parts = [{"type": "text", "text": text_part}]
    if image:
        image_bytes = await image.read()
        media_type = image.content_type or "image/jpeg"
        base64_image = base64.b64encode(image_bytes).decode('utf-8')
        parts.append({
            "type": "image_url",
            "image_url": {
                "url": f"data:{media_type};base64,{base64_image}"
            }
        })

    response = client.chat.completions.create(
        model="llama-3.2-90b-vision-preview",
        messages=[
            {"role": "system", "content": _prompt},
            {"role": "user", "content": parts}
        ],
        response_format={"type": "json_object"}
    )

    try:
        raw = json.loads(response.choices[0].message.content)
    except Exception:
        raise HTTPException(status_code=500, detail="Classification service error")

    return {
        "category": raw.get("category", "Other"),
        "department": raw.get("department", "BMC S-Ward Office"),
        "confidence": raw.get("confidence", 0.5),
        "description": raw.get("description_cleaned", description),
        "location": location_str,
    }
