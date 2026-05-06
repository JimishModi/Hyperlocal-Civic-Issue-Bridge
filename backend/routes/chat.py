import os
from pathlib import Path
from typing import Literal

from groq import AsyncGroq
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from utils.lang import get_lang, lang_instruction

from services.guard import is_unsafe_input, is_unsafe_output

REFUSAL = {
    "en": "I can only help with civic complaints, BMC procedures, RTI, and how to use this app. Is there something about your complaint I can help with?",
    "hi": "मैं केवल नागरिक शिकायतों, बीएमसी प्रक्रियाओं, आरटीआई और इस ऐप का उपयोग करने के तरीके के बारे में सहायता कर सकता हूं। क्या आपकी शिकायत के बारे में कुछ ऐसा है जिसमें मैं मदद कर सकता हूं?",
    "mr": "मी केवळ नागरी तक्रारी, बीएमसी प्रक्रिया, आरटीआय आणि या अॅपचा वापर कसा करावा याबद्दल मदत करू शकतो. तुमच्या तक्रारीबाबत मी काही मदत करू शकेन असे काही आहे का?",
}

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
    
    # Layer 1: Guard input
    last_user_msg = next((m.content for m in reversed(req.messages) if m.role == "user"), None)
    if last_user_msg:
        unsafe, category = await is_unsafe_input(last_user_msg)
        if unsafe:
            print(f"[GUARD] Blocked unsafe input (Category: {category})")
            return {"reply": REFUSAL.get(lang, REFUSAL["en"])}

    system_prompt = _prompt + lang_instruction(lang)

    messages = [{"role": "system", "content": system_prompt}]
    for m in req.messages:
        messages.append({"role": m.role, "content": m.content})

    response = await _client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=messages
    )

    reply = response.choices[0].message.content.strip()

    # Layer 1: Guard output
    unsafe_out, category_out = await is_unsafe_output(reply)
    if unsafe_out:
        print(f"[GUARD] Blocked unsafe output (Category: {category_out})")
        return {"reply": REFUSAL.get(lang, REFUSAL["en"])}

    return {"reply": reply}
