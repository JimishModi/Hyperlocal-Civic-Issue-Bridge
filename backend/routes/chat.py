import os
from pathlib import Path
from typing import Literal

from groq import AsyncGroq
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()

_prompt = (Path(__file__).parent.parent / "prompts" / "chatbot.txt").read_text()

_client = AsyncGroq(api_key=os.environ.get("GROQ_API_KEY", ""))


class Message(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    messages: list[Message]


@router.post("/chat")
async def chat(req: ChatRequest):
    if not req.messages:
        raise HTTPException(status_code=422, detail="No messages provided")

    messages = [{"role": "system", "content": _prompt}]
    for m in req.messages:
        messages.append({"role": m.role, "content": m.content})

    response = await _client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=messages
    )

    return {"reply": response.choices[0].message.content.strip()}
