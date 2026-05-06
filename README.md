Vercel Link for frontend: https://hyperlocal-civic-issue-bridge.vercel.app/ 
Railway Link for backend: https://vigilant-stillness-production.up.railway.app/
# Hyperlocal Civic Issue Bridge

> An AI-powered Progressive Web App that turns a citizen's photo of a pothole, a broken streetlight, or an overflowing drain into a properly addressed, formally drafted, trackable civic complaint sent to the right BMC department — with a built-in escalation pathway when the system goes silent.

Built for the **AIC × Anthropic Claude Hackathon (May 2026)**. Targeted at residents of **BMC S-Ward (Powai), Mumbai**.

---

## Table of Contents

1. [The Problem](#the-problem)
2. [The Solution](#the-solution)
3. [Feature Overview](#feature-overview)
4. [User Journey](#user-journey)
5. [Architecture](#architecture)
6. [Tech Stack](#tech-stack)
7. [Project Structure](#project-structure)
8. [Backend API Reference](#backend-api-reference)
9. [Frontend Pages & Components](#frontend-pages--components)
10. [AI Pipeline](#ai-pipeline)
11. [Multilingual Support](#multilingual-support)
12. [Database Schema](#database-schema)
13. [Local Development](#local-development)
14. [Environment Variables](#environment-variables)
15. [Deployment](#deployment)
16. [Design System](#design-system)
17. [Roadmap](#roadmap)
18. [License](#license)

---

## The Problem

Filing a civic complaint with the BMC today involves:

- Knowing **which** of dozens of departments handles your specific issue
- Drafting a formal letter in legalistic English
- Locating the right email address or grievance portal
- Manually following up if nothing happens — most citizens don't, and complaints disappear into the void
- Discovering escalation rights (RTI, CPGRAMS) that almost no one knows exist

The result: civic problems persist not because nobody reports them, but because reporting them is exhausting and opaque.

## The Solution

**Civic Issue Bridge** removes every friction point between *seeing a problem* and *holding the right department accountable*:

- Snap a photo → AI classifies the issue and routes it to the correct BMC sub-department
- Auto-drafted formal complaint email, ready to send
- 8-character reference code for tracking — like a Domino's order, but for governance
- 14-day silent-treatment detector that reminds the citizen automatically
- Built-in escalation engine: Follow-up → RTI → CPGRAMS, with the right document drafted at each stage
- A chatbot that explains the process in **English, Hindi, or Marathi**

---

## Feature Overview

| Feature | Description |
|---|---|
| **Google OAuth Sign-in** | Single-tap sign-in via Supabase Auth. Citizen profile auto-created on first login. |
| **Photo Evidence Capture** | Native camera or gallery upload. Image stored in Supabase Storage; public URL embedded in the complaint. |
| **AI Classification** | Groq (Llama 3.3 70B) classifies the issue into one of ~10 BMC categories with a confidence score and routes it to the responsible sub-department. |
| **Reverse Geocoding** | Browser GPS → Nominatim (OpenStreetMap) → human-readable street address (e.g., "Hiranandani Gardens, Powai, Mumbai 400076"). |
| **Duplicate Detection** | Same category + within 200 m of an unresolved complaint? User is shown the existing reference code with options to **Track Existing** or **File Anyway**. |
| **AI Complaint Drafting** | Llama 3.3 produces a formal, BMC-ready complaint letter (with subject line, professional tone, citation of grievance policy). |
| **Multi-channel Filing** | Send by email (`mailto:` deep link), file on BMC portal, or "Save & Track" — which sends via Resend AND stores in the database. |
| **8-character Reference Code** | Generated at filing time (e.g., `A3X7F2K9`) — used for tracking, escalation, and reminder lookups. |
| **Status Tracker** | View status (Awaiting / Escalated / Resolved), filing date, days since filed, action log timeline, and escalation history. |
| **Action Logging** | Citizen logs real-world updates: "BMC responded and acted", "Partial response", "No response yet", "Mark resolved", or freeform notes. |
| **14-Day Reminder Cron** | APScheduler job runs daily at 9 AM. If a complaint is unresolved + has a user email + 14 days elapsed → automatic Resend email reminder. |
| **Smart Escalation Engine** | Three-stage pathway: Follow-up Letter → RTI Application → CPGRAMS. Each stage is drafted by the LLM with the correct legal language. |
| **Built-in Civic Chatbot** | Floating chat window on every internal page. Answers questions about BMC procedures, RTI, complaint timelines, and app usage — in the user's chosen language. |
| **Multilingual UI + AI** | English, Hindi, Marathi. UI strings translated via `react-i18next`; AI responses (chatbot, classification description) are language-aware via the `X-User-Language` header. |
| **PWA-Ready** | Installable on mobile. Mobile-first design tokens. Offline manifest in `public/`. |

---

## Detailed Feature Architecture

### 1. Image Processing & Multimodal AI
A core capability of Civic Issue Bridge is its robust image processing and vision-based AI classification system. This feature reduces friction for the citizen by allowing them to simply "point and shoot" to document an issue, rather than typing a long explanation.
- **Multi-Photo Evidence Capture:** The frontend includes a custom `MultiPhotoCapture` component interfacing directly with the `MediaDevices` API, allowing users to capture or upload up to 5 high-resolution photos with a live viewfinder and thumbnail review.
- **Intelligent Cloud Storage:** Images are passed securely via `FormData` to the FastAPI backend, which uploads the byte streams directly to a Supabase Storage Bucket, converting them into permanent, public URLs.
- **Dynamic Vision Model Routing:** If images are provided, the backend dynamically routes the request to Groq's dedicated vision model (**`meta-llama/llama-4-scout-17b-16e-instruct`**), analyzing the scene to automatically categorize the issue. If no images are provided, it gracefully degrades to a faster text-only reasoning model (**`llama-3.3-70b-versatile`**).

### 2. Comprehensive Multilingual Architecture
Civic issues affect citizens from all backgrounds, so language accessibility is built deeply into the stack—not just as an afterthought.
- **Frontend Localization:** Leveraging `react-i18next` and local storage detection, the entire UI is available in **English, Hindi, and Marathi**. Users can toggle languages on the fly from the top navigation bar.
- **AI Context Injection:** A custom backend middleware (`utils/lang.py`) extracts the `X-User-Language` header from incoming requests. This header is dynamically injected into the system prompt for the Groq AI, instructing it to generate the issue description, reasoning, and chatbot responses in the user's native language and script (e.g., Devanagari).
- **Compliance Safeguards:** While the user interacts in their native language, the LLM is strictly instructed to keep official department names, technical categories, and the final drafted email body strictly in English to comply with BMC's administrative requirements.

### 3. Smart Duplicate Detection (Geospatial)
To prevent the BMC from being flooded with multiple complaints about the exact same issue (e.g., the same pothole reported by 10 different neighbors), the app employs a geospatial duplicate guard.
- **Location Extraction:** The app uses the browser's HTML5 Geolocation API, falling back to IP-based location if necessary.
- **PostGIS Radius Search:** When an issue is classified, the backend queries the Supabase `grievances` table using the Haversine formula to detect any *unresolved* complaints of the *same category* within a **200-meter radius**.
- **User Intervention:** If a duplicate is found, the backend returns a `409 Conflict`. The UI displays a warning banner ("Already Reported") showing the existing reference code. The user can either click "Track Existing" to follow the current resolution progress, or "File Anyway" if they believe their issue is genuinely distinct.

### 4. Automated Tracking & Escalation Engine
Filing a complaint is easy, but following up is where citizens usually give up. The Civic Issue Bridge automates the follow-up burden.
- **14-Day Reminder Cron:** A scheduled `APScheduler` job runs on the backend daily. It scans the database for any complaint that has been in the `awaiting` state for exactly 14 days and automatically fires a reminder email (via Resend) to the citizen.
- **Three-Stage Escalation Pathway:** If the BMC ignores the complaint, the tracker provides a guided escalation path. 
  - *Stage 1 (Follow-up):* Generates a formal follow-up letter referencing the original complaint code.
  - *Stage 2 (RTI Application):* If 30 days pass, the AI drafts a legal Right to Information (RTI) application demanding the status of the repair work.
  - *Stage 3 (CPGRAMS):* The final step drafts an escalation to the Central Government's grievance portal.

### 5. AI Civic Assistant (Chatbot)
Civic navigation can be confusing, so every internal page features a floating AI chatbot button.
- **Context-Aware:** The chatbot knows it is operating within the Civic Issue Bridge app and is primed with knowledge about BMC's grievance redressal guidelines, typical resolution timelines, and RTI procedures.
- **Multilingual Support:** The chatbot speaks the user's selected UI language seamlessly, allowing a Marathi-speaking citizen to ask complex questions about civic jurisdiction and receive accurate, localized answers in Marathi.

### 6. 3-Layer AI Safety & Governance Architecture
Handling civic data and interacting with citizens requires robust safeguards against hallucinations, prompt injections, and misrouted data. The backend is hardened with a strict, independent 3-layer security model to ensure the LLM remains a helpful tool rather than a vulnerability.

#### Layer 1: Simulated Llama Guard (Chatbot Protection)
To prevent prompt injections, jailbreaks, and out-of-domain abuse (e.g., "Ignore previous instructions", hostile language, or unrelated queries), the `/chat` route is protected by a dedicated input/output guardrail service (`services/guard.py`).
- **Pre-Flight Input Guarding**: Before the citizen's message reaches the main conversational model, it is evaluated by a strict classification prompt running on a zero-temperature LLM. If the input is flagged as unsafe or manipulative, the request is immediately blocked.
- **Post-Flight Output Guarding**: The AI's generated response is similarly verified before being returned to the citizen.
- **Multilingual Graceful Refusal**: If an interaction is blocked, the backend returns a polite, hardcoded refusal mapped to the user's selected UI language (English, Hindi, or Marathi) via the `X-User-Language` header, redirecting them back to civic topics.
- **Fail-Open Architecture**: To ensure the platform remains accessible during high API load, the guard logic is wrapped in a `try/except` block that fails open, relying on Layer 3 for fallback protection.

#### Layer 2: Source-of-Truth Metadata Pinning (Routing Integrity)
While LLMs are excellent at categorizing natural language, they are prone to hallucinating specific administrative details like emails and URLs. Layer 2 strips the LLM of its routing authority.
- **Canonical Configuration**: All official BMC department names, emails, and portal URLs are strictly defined in `config/bmc_ward.json`.
- **API Overrides**: When a citizen submits an issue, the LLM may suggest a department, but the `/classify` and `/file` routes intercept the request. The backend cross-references the LLM's suggested *category* with the canonical JSON (`utils/dept.py`) and forcibly overwrites the `department_name` and `recipient_email`. 
- **Spoof Prevention**: Even if a malicious client attempts to POST a fake recipient email to the backend, Layer 2 overwrites it with the canonical government email, ensuring the complaint is never misrouted or exploited.

#### Layer 3: System Prompt Hard Constraints (Hallucination Prevention)
To ensure the LLM strictly adheres to BMC reality, all five system prompts (`complaint_drafter.txt`, `escalation.txt`, `cpgrams_guide.txt`, `vision_classifier.txt`, `chatbot.txt`) feature a non-negotiable `### HARD CONSTRAINTS ###` block.
- **No Invented Civics**: The LLM is explicitly forbidden from citing specific RTI Act section numbers, inventing government officer names, citing court cases, or quoting arbitrary monetary fines.
- **Neutralization**: If a user's input contains profanity or threats, the drafter neutralizes it, writing the formal grievance letter in a respectful tone without amplifying the abusive language.
- **Exact Output Enforcing**: The multimodal vision classifier is forced to output exact string matches from the allowed category array, defaulting safely to "Other" if uncertain, maintaining database schema integrity.

---

## User Journey

```
                ┌─────────────────────────────────────────────────────┐
                │                  Landing Page                        │
                │     (Language switcher · Log In / Report Issue)      │
                └──────────────────────┬──────────────────────────────┘
                                       │
                                       ▼
                ┌─────────────────────────────────────────────────────┐
                │                  Google OAuth                        │
                │              (Supabase Auth · /auth)                 │
                └──────────────────────┬──────────────────────────────┘
                                       │
                                       ▼
                ┌─────────────────────────────────────────────────────┐
                │              Intake (/intake)                        │
                │   Photo · Description (text/voice) · GPS location    │
                └──────────────────────┬──────────────────────────────┘
                                       │
                            POST /classify (multipart)
                                       │
                                       ▼
              ┌────────────────────────────────────────────────────────┐
              │ Backend: validate → reverse-geocode → classify →       │
              │ duplicate check (200m radius) → upload image → respond │
              └──────────────────────┬─────────────────────────────────┘
                                     │
                ┌────────────────────┴────────────────────┐
                │                                         │
        Duplicate found?                          No duplicate
                │                                         │
                ▼                                         ▼
        Show warning chip:                  ┌───────────────────────┐
        "Already reported as <ref>"         │   Result (/result)    │
        ┌─────────────┬────────────┐        │ Category · Confidence │
        │             │            │        │ Department · Location │
   Track Existing  File Anyway     │        └───────────┬───────────┘
        │             │                                 │
        ▼             ▼                                 │ Confirm
   /tracker      /result?force                          │
                                                        ▼
                                          POST /draft → AI letter
                                                        │
                                                        ▼
                                          ┌────────────────────────┐
                                          │      Draft (/draft)    │
                                          │  Edit · Email · Portal │
                                          │      · Save & Track    │
                                          └───────────┬────────────┘
                                                      │
                                          POST /file (creates record + sends email)
                                                      │
                                                      ▼
                                          ┌────────────────────────┐
                                          │  Reference: A3X7F2K9   │
                                          │  Continue to Tracker   │
                                          └───────────┬────────────┘
                                                      │
                                                      ▼
                              ┌─────────────────────────────────────────┐
                              │             Tracker (/tracker)          │
                              │  Status · Action Log · Escalation       │
                              │  + Mark Resolved + Log Action           │
                              └────┬─────────────────────────────┬──────┘
                                   │                             │
                              > 15 days unresolved          User-driven
                                   │                             │
                                   ▼                             ▼
                          ┌──────────────────┐         ┌──────────────────┐
                          │   Escalation     │         │   Dashboard      │
                          │ (/escalation)    │         │  (/dashboard)    │
                          │                  │         │  All complaints  │
                          │ Follow-up → RTI  │         │  Action timeline │
                          │ → CPGRAMS        │         └──────────────────┘
                          └──────────────────┘

  Background: Daily 9 AM cron → 14-day-old unresolved complaints → Resend reminder email
```

---

## Architecture

```
┌────────────────────────────────┐         ┌─────────────────────────────────┐
│      React + Vite SPA          │         │         FastAPI Backend         │
│   (deployed on Vercel)         │ ──────▶ │      (deployed on Railway)      │
│                                │  HTTPS  │                                 │
│  • react-router-dom v6         │  +      │  • /validate, /classify,        │
│  • react-i18next (en/hi/mr)    │  CORS   │    /draft, /file, /track,       │
│  • Tailwind design system      │         │    /escalate, /chat,            │
│  • Supabase JS SDK (auth)      │         │    /my-complaints               │
│  • Web Speech / Geolocation    │         │  • APScheduler (14-day cron)    │
└──────────┬─────────────────────┘         │  • CORS allowlist               │
           │                               └────────┬────────────────────────┘
           │ Supabase Auth                          │
           │ (OAuth tokens)                         │
           ▼                                        │
┌────────────────────────────────┐                  │
│        Supabase                │ ◀────────────────┤
│  • Postgres (grievances,       │   service-role   │
│    grievance_updates,          │   key over HTTPS │
│    escalations, citizens)      │                  │
│  • Storage (complaint_images)  │                  │
│  • Auth (Google OAuth)         │                  │
└────────────────────────────────┘                  │
                                                    │
              ┌─────────────────────────────────────┼──────────────┐
              │                                     │              │
              ▼                                     ▼              ▼
     ┌─────────────────┐              ┌────────────────────┐  ┌──────────────┐
     │   Groq Cloud    │              │       Resend       │  │   Nominatim  │
     │ Llama 3.3 70B   │              │   (Email API)      │  │ (OpenStreet- │
     │   (free tier)   │              │  + DEMO_EMAIL      │  │   Map)       │
     └─────────────────┘              │     redirect       │  │   Reverse    │
                                      └────────────────────┘  │   Geocoding  │
                                                              └──────────────┘
```

**Key design decisions:**

- **No vendor lock-in for AI**: All Groq calls use the standard chat-completions API, swappable for any OpenAI-compatible provider.
- **Service-role key on backend only**: Postgres RLS bypassed server-side; the frontend never touches the database directly. Auth tokens are used for Supabase Auth only.
- **Demo email redirect**: All outbound mail goes to a single verified address (`DEMO_EMAIL`) until the BMC partnership is formalized. No real BMC inbox is ever spammed by the demo.
- **Stateless backend**: All state lives in Supabase. Backend can scale horizontally; only the scheduler is a singleton concern (acceptable for a single-instance deployment).

---

## Tech Stack

### Frontend
- **React 19** + **Vite 8**
- **React Router v6** for routing
- **Tailwind CSS 3** with a custom "Civic Bridge" design token system
- **react-i18next** + **i18next-browser-languagedetector** for multilingual UI
- **`@supabase/supabase-js`** for OAuth + session management
- **Lucide React** for iconography
- Native **Web Speech API** (voice description) + **Geolocation API**

### Backend
- **FastAPI** (Python 3.11+)
- **Pydantic v2** for request/response validation
- **Groq SDK** (`AsyncGroq`) — Llama 3.3 70B
- **Supabase Python SDK** (PostgREST + Storage)
- **Resend SDK v2** for transactional email
- **APScheduler** for the 14-day reminder cron
- **httpx** for outbound HTTP (Nominatim)

### Infrastructure
- **Vercel** (frontend, with `vercel.json` SPA fallback)
- **Railway** (backend, with `railway.toml`)
- **Supabase** (Postgres, Storage, Auth)
- **Groq Cloud** (LLM inference)
- **Resend** (email delivery)
- **OpenStreetMap Nominatim** (reverse geocoding, free tier)

---

## Project Structure

```
Hyperlocal Civic Issue Bridge/
│
├── backend/                          # FastAPI application
│   ├── main.py                       # Entry point — CORS, router registration, scheduler lifecycle, global exception handler
│   ├── db.py                         # Supabase client factory (uses SUPABASE_SERVICE_KEY)
│   ├── railway.toml                  # Railway deployment config
│   ├── requirements.txt              # Python dependencies
│   │
│   ├── routes/
│   │   ├── validate.py               # POST /validate — security gate (LLM-based input safety check)
│   │   ├── classify.py               # POST /classify — multipart form: photo + desc + GPS → category, dept, geocoded location, duplicate check
│   │   ├── draft.py                  # POST /draft — AI-generated formal complaint letter
│   │   ├── file_complaint.py         # POST /file — persist + send via Resend; final duplicate guard
│   │   ├── tracker.py                # GET /track/{code}, PATCH /track/{code}/resolve, POST /track/{code}/action
│   │   ├── escalate.py               # POST /escalate — 3-stage drafter (followup / rti / cpgrams)
│   │   ├── chat.py                   # POST /chat — civic chatbot (language-aware)
│   │   └── dashboard.py              # GET /my-complaints?email= — user's full complaint history
│   │
│   ├── services/
│   │   ├── mailer.py                 # Resend integration; DEMO_EMAIL redirect; send_complaint_to_bmc, send_followup_reminder
│   │   └── scheduler.py              # APScheduler — daily 9 AM cron for 14-day reminders
│   │
│   ├── prompts/                      # Plaintext system prompts loaded at module import
│   │   ├── security_gate.txt         # Input safety filter
│   │   ├── vision_classifier.txt     # Issue classifier (vision-capable text mode)
│   │   ├── complaint_drafter.txt     # BMC-ready letter generator
│   │   ├── escalation.txt            # Follow-up / RTI letter generator
│   │   ├── cpgrams_guide.txt         # CPGRAMS-specific drafter + filing guide
│   │   └── chatbot.txt               # Civic Bridge Assistant persona
│   │
│   ├── config/
│   │   └── bmc_ward.json             # Static department + email map for BMC S-Ward
│   │
│   └── utils/
│       ├── geo.py                    # haversine_km(), find_nearby_duplicate()
│       └── lang.py                   # get_lang(request), lang_instruction(lang) — reads X-User-Language header
│
├── frontend/                         # React PWA
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js            # Custom design tokens
│   ├── vercel.json                   # SPA fallback rewrite for client-side routing
│   ├── public/
│   │   ├── manifest.json             # PWA manifest
│   │   ├── favicon.svg
│   │   └── icons.svg
│   │
│   └── src/
│       ├── main.jsx                  # React root + i18n initialization
│       ├── App.jsx                   # Routes + TopNav (with language switcher)
│       ├── index.css                 # Tailwind directives + global component classes
│       │
│       ├── pages/
│       │   ├── Landing.jsx           # /          — public landing, language switcher, login
│       │   ├── Auth.jsx              # /auth      — Google OAuth via Supabase
│       │   ├── Intake.jsx            # /intake    — photo + description + GPS
│       │   ├── Result.jsx            # /result    — classification result + duplicate banner
│       │   ├── Draft.jsx             # /draft     — editable AI complaint letter + multi-channel filing
│       │   ├── Tracker.jsx           # /tracker   — status + action log + escalation entry
│       │   ├── Escalation.jsx        # /escalation — 3-stage escalation flow
│       │   └── Dashboard.jsx         # /dashboard — all complaints by user email + action logging
│       │
│       ├── components/
│       │   ├── ChatBot.jsx           # Floating civic assistant on every inner page
│       │   ├── DraftEditor.jsx       # Reusable textarea for letter editing
│       │   └── VoiceInput.jsx        # Web Speech API wrapper
│       │
│       ├── config/
│       │   ├── api.js                # apiFetch wrapper — base URL, X-User-Language header, error parsing
│       │   └── supabase.js           # Supabase client (anon key)
│       │
│       └── i18n/
│           ├── index.js              # i18next init, localStorage persistence
│           └── locales/
│               ├── en.json           # English (149 keys)
│               ├── hi.json           # Hindi
│               └── mr.json           # Marathi
│
├── README.md                         # ← you are here
└── Reports/                          # Hackathon submission artifacts
```

---

## Backend API Reference

All endpoints are JSON unless noted. Every request may include an `X-User-Language` header (`en`, `hi`, or `mr`) which influences AI-generated text. Defaults to `en`.

### `POST /validate` — Input safety gate
Multipart form. Runs an LLM-based check that the description and image are appropriate civic-complaint content. Returns `422` if rejected.

### `POST /classify` — Issue classification
**Multipart form fields:**
- `description: str`
- `image: UploadFile` (optional)
- `latitude: float` (optional)
- `longitude: float` (optional)

**Response:**
```json
{
  "category": "Road & Footpath",
  "department": "BMC Roads Department — S-Ward",
  "confidence": 0.92,
  "description": "Large pothole at the intersection of Hiranandani Main Road…",
  "location": "Hiranandani Gardens, Powai, Mumbai, 400076",
  "image_url": "https://<supabase>/storage/v1/.../<uuid>.jpg",
  "duplicate": {
    "reference_code": "A3X7F2K9",
    "status": "awaiting",
    "date_filed": "2026-04-22"
  }
}
```
The `duplicate` field is `null` if no nearby (≤200 m) unresolved complaint of the same category exists.

### `POST /draft` — AI complaint letter
**Body:** `{ category, department, description, location, image_url? }`

**Response:** `{ body, subject, department, category, email, portal_url, ... }`

### `POST /file` — Persist + send the complaint
**Body:**
```json
{
  "body": "...",
  "subject": "...",
  "department": "...",
  "category": "...",
  "email": "<BMC dept email>",
  "user_email": "<citizen email>",
  "description": "...",
  "image_url": "...",
  "latitude": 19.12,
  "longitude": 72.91,
  "force": false,
  "filing_method": "direct"
}
```
- `force: false` (default) → backend re-checks for duplicates and returns `409 DUPLICATE:<ref>` if one exists.
- `force: true` → bypass duplicate check (user explicitly chose "File Anyway").

**Response:** `{ reference_code, email_sent, ... }`

### `GET /track/{code}` — Tracker payload
**Response:**
```json
{
  "status": "awaiting",
  "category": "Road & Footpath",
  "department": "BMC Roads Department — S-Ward",
  "date_filed": "2026-04-22",
  "days_since_filed": 14,
  "escalations": [{ "type": "follow_up", "date": "2026-05-06" }],
  "updates": [{ "type": "no_response", "notes": "", "date": "2026-04-30" }]
}
```

### `PATCH /track/{code}/resolve` — Mark resolved

### `POST /track/{code}/action` — Log a real-world update
**Body:** `{ update_type: "bmc_responded" | "bmc_partial" | "no_response" | "resolved" | "note", notes: string }`

If `update_type === "resolved"`, the grievance status is also flipped to `resolved`.

### `POST /escalate` — Generate escalation document
**Body:** `{ reference_code, type, category, department }` where `type ∈ {followup, rti, cpgrams}`.

**Response:** `{ body, subject, email, portal_url, escalation_path, filing_steps[], process_breakdown { what, why?, where, expected_response, next_step | after_cpgrams } }`

The endpoint also writes a row to `escalations` and updates the grievance status to `escalated`.

### `POST /chat` — Civic chatbot
**Body:** `{ messages: [{role: "user"|"assistant", content: string}, ...] }`

**Response:** `{ reply: string }` — in the user's selected language (driven by `X-User-Language`).

### `GET /my-complaints?email=<email>` — User dashboard payload
Returns every complaint filed by `email`, each enriched with its `updates[]` timeline.

---

## Frontend Pages & Components

### Pages
| Route | File | Purpose |
|---|---|---|
| `/` | `Landing.jsx` | Public landing. Language switcher (top-right). Login or "Report an Issue" CTAs. |
| `/auth` | `Auth.jsx` | Google OAuth via Supabase. Single-button flow. |
| `/intake` | `Intake.jsx` | Photo (camera or gallery) + text/voice description + GPS button. POSTs multipart to `/classify`. |
| `/result` | `Result.jsx` | Shows category + confidence + department from classification. Duplicate banner if applicable. |
| `/draft` | `Draft.jsx` | Editable AI letter. User email field (required for tracking). Three filing modes. |
| `/tracker` | `Tracker.jsx` | Status, days since filed, action log, escalation history, escalation CTA when overdue. |
| `/escalation` | `Escalation.jsx` | Three-step escalator (Follow-up → RTI → CPGRAMS) with AI-generated documents. |
| `/dashboard` | `Dashboard.jsx` | All-complaints view for the signed-in user. Inline action logging per row. |

### Shared Components
- **`ChatBot.jsx`** — Floating chat widget visible on every page except `/` and `/auth`. Maintains in-memory conversation; calls `/chat` on each turn.
- **`DraftEditor.jsx`** — Translated textarea with character counter. Used by both `Draft.jsx` and `Escalation.jsx`.
- **`VoiceInput.jsx`** — Web Speech API wrapper that streams transcripts into the description field.

### `TopNav` (in `App.jsx`)
- Hidden on `/` and `/auth` routes
- Hidden when no Supabase session exists
- Shows: Home button · My Complaints button · **Language switcher** (`EN / हिं / मरा`)

### `apiFetch` (`config/api.js`)
A thin `fetch` wrapper that:
1. Prepends `VITE_API_BASE_URL`
2. Sets `Content-Type: application/json` for non-FormData bodies
3. **Always sends `X-User-Language` header** based on `i18n.language`
4. Throws `Error` with the parsed `detail` field on non-2xx

---

## AI Pipeline

The app uses **Groq Cloud** (Llama 3.3 70B Versatile, free tier) for every LLM call. Each route loads its system prompt from `backend/prompts/<name>.txt` at import time.

| Route | Prompt | Mode | Output |
|---|---|---|---|
| `/validate` | `security_gate.txt` | JSON | `{ status: "accept" \| "reject", reason? }` |
| `/classify` | `vision_classifier.txt` | JSON | `{ category, department, confidence, description_cleaned }` |
| `/draft` | `complaint_drafter.txt` | JSON | `{ subject, body }` |
| `/escalate` (followup, rti) | `escalation.txt` | JSON | `{ subject, body, filing_steps[] }` |
| `/escalate` (cpgrams) | `cpgrams_guide.txt` | JSON | `{ subject, body, portal_url, filing_steps[], expected_response_days }` |
| `/chat` | `chatbot.txt` | Text | Plain text reply |

**Language handling:** `utils/lang.py` reads the `X-User-Language` header and (for `hi` / `mr`) appends a one-shot instruction to the system prompt:

> *"IMPORTANT: Respond entirely in Hindi. Use the Devanagari script for Hindi. Keep proper nouns like BMC, CPGRAMS, RTI in English."*

Applied to:
- `/chat` — every reply in user's language
- `/classify` — only the `description_cleaned` field is translated; `category` and `department` stay in English (they're enums)

**Not** applied to `/draft` and `/escalate`, because BMC processes English-language correspondence.

---

## Multilingual Support

- **Languages:** English (`en`), Hindi (`hi`), Marathi (`mr`)
- **Library:** `react-i18next` with `i18next-browser-languagedetector`
- **Persistence:** `localStorage` key `i18nextLng`
- **Coverage:** 149 keys per locale, identical key set across all three files

**Adding a new string:**
1. Add the key to all three files in `frontend/src/i18n/locales/`.
2. Use `const { t } = useTranslation()` in the component, then `t('section.key')`.
3. For values with variables, use `t('section.key', { count: n })` and `{{count}}` in the JSON.

**Adding a new language:**
1. Create `frontend/src/i18n/locales/<code>.json` with the same keys as `en.json`.
2. Import in `i18n/index.js` and add to the `resources` map.
3. Add the option to the `LANGS` array in `App.jsx`.
4. Update `_SUPPORTED` and `_NAMES` in `backend/utils/lang.py`.

---

## Database Schema

Supabase Postgres. Service-role key bypasses RLS; the backend is the only writer.

### `grievances`
| Column | Type | Notes |
|---|---|---|
| `id` | bigint, PK | |
| `reference_code` | varchar(8), unique | Public-facing tracking code |
| `ward` | text | "S-Ward" |
| `issue_category` | text | Matches a key in `bmc_ward.json` |
| `department_name` | text | |
| `department_email` | text | BMC dept inbox |
| `user_description` | text | Raw user input |
| `draft_complaint` | text | Final approved letter |
| `status` | text | `awaiting` / `escalated` / `resolved` |
| `user_email` | varchar(150) | Citizen's email — for reminder + dashboard |
| `latitude`, `longitude` | float | GPS for duplicate detection |
| `filing_method` | text | `direct` / `email` / `portal` / `both` |
| `email_sent_at` | timestamptz | Set by mailer on success |
| `reminder_sent` | boolean | Idempotency flag for the 14-day cron |
| `filed_at` | timestamptz | `default now()` |

### `escalations`
| Column | Type |
|---|---|
| `id` | bigint, PK |
| `grievance_id` | bigint, FK → grievances |
| `escalation_type` | text — `follow_up` / `rti` / `cpgrams` |
| `draft_text` | text |
| `days_elapsed` | int |
| `triggered_at` | timestamptz |

### `grievance_updates`
| Column | Type |
|---|---|
| `id` | bigint, PK |
| `reference_code` | varchar(8), FK |
| `update_type` | text — `bmc_responded` / `bmc_partial` / `no_response` / `resolved` / `note` |
| `notes` | text |
| `created_at` | timestamptz |

### Storage bucket: `complaint_images`
Public bucket. Files keyed by `<uuid>.<ext>`.

---

## Local Development

### Prerequisites
- Node.js ≥ 18
- Python ≥ 3.10 (3.11 recommended)
- Free accounts for: **Supabase**, **Groq**, **Resend**

### 1. Clone and configure
```bash
git clone https://github.com/JimishModi/Hyperlocal-Civic-Issue-Bridge.git
cd Hyperlocal-Civic-Issue-Bridge
```

Create a single `.env` file at the **workspace root** (the backend reads it from there):
```env
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOi...   # service-role key, NOT anon
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
DEMO_EMAIL=youremail@gmail.com        # all outbound mail redirects here
```

### 2. Backend
```bash
cd backend
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS / Linux
source .venv/bin/activate

pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### 3. Database setup (one-time)
In the Supabase SQL editor, run:
```sql
-- Adjust column types as needed.
CREATE TABLE grievances ( /* see schema above */ );
CREATE TABLE escalations ( /* ... */ );
CREATE TABLE grievance_updates ( /* ... */ );

-- Service role needs write permissions
GRANT ALL ON public.grievances TO service_role;
GRANT ALL ON public.escalations TO service_role;
GRANT ALL ON public.grievance_updates TO service_role;

-- Storage bucket for images
INSERT INTO storage.buckets (id, name, public) VALUES ('complaint_images', 'complaint_images', true);
```

### 4. Frontend
```bash
cd frontend
npm install
```

Create `frontend/.env`:
```env
VITE_API_BASE_URL=http://localhost:8000
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...   # anon key, NOT service-role
```

Run the dev server:
```bash
npm run dev    # http://localhost:5173
```

### 5. Supabase Auth — Google OAuth setup
1. **Supabase Dashboard → Authentication → Providers → Google**: enable + paste OAuth client ID and secret.
2. **URL Configuration**:
   - Site URL: `http://localhost:5173` (dev) or your Vercel URL (prod)
   - Redirect URLs: add both dev and prod origins
3. In your Google Cloud Console OAuth client, add the Supabase callback URL: `https://<project>.supabase.co/auth/v1/callback`.

---

## Environment Variables

### Backend (read from workspace root `.env`)
| Variable | Required | Purpose |
|---|---|---|
| `GROQ_API_KEY` | ✅ | Llama 3.3 70B inference |
| `SUPABASE_URL` | ✅ | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | ✅ | Service-role key (never expose to frontend) |
| `RESEND_API_KEY` | ✅ | Transactional email |
| `DEMO_EMAIL` | ⚠️ | If set, all outbound mail is redirected here. Required until BMC integration is real. |

### Frontend (`frontend/.env`)
| Variable | Required | Purpose |
|---|---|---|
| `VITE_API_BASE_URL` | ✅ | Backend URL (no trailing slash). e.g., `http://localhost:8000` or your Railway URL |
| `VITE_SUPABASE_URL` | ✅ | Same as backend's `SUPABASE_URL` |
| `VITE_SUPABASE_ANON_KEY` | ✅ | Anon (public) key — safe to expose |

---

## Deployment

### Backend → Railway
1. Connect the GitHub repo. Set the **service root directory** to `backend/`.
2. Add all backend env vars in **Variables**.
3. Railway auto-detects `railway.toml`:
   ```toml
   [deploy]
   startCommand = "uvicorn main:app --host 0.0.0.0 --port $PORT"
   ```
4. **Generate a public domain** under **Settings → Networking** with the port set to `$PORT` (typically `8080`).

### Frontend → Vercel
1. Import the repo. Set **Root Directory** to `frontend/`.
2. Framework preset: Vite. Build command: `npm run build`. Output: `dist`.
3. Set frontend env vars in **Environment Variables**.
4. `vercel.json` (already in repo) provides the SPA fallback so deep links like `/auth` and `/dashboard` don't 404 on hard refresh:
   ```json
   {
     "routes": [
       { "handle": "filesystem" },
       { "src": "/(.*)", "dest": "/index.html" }
     ]
   }
   ```

### CORS
`backend/main.py` lists explicit allowed origins. To add a new deployment URL, append it to the `allow_origins` list and redeploy.

### Post-deploy checklist
- [ ] Update Supabase **URL Configuration** to point at the Vercel URL.
- [ ] Update the Google Cloud OAuth client redirect URI to include the Supabase callback URL.
- [ ] Verify `DEMO_EMAIL` is set on Railway (otherwise emails fail silently).
- [ ] Hard-refresh `/dashboard` and `/tracker` to confirm SPA fallback works.
- [ ] Check the chatbot in all three languages.

---

## Design System

The UI was prototyped in **Stitch** and ported to a custom Tailwind token system to feel trustworthy and institutional without being bureaucratic.

| Token | Value | Purpose |
|---|---|---|
| `--primary-container` | Deep Navy `#091426` | Headlines, primary CTAs |
| `--accent-green` | Emerald `#006c49` | Success states, "Mark Resolved" |
| `--accent-amber` | Warning Amber | Escalation banners, > 15 day warnings |
| `--accent-slate` | Slate gray | Secondary text, metadata |
| `--surface-container` | Soft tonal layer | Cards, inline forms |
| Typography | Inter (system fallback) | Throughout |

Component classes are defined in `frontend/src/index.css`: `btn-primary`, `btn-secondary`, `btn-ghost`, `card`, `card-elevated`, `chip-success`, `chip-warning`, `chip-info`, `input-field`, `text-h1`, `text-h2`, `text-body-md`, `text-label-sm`, `text-label-bold`.

---

## Roadmap

**Near-term (next sprint):**
- Push notifications via the PWA Service Worker
- Vision-capable model (Gemini Pro Vision or similar) — Groq dropped vision support
- Image annotation: let the user circle the issue in the photo before classification
- Dark mode

**Medium-term:**
- Expand beyond S-Ward to all 24 BMC wards (`bmc_ward.json` is the only thing that needs to grow)
- Civic admin dashboard (read-only) for journalists / RTI activists
- Aggregate heatmap of unresolved complaints by category and ward

**Long-term:**
- Direct API integration with the BMC grievance system (replacing email-based filing)
- Generalize beyond Mumbai to other Indian municipal corporations

---

## License

MIT.

---

## Acknowledgements

- **AIC × Anthropic Claude Hackathon (May 2026)** — built in this window
- **Groq Cloud** — for free, fast Llama 3.3 70B inference
- **Supabase**, **Resend**, **Vercel**, **Railway** — for forever-generous free tiers
- **OpenStreetMap Nominatim** — for free reverse geocoding
- The 22 million residents of Mumbai who deserve a better way to be heard
