import os
import resend

resend.api_key = os.environ.get("RESEND_API_KEY", "")

FROM_ADDRESS = os.environ.get("RESEND_FROM_EMAIL", "onboarding@resend.dev")

# Resend free tier: onboarding@resend.dev can only deliver to your verified account email.
# Set DEMO_EMAIL to your Resend account email so all outbound mail is redirected there.
DEMO_INBOX = os.environ.get("DEMO_EMAIL", "")


def _send(*, to: str, cc: str | None = None, subject: str, body: str) -> bool:
    # In demo mode, redirect all mail to your own inbox
    actual_to = DEMO_INBOX if DEMO_INBOX else to
    demo_note = (
        f"[DEMO — production recipient: {to}]\n\n"
        if DEMO_INBOX and DEMO_INBOX != to
        else ""
    )

    params: resend.Emails.SendParams = {
        "from": FROM_ADDRESS,
        "to": [actual_to],
        "subject": subject,
        "text": demo_note + body,
    }
    if cc and cc != actual_to:
        params["cc"] = [cc]

    try:
        email = resend.Emails.send(params)
        # SDK v2 may return an object or dict — handle both
        email_id = email.get("id") if isinstance(email, dict) else getattr(email, "id", None)
        print(f"Resend sent OK — id: {email_id}, to: {actual_to}, subject: {subject}")
        return bool(email_id)
    except Exception as e:
        print(f"Resend ERROR: {e}")
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
    return _send(to=user_email, subject=subject, body=body)
