"""Language helper — reads X-User-Language header from FastAPI request."""

from fastapi import Request

_SUPPORTED = {"en", "hi", "mr"}
_NAMES = {"en": "English", "hi": "Hindi", "mr": "Marathi"}


def get_lang(request: Request) -> str:
    """Return normalised language code from X-User-Language header."""
    raw = (request.headers.get("x-user-language") or "en").strip().lower()[:2]
    return raw if raw in _SUPPORTED else "en"


def lang_instruction(lang: str) -> str:
    """Return a prompt suffix instructing the LLM to respond in the given language."""
    if lang == "en":
        return ""
    name = _NAMES.get(lang, "English")
    return (
        f"\n\nIMPORTANT: Respond entirely in {name}. "
        f"Use the Devanagari script for {name}. "
        f"Keep proper nouns like BMC, CPGRAMS, RTI in English."
    )
