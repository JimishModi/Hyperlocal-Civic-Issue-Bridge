import os
import resend

resend.api_key = os.environ.get("RESEND_API_KEY", "")

# Using Resend's shared onboarding address — works immediately without domain verification.
# To use your own domain, add it at resend.com/domains and update RESEND_FROM_EMAIL.
FROM_ADDRESS = os.environ.get("RESEND_FROM_EMAIL", "onboarding@resend.dev")


def _send(*, to: str, subject: str, body: str) -> bool:
    """Send a single email via Resend."""
    params: resend.Emails.SendParams = {
        "from": FROM_ADDRESS,
        "to": [to],
        "subject": subject,
        "text": body,
    }
    try:
        email = resend.Emails.send(params)
        return bool(email.get("id"))
    except Exception as e:
        print(f"Resend error: {e}")
        return False


def send_complaint_to_bmc(
    *,
    to_email: str,          # BMC department email (shown in body)
    cc_email: str | None,   # Citizen email — receives the actual copy
    subject: str,
    body: str,
    reference_code: str,
) -> bool:
    """
    Send a complaint email.

    Because Resend's onboarding@resend.dev can only deliver to the
    account's verified email address, we send the citizen's copy directly
    TO them (cc_email) so they definitely receive it. The BMC department
    address is included in the body as the intended recipient.
    """
    full_body = (
        f"This complaint has been filed with: {to_email}\n\n"
        f"{body}\n\n"
        f"---\n"
        f"Reference Code: {reference_code}\n"
        f"Filed via: Civic Issue Bridge\n"
    )

    if cc_email:
        # Send the citizen their own copy — this is the reliably delivered email.
        return _send(
            to=cc_email,
            subject=f"[Your Copy] {subject}",
            body=full_body,
        )

    # No citizen email provided — nothing to send.
    return False


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
