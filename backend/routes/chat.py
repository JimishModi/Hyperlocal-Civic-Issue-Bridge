import os
from pathlib import Path
from typing import Literal

from groq import Groq
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

client = Groq(api_key=os.environ.get("GROQ_API_KEY", ""))

router = APIRouter()

_prompt = (Path(__file__).parent.parent / "prompts" / "chatbot.txt").read_text()

class Message(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    messages: list[Message]


@router.post("/chat")
async def chat(req: ChatRequest):
    if not req.messages:
        raise HTTPException(status_code=422, detail="No messages provided")

    groq_messages = [{"role": "system", "content": _prompt}]
    for m in req.messages:
        groq_messages.append({"role": m.role, "content": m.content})

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=groq_messages
    )

    return {"reply": response.choices[0].message.content.strip()}
