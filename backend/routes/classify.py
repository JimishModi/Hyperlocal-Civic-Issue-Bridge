import json
import os
from pathlib import Path

import httpx
from groq import Groq
from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from db import get_db
from utils.geo import find_nearby_duplicate

router = APIRouter()

_prompt = (Path(__file__).parent.parent / "prompts" / "vision_classifier.txt").read_text()

_client = Groq(api_key=os.environ.get("GROQ_API_KEY", ""))


async def _reverse_geocode(lat: float, lon: float) -> str:
    """Return a precise street address for the given coordinates using Nominatim."""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            r = await client.get(
                "https://nominatim.openstreetmap.org/reverse",
                params={"format": "json", "lat": lat, "lon": lon, "zoom": 18, "addressdetails": 1},
                headers={"User-Agent": "CivicIssueBridge/1.0 (hackathon@iitb)"},
            )
            data = r.json()
        addr = data.get("address", {})
        parts = []
        for key in ["amenity", "building", "road", "neighbourhood", "suburb", "city", "postcode"]:
            val = addr.get(key)
            if val and val not in parts:
                parts.append(val)
        return ", ".join(parts) if parts else data.get("display_name", f"{lat:.4f}, {lon:.4f}")
    except Exception as e:
        print(f"Reverse geocode error: {e}")
        return f"{lat:.4f}, {lon:.4f} (Powai, Mumbai)"


@router.post("/classify")
async def classify(
    description: str = Form(""),
    image: UploadFile | None = File(None),
    latitude: float | None = Form(None),
    longitude: float | None = Form(None),
):
    if latitude and longitude:
        location_str = await _reverse_geocode(latitude, longitude)
    else:
        location_str = "Powai, Mumbai (exact location not provided)"

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

    # Duplicate check — same category + unresolved + within 200m
    duplicate = None
    if latitude and longitude:
        try:
            dup = find_nearby_duplicate(get_db(), raw.get("category", "Other"), latitude, longitude)
            if dup:
                duplicate = {
                    "reference_code": dup["reference_code"],
                    "status": dup["status"],
                    "date_filed": dup.get("filed_at", ""),
                }
        except Exception as e:
            print(f"Duplicate check error: {e}")

    image_url = None
    if image:
        try:
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
        "duplicate": duplicate,
    }
