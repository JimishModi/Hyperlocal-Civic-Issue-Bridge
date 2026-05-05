# Hyperlocal Civic Issue Bridge 🌉

A powerful, AI-driven Progressive Web App (PWA) designed to simplify civic grievance reporting for residents of Mumbai (specifically BMC S-Ward, Powai). 

The platform bridges the gap between citizens and local government by using AI to automatically classify civic issues from photos, draft formal complaints, route them to the correct department, and provide a clear, multi-stage escalation pathway if issues remain unresolved.

---

## 🚀 Features

*   **📸 Photo Evidence & Smart Classification:** Snap a photo to store securely in Supabase as evidence, and describe the issue using text or voice. Our advanced AI model instantly identifies the category, confidence score, and responsible BMC department.
*   **🎙️ Multimodal Intake:** Describe the issue using text or your voice (powered by native Web Speech API).
*   **📍 Automatic Geolocation:** Accurately pinpoints the issue using the browser's GPS API.
*   **✍️ Automated Complaint Drafting:** Generates a professional, legally-sound complaint draft pre-addressed to the specific BMC department's email.
*   **📊 Tracking & Transparency:** Users receive an 8-character reference code (e.g., `A3X7F2K9`) to track their complaint's status (`Awaiting`, `Escalated`, `Resolved`).
*   **⏳ Smart Escalation Engine:** If a complaint is ignored for more than 15 days, the app guides citizens through escalating the issue:
    1.  **Follow-up Letter:** A formal reminder.
    2.  **RTI Application:** Right to Information request for accountability.
    3.  **CPGRAMS:** Direct escalation to the Central Government grievance portal.
*   **🤖 Contextual Chatbot:** A built-in AI assistant to answer citizen questions regarding BMC procedures and civic rights.
*   **📱 PWA Ready:** Installable on mobile home screens, providing a native app-like experience with a mobile-first design.

---

## 🛠️ Tech Stack

### Frontend
*   **Framework:** React 18 + Vite
*   **Routing:** React Router v6
*   **Styling:** Tailwind CSS 3 (Custom design system with precise tokens)
*   **State Management:** React Hooks (`useState`, `useReducer`) — No Redux
*   **Native APIs:** Web Speech API, Geolocation API, Camera access

### Backend
*   **Framework:** FastAPI (Python)
*   **Database:** Supabase (PostgreSQL & Storage)
*   **AI Models:** Groq (Llama 3.3 70B)
*   **Email Delivery:** Postmark

---

## 📂 Project Structure

```text
├── backend/                  # FastAPI Application
│   ├── routes/               # API endpoints (classify, draft, file, track, escalate, chat)
│   ├── services/             # Core logic (AI integration, mailer, scheduler)
│   ├── prompts/              # System prompts for Gemini
│   ├── main.py               # FastAPI entry point & CORS config
│   └── requirements.txt      # Python dependencies
│
└── frontend/                 # React PWA
    ├── src/
    │   ├── pages/            # React Routes (Intake, Result, Draft, Tracker, Escalation)
    │   ├── components/       # Shared UI (ChatBot, VoiceInput, DraftEditor)
    │   ├── config/           # API fetch wrapper
    │   └── index.css         # Tailwind directives & global component classes
    ├── public/               # PWA Manifest & Icons
    └── tailwind.config.js    # Design system tokens
```

---

## 💻 Local Development

### Prerequisites
*   Node.js (v18+)
*   Python (3.10+)
*   API Keys: Groq, Supabase, Postmark

### 1. Backend Setup

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

Create a `.env` file in the `backend` directory (refer to `.env.example`):
```env
GROQ_API_KEY=your_key_here
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_supabase_key
POSTMARK_API_KEY=your_postmark_key
POSTMARK_FROM_EMAIL=your_verified_sender
```

Run the FastAPI server:
```bash
uvicorn main:app --reload
# Runs on http://localhost:8000
```

### 2. Frontend Setup

```bash
cd frontend
npm install
```

Create a `.env` file in the `frontend` directory:
```env
VITE_API_BASE_URL=http://localhost:8000
```

Run the Vite dev server:
```bash
npm run dev
# Runs on http://localhost:5173 (or 5174)
```

---

## 🎨 Design System

The UI was meticulously crafted in **Stitch**, utilizing a custom "Civic Bridge" design system to evoke trust and institutional reliability without feeling bureaucratic.
*   **Typography:** Inter
*   **Primary Color:** Deep Navy (`#091426`)
*   **Secondary Color:** Emerald Green (`#006c49`)
*   **Accents:** Warning Amber, Slate
*   **Elevation:** Soft, diffused tonal layering.

---

## 🤝 Contributing
Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License
This project is licensed under the MIT License.
