import os
from pathlib import Path
from typing import Literal

import google.generativeai as genai
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

genai.configure(api_key=os.environ.get("GEMINI_API_KEY", ""))

router = APIRouter()

_prompt = (Path(__file__).parent.parent / "prompts" / "chatbot.txt").read_text()

# Gemini 2.0 Flash — free tier, fast turn-around for chat responses
_model = genai.GenerativeModel(
    model_name="gemini-2.0-flash",
    system_instruction=_prompt,
)


class Message(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    messages: list[Message]


@router.post("/chat")
async def chat(req: ChatRequest):
    if not req.messages:
        raise HTTPException(status_code=422, detail="No messages provided")

    # Gemini uses "model" instead of "assistant"
    history = [
        {
            "role": "model" if m.role == "assistant" else "user",
            "parts": [m.content],
        }
        for m in req.messages[:-1]
    ]

    chat_session = _model.start_chat(history=history)
    response = chat_session.send_message(req.messages[-1].content)

    return {"reply": response.text.strip()}
