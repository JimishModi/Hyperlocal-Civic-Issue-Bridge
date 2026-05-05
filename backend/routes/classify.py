import json
import os
from pathlib import Path

import base64
from groq import Groq
from fastapi import APIRouter, File, Form, HTTPException, UploadFile

router = APIRouter()

_prompt = (Path(__file__).parent.parent / "prompts" / "vision_classifier.txt").read_text()

_client = Groq(api_key=os.environ.get("GROQ_API_KEY", ""))


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

    # Note: Groq recently decommissioned its vision models. 
    # We are falling back to a powerful text model and only passing the text description.
    # If vision is strictly required, you will need to switch back to Gemini or another vision provider.
    
    response = _client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": _prompt},
            {"role": "user", "content": text_part}
        ],
        temperature=0.1
    )

    try:
        response_text = response.choices[0].message.content
        if "```json" in response_text:
            response_text = response_text.split("```json")[1].split("```")[0].strip()
        elif "```" in response_text:
            response_text = response_text.split("```")[1].strip()
        raw = json.loads(response_text)
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Classification service error")

    image_url = None
    if image:
        try:
            from db import get_db
            import uuid
            
            image_bytes = await image.read()
            db = get_db()
            ext = image.filename.split('.')[-1] if image.filename and '.' in image.filename else 'jpg'
            filename = f"{uuid.uuid4()}.{ext}"
            
            db.storage.from_("complaint_images").upload(
                path=filename,
                file=image_bytes,
                file_options={"content-type": image.content_type or "image/jpeg"}
            )
            image_url = db.storage.from_("complaint_images").get_public_url(filename)
        except Exception as e:
            print(f"Error uploading image: {e}")

    return {
        "category": raw.get("category", "Other"),
        "department": raw.get("department", "BMC S-Ward Office"),
        "confidence": raw.get("confidence", 0.5),
        "description": raw.get("description_cleaned", description),
        "location": location_str,
        "image_url": image_url,
    }
