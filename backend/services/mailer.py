import base64
import os
from urllib.parse import urlparse

import httpx
import resend

resend.api_key = os.environ.get("RESEND_API_KEY", "")

FROM_ADDRESS = os.environ.get("RESEND_FROM_EMAIL", "onboarding@resend.dev")

# Resend free tier: onboarding@resend.dev can only deliver to your verified account email.
# Set DEMO_EMAIL to your Resend account email so all outbound mail is redirected there.
DEMO_INBOX = os.environ.get("DEMO_EMAIL", "")

# Skip attachments larger than this (Resend hard limit is ~40 MB total per email)
MAX_ATTACHMENT_BYTES = 8 * 1024 * 1024  # 8 MB per file


def _fetch_attachments(image_urls: list[str]) -> list[dict]:
    """Download each image URL and return Resend-compatible attachment dicts."""
    attachments = []
    for i, url in enumerate(image_urls):
        if not url:
            continue
        try:
            with httpx.Client(timeout=10.0, follow_redirects=True) as client:
                r = client.get(url)
                r.raise_for_status()
            if len(r.content) > MAX_ATTACHMENT_BYTES:
                print(f"Skipping attachment {url} — exceeds {MAX_ATTACHMENT_BYTES} bytes")
                continue

            # Derive filename from URL, fallback to evidence-N.<ext>
            parsed = urlparse(url)
            filename = os.path.basename(parsed.path) or f"evidence-{i + 1}.jpg"
            if "." not in filename:
                filename = f"{filename}.jpg"

            attachments.append({
                "filename": filename,
                "content": base64.b64encode(r.content).decode("ascii"),
            })
        except Exception as e:
            print(f"Failed to attach {url}: {e}")
    return attachments


def _send(
    *,
    to: str,
    cc: str | None = None,
    subject: str,
    body: str,
    attachments: list[dict] | None = None,
) -> bool:
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
    # Only add CC if we are NOT in demo mode, otherwise Resend free tier rejects the entire email
    if cc and not DEMO_INBOX:
        params["cc"] = [cc]
    elif cc and DEMO_INBOX:
        params["text"] += f"\n\n[DEMO NOTE: The user requested a CC to {cc}, but CC is disabled in demo mode to prevent Resend delivery errors.]"

    if attachments:
        params["attachments"] = attachments

    try:
        email = resend.Emails.send(params)
        # SDK v2 may return an object or dict — handle both
        email_id = email.get("id") if isinstance(email, dict) else getattr(email, "id", None)
        print(
            f"Resend sent OK — id: {email_id}, to: {actual_to}, "
            f"subject: {subject}, attachments: {len(attachments) if attachments else 0}"
        )
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
    image_urls: list[str] | None = None,
) -> bool:
    image_urls = image_urls or []
    attachments = _fetch_attachments(image_urls)

    photo_note = (
        f"\n\n{len(attachments)} photo(s) of the issue are attached as evidence."
        if attachments
        else ""
    )

    full_body = (
        f"{body}"
        f"{photo_note}\n\n"
        f"---\n"
        f"Reference Code: {reference_code}\n"
        f"Filed via: Civic Issue Bridge\n"
    )
    return _send(
        to=to_email,
        cc=cc_email,
        subject=subject,
        body=full_body,
        attachments=attachments,
    )


def send_followup_reminder(
    *,
    user_email: str,
    reference_code: str,
    category: str,
    department: str,
    days_elapsed: int,
    app_url: str = "https://hyperlocal-civic-issue-bridge.vercel.app",
) -> bool:
    subject = f"Has BMC responded? — Your complaint {reference_code}"
    tracker_url = f"{app_url}/tracker?code={reference_code}"
    body = (
        f"Hi,\n\n"
        f"It has been {days_elapsed} days since you filed your civic complaint "
        f"({reference_code}) about a {category} issue with {department}.\n\n"
        f"Has BMC taken any action? Please update your complaint:\n\n"
        f"  → Track & update your complaint:\n"
        f"    {tracker_url}\n\n"
        f"Once there, you can:\n"
        f"  ✅  Log that BMC responded and took action\n"
        f"  ⚠️  Log that BMC responded but took no action\n"
        f"  ❌  Report that BMC has not responded at all\n"
        f"  🔺  Escalate to RTI or CPGRAMS if needed\n\n"
        f"Under BMC's Grievance Redressal Guidelines, departments must respond within 15 days.\n"
        f"If they haven't, you have the right to escalate — and we'll help you do it.\n\n"
        f"— Civic Issue Bridge"
    )
    return _send(to=user_email, subject=subject, body=body)
