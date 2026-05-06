import logging
import traceback
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Load single shared .env from workspace root (parent of backend/)
load_dotenv(Path(__file__).parent.parent / ".env")

from routes import validate, classify, draft, file_complaint, tracker, escalate, chat
from services import scheduler

app = FastAPI(title="Civic Issue Bridge API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:5175",
        "https://hyperlocal-civic-issue-bridge.vercel.app",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(validate.router)
app.include_router(classify.router)
app.include_router(draft.router)
app.include_router(file_complaint.router)
app.include_router(tracker.router)
app.include_router(escalate.router)
app.include_router(chat.router)


@app.on_event("startup")
def startup():
    scheduler.start()


@app.on_event("shutdown")
def shutdown():
    scheduler.stop()


@app.get("/")
def health():
    return {"status": "ok"}

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logging.error(f"Unhandled server error: {exc}")
    traceback.print_exc()
    
    # We explicitly add the CORS header so the frontend can read the 500 error
    # instead of getting a generic CORS error masking the true issue.
    origin = request.headers.get("origin")
    headers = {}
    if origin in ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:5174", "http://127.0.0.1:5174", "http://localhost:5175"]:
        headers["Access-Control-Allow-Origin"] = origin
        headers["Access-Control-Allow-Credentials"] = "true"

    return JSONResponse(
        status_code=500,
        content={"detail": "Internal Server Error", "error": str(exc)},
        headers=headers
    )
