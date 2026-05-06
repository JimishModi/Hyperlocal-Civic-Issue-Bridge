import os
from pathlib import Path
from typing import Literal

from groq import AsyncGroq
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from utils.lang import get_lang, lang_instruction

router = APIRouter()

_prompt = (Path(__file__).parent.parent / "prompts" / "chatbot.txt").read_text()

_client = AsyncGroq(api_key=os.environ.get("GROQ_API_KEY", ""))


class Message(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    messages: list[Message]


@router.post("/chat")
async def chat(req: ChatRequest, request: Request):
    if not req.messages:
        raise HTTPException(status_code=422, detail="No messages provided")

    lang = get_lang(request)
    system_prompt = _prompt + lang_instruction(lang)

    messages = [{"role": "system", "content": system_prompt}]
    for m in req.messages:
        messages.append({"role": m.role, "content": m.content})

    response = await _client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=messages
    )

    return {"reply": response.choices[0].message.content.strip()}
