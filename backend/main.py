from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

from routes import validate, classify, draft, file_complaint, tracker, escalate, chat
from services import scheduler

app = FastAPI(title="Civic Issue Bridge API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:5174", "http://127.0.0.1:5174", "http://localhost:5175"],
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
