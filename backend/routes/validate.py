import json
import os
from pathlib import Path

from groq import AsyncGroq
from fastapi import APIRouter, File, Form, HTTPException, UploadFile

router = APIRouter()

_prompt = (Path(__file__).parent.parent / "prompts" / "security_gate.txt").read_text()

_client = AsyncGroq(api_key=os.environ.get("GROQ_API_KEY", ""))

@router.post("/validate")
async def validate(
    description: str = Form(""),
    images: list[UploadFile] = File(default=[]),
    latitude: float | None = Form(None),
    longitude: float | None = Form(None),
):
    user_content = f"User description: {description or '(no description provided)'}"
    if latitude and longitude:
        user_content += f"\nLocation: {latitude:.4f}, {longitude:.4f}"
    if images:
        user_content += f"\n[User uploaded {len(images)} photos as evidence. Do not reject simply due to missing description.]"

    response = await _client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": _prompt},
            {"role": "user", "content": user_content}
        ],
        response_format={"type": "json_object"}
    )

    try:
        result = json.loads(response.choices[0].message.content)
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Validation service error")

    if result.get("status") == "reject":
        raise HTTPException(status_code=422, detail=result.get("reason", "Input rejected"))

    return {"status": "safe"}
