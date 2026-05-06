import json
import os
from pathlib import Path

import httpx
from groq import AsyncGroq
from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile

from db import get_db
from utils.geo import find_nearby_duplicate
from utils.lang import get_lang, lang_instruction
from utils.dept import get_dept_info

router = APIRouter()

_prompt = (Path(__file__).parent.parent / "prompts" / "vision_classifier.txt").read_text()

_client = AsyncGroq(api_key=os.environ.get("GROQ_API_KEY", ""))

_VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct"
_TEXT_MODEL = "llama-3.3-70b-versatile"


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
    request: Request,
    description: str = Form(""),
    images: list[UploadFile] = File(default=[]),
    latitude: float | None = Form(None),
    longitude: float | None = Form(None),
):
    lang = get_lang(request)
    if latitude and longitude:
        location_str = await _reverse_geocode(latitude, longitude)
    else:
        location_str = "Powai, Mumbai (exact location not provided)"

    # 1. Upload images first, collect public URLs
    urls = []
    if images:
        try:
            import uuid
            db = get_db()
            for img in images:
                if not img.filename:
                    continue
                image_bytes = await img.read()
                ext = img.filename.split('.')[-1] if '.' in img.filename else 'jpg'
                filename = f"{uuid.uuid4()}.{ext}"
                db.storage.from_("complaint_images").upload(
                    path=filename,
                    file=image_bytes,
                    file_options={"content-type": img.content_type or "image/jpeg"}
                )
                urls.append(db.storage.from_("complaint_images").get_public_url(filename))
        except Exception as e:
            print(f"Error uploading image: {e}")

    # 2. Prepare AI request — use vision model when images are present
    text_part = (
        f"Description: {description or '(no description)'}\n"
        f"Location: {location_str}\n\n"
        "Classify this civic issue."
    )

    # Instruct description_cleaned to be in user's language
    desc_lang_note = ""
    if lang != "en":
        lang_name = {"hi": "Hindi", "mr": "Marathi"}.get(lang, "English")
        desc_lang_note = (
            f"\n\nIMPORTANT: Write the 'description_cleaned' field in {lang_name} (Devanagari script). "
            f"Keep 'category' and 'department' values in English exactly as specified."
        )

    if urls:
        # Pass public image URLs directly to the vision model (up to 5)
        user_content = [{"type": "text", "text": text_part}]
        for u in urls[:5]:
            user_content.append({"type": "image_url", "image_url": {"url": u}})
        model = _VISION_MODEL
    else:
        user_content = text_part
        model = _TEXT_MODEL

    try:
        response = await _client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": _prompt + desc_lang_note},
                {"role": "user", "content": user_content}
            ],
            temperature=0.1
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail={"error_type": "AI_API_Error", "message": str(e)})

    try:
        response_text = response.choices[0].message.content
        if "```json" in response_text:
            response_text = response_text.split("```json")[1].split("```")[0].strip()
        elif "```" in response_text:
            response_text = response_text.split("```")[1].strip()
        raw = json.loads(response_text)
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Classification service error")

    # 3. Duplicate check — same category + unresolved + within 200m
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

    category = raw.get("category", "Other")
    dept_info = get_dept_info(category)
    
    return {
        "category": category,
        "department": dept_info["name"],
        "confidence": raw.get("confidence", 0.5),
        "description": raw.get("description_cleaned", description),
        "location": location_str,
        "image_urls": urls,
        "duplicate": duplicate,
    }
