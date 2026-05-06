import os
import httpx

POSTMARK_TOKEN = os.environ.get("POSTMARK_API_KEY", "")
POSTMARK_URL = "https://api.postmarkapp.com/email"

# Sender must be a verified Sender Signature in your Postmark account.
# In test mode: add your own email at postmarkapp.com → Sender Signatures.
FROM_ADDRESS = os.environ.get("POSTMARK_FROM_EMAIL", "civicbridge@example.com")


def _send(*, to: str, cc: str | None, subject: str, body: str) -> bool:
    payload = {
        "From": FROM_ADDRESS,
        "To": to,
        "Subject": subject,
        "TextBody": body,
    }
    if cc:
        payload["Cc"] = cc

    try:
        r = httpx.post(
            POSTMARK_URL,
            json=payload,
            headers={
                "Accept": "application/json",
                "Content-Type": "application/json",
                "X-Postmark-Server-Token": POSTMARK_TOKEN,
            },
            timeout=10,
        )
        return r.status_code == 200
    except Exception:
        return False


def send_complaint_to_bmc(
    *,
    to_email: str,
    cc_email: str | None,
    subject: str,
    body: str,
    reference_code: str,
) -> bool:
    full_body = (
        f"{body}\n\n"
        f"---\n"
        f"Reference Code: {reference_code}\n"
        f"Filed via: Civic Issue Bridge\n"
    )
    return _send(to=to_email, cc=cc_email, subject=subject, body=full_body)


def send_followup_reminder(
    *,
    user_email: str,
    reference_code: str,
    category: str,
    department: str,
    days_elapsed: int,
) -> bool:
    subject = f"Has BMC responded? — Your complaint {reference_code}"
    body = (
        f"Hi,\n\n"
        f"It has been {days_elapsed} days since you filed your civic complaint "
        f"({reference_code}) about a {category} issue with {department}.\n\n"
        f"Please let us know if BMC has taken any action:\n\n"
        f"  → Open the app and go to Track → enter code {reference_code}\n"
        f"  → If your issue is resolved, mark it as resolved.\n"
        f"  → If there is still no response, you can escalate directly from the app.\n\n"
        f"Under BMC's Grievance Redressal Guidelines, departments must respond within 15 days.\n"
        f"If they haven't, you have the right to escalate — and we'll help you do it.\n\n"
        f"— Civic Issue Bridge"
    )
    return _send(to=user_email, cc=None, subject=subject, body=body)
