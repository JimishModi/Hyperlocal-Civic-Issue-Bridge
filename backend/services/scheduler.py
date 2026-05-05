"""
Background scheduler — runs inside the FastAPI process.
Checks daily for complaints that have crossed 14 days without resolution
and sends a reminder email to the citizen.
"""
from datetime import date, timedelta

from apscheduler.schedulers.background import BackgroundScheduler

from db import get_db
from services.mailer import send_followup_reminder

scheduler = BackgroundScheduler()
REMINDER_AFTER_DAYS = 14


def _send_due_reminders():
    db = get_db()
    cutoff = (date.today() - timedelta(days=REMINDER_AFTER_DAYS)).isoformat()

    # Find complaints that are overdue, have a user email, and haven't been reminded yet
    result = (
        db.table("grievances")
        .select("id, reference_code, issue_category, department_name, user_email, filed_at")
        .eq("status", "awaiting")
        .eq("reminder_sent", False)
        .not_.is_("user_email", "null")
        .lte("filed_at", cutoff)
        .execute()
    )

    for g in result.data or []:
        filed = g["filed_at"][:10]
        days_elapsed = (date.today() - date.fromisoformat(filed)).days

        sent = send_followup_reminder(
            user_email=g["user_email"],
            reference_code=g["reference_code"],
            category=g["issue_category"],
            department=g["department_name"],
            days_elapsed=days_elapsed,
        )

        if sent:
            db.table("grievances").update({"reminder_sent": True}).eq(
                "id", g["id"]
            ).execute()


def start():
    # Run once a day at 9 AM
    scheduler.add_job(_send_due_reminders, "cron", hour=9, minute=0)
    scheduler.start()


def stop():
    scheduler.shutdown(wait=False)
