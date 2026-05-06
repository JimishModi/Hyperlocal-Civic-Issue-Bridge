# Future Scope — Civic Issue Bridge

A staged roadmap for evolving the platform from a hackathon MVP into a city-scale civic infrastructure. Each item is graded on **effort**, **technical feasibility**, **regulatory feasibility**, and **dependency risk** so a builder picking this up later knows exactly what they're walking into.

---

## Roadmap at a Glance

```
   ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
   │     PHASE 1      │    │     PHASE 2      │    │     PHASE 3      │    │     PHASE 4      │
   │   ✅ SHIPPED     │ ─▶ │  Security &      │ ─▶ │  Scalability &   │ ─▶ │  Advanced UX &   │
   │   (Hackathon)    │    │  Privacy         │    │  Transparency    │    │  Ecosystem       │
   └──────────────────┘    └──────────────────┘    └──────────────────┘    └──────────────────┘
        Photo +                Aadhaar OTP             24-Ward                Offline PWA
        AI classify            PII redaction           expansion              Civic reputation
        Track + escalate       Rate limiting           Heatmap                Gamification
        Multilingual           AI safety guards
```

| Phase | Theme | Effort (eng-weeks) | Blockers |
|---|---|---|---|
| **1** | MVP — already live | — | — |
| **2** | Lock down trust + privacy | 4–6 | UIDAI/Digilocker registration, legal review |
| **3** | Scale beyond Powai | 3–4 | BMC contact-data sourcing for 23 more wards |
| **4** | Delight + retention | 3–5 | None hard — pure engineering |

**Legend** for feasibility ratings used below: 🟢 ready to build · 🟡 needs partner/research · 🔴 hard external dependency

---

## Phase 2 — Security, Privacy & Integrity

> **Goal:** Stop the platform from being weaponized — by spammers, by privacy violators, or by automated abuse — *before* we open it up to a wider user base.

### 2.1 Aadhaar-based Identity Verification

**What** — Replace anonymous Google sign-in with an OTP-based Aadhaar verification gateway (via **UIDAI eKYC** or **Digilocker**). Each Aadhaar number maps to exactly one Civic Bridge account, enforcing a *"One Citizen, One Account"* policy.

**Why it matters**
- **Eliminates fake accounts** — no more burner Gmail addresses spamming ward offices
- **Trust signal for BMC** — verified citizens carry institutional weight; their complaints are harder to dismiss
- **Foundational for Phase 4** — civic reputation only works if accounts are real
- **Audit trail** — useful for RTI and CPGRAMS escalations where identity is statutorily required

**Architecture**

```
   ┌─────────────┐    1. Enter         ┌──────────────────┐
   │   Citizen   │ ──Aadhaar #──────▶  │  Civic Bridge    │
   └─────────────┘                     │   Backend        │
         ▲                             └────────┬─────────┘
         │                                      │ 2. eKYC API
         │ 4. JWT session                       ▼
         │                             ┌──────────────────┐
         │                             │  UIDAI / Digi-   │
         │                             │  locker Gateway  │
         │                             └────────┬─────────┘
         │                                      │ 3. OTP to
         └───────────── 6-digit OTP ───────────-┘   registered mobile
```

**Implementation sketch**
- Frontend: Aadhaar input field + OTP entry on a new `/verify` step after first login
- Backend: new `routes/auth.py` proxying to UIDAI / Digilocker; on success, store hashed Aadhaar (last 4 digits visible only) + verified mobile in `citizens` table
- Hard rule: **never log or expose the full Aadhaar number** — only the masked version + a salted hash for uniqueness lookup

**Feasibility**

| Dimension | Rating | Notes |
|---|---|---|
| Technical | 🟢 | Both Digilocker and UIDAI have documented REST APIs |
| Regulatory | 🔴 | Requires registration as an **AUA (Authentication User Agency)** with UIDAI — paperwork, security audit, ~3–6 months. Digilocker is faster (no AUA needed) but has rate caps |
| Cost | 🟡 | UIDAI charges ~₹0.20–₹0.50 per eKYC transaction at scale; Digilocker is free up to a quota |
| Effort | 🟡 | 2–3 eng-weeks excluding regulatory time |

**Tradeoffs**
- **Friction:** Aadhaar mandates exclude non-Indian residents and migrant workers without enrolled mobile numbers. Mitigation: keep Google sign-in as a "limited mode" tier (can file but not vote on heatmap, no civic score).
- **Privacy concern:** storing Aadhaar links is a high-value target. Mitigation: never store the raw number; hash + last-4 only.
- **Recommendation:** start with **Digilocker** — same identity guarantee, no AUA registration burden.

---

### 2.2 Automated PII Redaction in Photos

**What** — Before an uploaded photo is stored in Supabase Storage or attached to a BMC email, run it through a vision pipeline that detects and **blurs**:
- Bystander faces
- Vehicle license plates
- House numbers, name plates, doorbells with names
- Visible text on personal documents

**Why it matters**
- **Ethical compliance** — citizens shouldn't be unwillingly photographed when the user just wants to report a pothole
- **GDPR-equivalent posture** — DPDP Act 2023 requires "purpose limitation" for personal data; redaction is the cleanest path
- **Reduces legal exposure** — complaint emails routinely include incidental third parties; this is a liability today

**Architecture**

```
   ┌─────────────────────────────────────────────────────────┐
   │           POST /classify (multipart with image)         │
   └─────────────────────┬───────────────────────────────────┘
                         │
                         ▼
   ┌─────────────────────────────────────────────────────────┐
   │   PII Redaction Pipeline                                │
   │                                                         │
   │   ┌──────────────┐   ┌──────────────┐   ┌────────────┐  │
   │   │ Face Detector│   │ Plate Detect │   │ OCR + NER  │  │
   │   │ (RetinaFace) │   │ (YOLOv8)     │   │ (Tesseract │  │
   │   │              │   │              │   │ + Presidio)│  │
   │   └──────┬───────┘   └──────┬───────┘   └─────┬──────┘  │
   │          │                  │                 │         │
   │          └──────────┬───────┴─────────────────┘         │
   │                     ▼                                   │
   │            ┌─────────────────┐                          │
   │            │ Composite blur  │                          │
   │            │ (Gaussian, σ=15)│                          │
   │            └────────┬────────┘                          │
   └─────────────────────┼───────────────────────────────────┘
                         ▼
                 Cleaned image → storage + classification
```

**Implementation sketch**
- Add a new `services/redact.py` module
- Use one of:
  - **Microsoft Presidio Image Redactor** (open source, runs locally) — best privacy posture
  - **AWS Rekognition** (`DetectFaces` + custom labels) — easier, paid per call
  - **Google Cloud Vision** — strong OCR + face landmarks, paid
- Run redaction *before* the Supabase upload in `routes/classify.py`
- Optional: keep the original on a private bucket with restricted access for legal disputes (with a 30-day TTL)

**Feasibility**

| Dimension | Rating | Notes |
|---|---|---|
| Technical | 🟢 | Off-the-shelf models exist for all three detection categories |
| Cost | 🟡 | Self-hosted CPU inference is free but adds ~2–4s latency per photo. Cloud APIs cost ~₹0.10–₹0.50/image |
| Quality risk | 🟡 | False negatives (missed plates) are worse than false positives (over-blurred photos). Tune for over-blur |
| Effort | 🟡 | 1.5–2 eng-weeks including model evaluation |

**Tradeoffs**
- **Latency vs. UX:** running 3 models sequentially can take 4+ seconds. Mitigation: kick off redaction asynchronously, return classification immediately, swap the photo URL on the email send (≤30s window).
- **Over-redaction:** an over-zealous detector could blur the actual pothole if it has reflective text. Mitigation: keep redaction confined to faces and plates initially; OCR-based redaction can be a flag-gated v2.

---

### 2.3 Intelligent Rate Limiting & Throttling

**What** — Per-IP and per-user request limits on every API endpoint, with stricter quotas on expensive routes (`/classify`, `/draft`, `/escalate` — all of which call the LLM).

**Why it matters**
- **DoS protection** — a single bot looping `/classify` could exhaust the Groq free-tier budget in minutes
- **Spam prevention** — combined with Aadhaar verification, this caps "rapid-fire complaint submission" attacks
- **Cost control** — predictable monthly bills

**Implementation sketch**
- Add **`slowapi`** (FastAPI-compatible wrapper around `limits`)
- Use Redis as the distributed counter store (Railway has a one-click Redis addon)
- Suggested quotas:

| Route | Per IP | Per Verified User |
|---|---|---|
| `/validate`, `/classify` | 20 / hour | 30 / day |
| `/draft`, `/escalate` | 10 / hour | 15 / day |
| `/file` | 5 / hour | 10 / day |
| `/track/*` | 60 / hour | unlimited |
| `/chat` | 30 / hour | 100 / day |

- Return `429 Too Many Requests` with `Retry-After` header
- Frontend: show a friendly toast when 429 hits

**Feasibility**

| Dimension | Rating | Notes |
|---|---|---|
| Technical | 🟢 | `slowapi` is a 30-line integration; Redis add-on is one click on Railway |
| Cost | 🟢 | Redis on Railway free tier handles ~50 req/sec |
| Effort | 🟢 | < 1 eng-week |

**Tradeoffs**
- **Multi-user IPs (cybercafés, college Wi-Fi):** per-IP limits will misfire. Mitigation: per-user limits dominate once Aadhaar verification is in place.
- **Recommendation:** ship this **first** in Phase 2 — it's the lowest-risk, highest-impact item.

---

## Phase 3 — Scalability & Community Transparency

> **Goal:** Move from "Powai prototype" to "Mumbai-wide platform" without any handcoded routing.

### 3.1 Hyperlocal Community Heatmap

**What** — Interactive map (Mapbox GL JS or Leaflet + OpenStreetMap) that clusters active and resolved complaints geographically. Residents can:
- See "what's broken in my neighborhood" before they file (reducing duplicates organically)
- Filter by category, status, or last-N-days
- Validate their concerns by seeing neighbors reporting the same thing
- Track resolution velocity per locality

**Why it matters**
- **Reduces duplicates** at the user level, not just the duplicate-detection level
- **Social proof** — "12 of my neighbors flagged this same drain" makes BMC harder to ignore
- **Public accountability** — heatmap turns the silent complaint queue into visible civic data
- **Press / RTI activist value** — journalists and civic-tech volunteers will surface stories

**Architecture**

```
   ┌─────────────────────┐         ┌──────────────────────────┐
   │     Frontend        │         │   New endpoint           │
   │  /heatmap page      │ ──────▶ │   GET /heatmap?bbox=...  │
   │  (Mapbox/Leaflet)   │         │   &status=&category=     │
   └─────────────────────┘         └──────────┬───────────────┘
                                              │
                                              ▼
                                   ┌──────────────────────────┐
                                   │   Postgres + PostGIS     │
                                   │   ST_ClusterDBSCAN()     │
                                   │   on grievances.location │
                                   └──────────────────────────┘
```

**Implementation sketch**
- Enable PostGIS extension on Supabase (one SQL command)
- Backfill `grievances.location` as a `geography(Point)` from existing `latitude`/`longitude`
- New endpoint `GET /heatmap` returns clustered GeoJSON for the requested bounding box
- Frontend: `/heatmap` page with:
  - Mapbox GL JS (free up to 50k loads/month) OR Leaflet + OSM (fully free)
  - Cluster markers with category-coded colors (red = unresolved, green = resolved, amber = escalated)
  - Click → drill into individual complaint cards (anonymized — no user emails)

**Privacy**
- Round coordinates to 4 decimal places (~10 m grid) to prevent identifying individual homes
- Never expose `user_email`
- Aggregation only: show counts and density, not raw points, when zoom level is < 16

**Feasibility**

| Dimension | Rating | Notes |
|---|---|---|
| Technical | 🟢 | PostGIS is a mature standard; Mapbox/Leaflet are well-documented |
| Cost | 🟢 | Mapbox free tier (50k tile loads/month) covers thousands of users; OSM is free forever |
| Privacy risk | 🟡 | Need careful coordinate rounding + aggregation to avoid de-anonymization |
| Effort | 🟡 | 1.5–2 eng-weeks |

---

### 3.2 City-Wide Ward Expansion (Dynamic Routing)

**What** — Generalize the static `bmc_ward.json` (currently S-Ward only) into a dynamic system that maps **any Mumbai GPS coordinate** to the correct ward + correct sub-department + correct contact info, across all **24 BMC wards**.

**Why it matters**
- Today's app only works for Powai. A user in Bandra reporting a pothole gets routed to S-Ward Roads Dept — wrong inbox, complaint dies.
- Generalization is the difference between "demo" and "deployable in Mumbai".

**Architecture**

```
   Current:                          Future:
   ─────────                         ───────
   {category}                        {lat, lon, category}
       │                                    │
       ▼                                    ▼
   bmc_ward.json                    ┌────────────────────┐
   (S-Ward only)                    │  Spatial query     │
       │                            │  ST_Within(pt,     │
       ▼                            │   ward_polygons)   │
   department + email               └─────────┬──────────┘
                                              │
                                              ▼
                                    ┌────────────────────┐
                                    │ wards table        │
                                    │ (24 rows)          │
                                    └─────────┬──────────┘
                                              │ join on
                                              ▼
                                    ┌────────────────────┐
                                    │ ward_departments   │
                                    │ (24 × ~10 rows)    │
                                    └─────────┬──────────┘
                                              │
                                              ▼
                                       department + email
```

**Implementation sketch**

**Database (PostGIS):**
```sql
CREATE TABLE wards (
  code text PRIMARY KEY,           -- 'A', 'B', 'C', ..., 'S', 'T'
  name text,                       -- 'A-Ward (Colaba)'
  geometry geography(Polygon)      -- official ward boundaries
);

CREATE TABLE ward_departments (
  ward_code text REFERENCES wards,
  category text,                   -- 'Road & Footpath', etc.
  dept_name text,
  dept_email text,
  portal_url text,
  PRIMARY KEY (ward_code, category)
);
```

**Data sourcing — the hard part:**
- BMC ward boundaries are available from OpenStreetMap (search relation: `Mumbai admin_level=9`)
- Department contact info per ward must be **scraped from each ward's MCGM page** (`mcgm.gov.in/portal/jsp/.../wardDetails.jsp?wardName=...`) or **submitted via RTI** to BMC's grievance cell
- This is the dependency-risk item — the data is not in one clean place

**Backend change:**
- `utils/dept.py` becomes `get_dept_info(category, lat, lon)` — first looks up the ward via spatial query, then the department within that ward
- Falls back to a "Mumbai-wide" generic complaint inbox if no specific ward match (boundary cases, harbor, etc.)

**Feasibility**

| Dimension | Rating | Notes |
|---|---|---|
| Technical | 🟢 | PostGIS + spatial join is bread-and-butter GIS work |
| Data sourcing | 🔴 | The 24 wards × ~10 departments = 240 contact records is the actual blocker. Could take weeks to verify, and the data goes stale |
| Effort | 🟡 | 1 eng-week for code, 2–3 weeks for data verification |
| Partner-friendly | 🟢 | This is exactly the kind of work a civic-tech volunteer chapter (e.g., Praja, Civic Data Lab) could partner on |

**Tradeoffs**
- **Data freshness:** BMC reorganizes departments ~yearly. Mitigation: build a self-service "Report wrong contact info" flow on the heatmap page; community-curate the routing table.
- **Recommendation:** **partner-driven, not solo-driven.** Approach Praja Foundation or Datameet Mumbai for the data-collection sprint.

---

## Phase 4 — Advanced UX & Ecosystem Integration

> **Goal:** Turn one-time reporters into repeat civic participants.

### 4.1 Offline Mode (PWA Maturation)

**What** — Service-worker–powered offline mode. Users in low-connectivity areas (basements, remote streets, monsoon outages) can:
- Capture photos
- Dictate descriptions via Web Speech (degrades to text-only when offline)
- Save GPS coordinates
- Draft complaints

…and the app **automatically syncs and submits** when the connection returns.

**Why it matters**
- Mumbai monsoons + spotty connectivity is the *exact moment* civic issues spike — broken drains, fallen trees, flooded roads. The app has to work offline to be useful then.
- Removes a class of user complaints ("I tried to report when it happened and the app didn't work").

**Architecture**

```
   ┌────────────────────────┐
   │   User (offline)       │
   │                        │
   │  1. Snap photo         │
   │  2. Describe issue     │
   │  3. Submit             │ ──┐
   └────────────────────────┘   │
                                │
                                ▼
   ┌────────────────────────────────────────────────┐
   │         Service Worker (in browser)            │
   │                                                │
   │   ┌─────────────┐    ┌──────────────────────┐  │
   │   │  IndexedDB  │ ◀──│ Pending submissions  │  │
   │   │  (photos +  │    │  queue               │  │
   │   │   metadata) │    │                      │  │
   │   └──────┬──────┘    └──────────┬───────────┘  │
   │          │                      │              │
   └──────────┼──────────────────────┼──────────────┘
              │                      │
              │  navigator.onLine?   │
              │      true            │
              ▼                      ▼
              POST /classify, /file (one at a time, with retries)
```

**Implementation sketch**
- Use **Workbox** (Google's service-worker toolkit) for caching strategies:
  - App shell: cache-first
  - API calls: network-first with IndexedDB fallback queue
- Add a "Pending submissions" UI strip showing items waiting to sync
- On reconnect: drain the queue with exponential backoff, surface success/failure toasts
- Background sync API where supported (Chrome on Android); polling fallback elsewhere

**Feasibility**

| Dimension | Rating | Notes |
|---|---|---|
| Technical | 🟢 | Workbox handles 90% of the complexity; PWA APIs are stable |
| iOS limitation | 🟡 | iOS Safari has historically capped IndexedDB and limited service worker capabilities. Test thoroughly |
| Effort | 🟡 | 2 eng-weeks including QA across devices |

---

### 4.2 Civic Reputation System (Gamification)

**What** — Citizens earn **Civic Score** points for reporting issues that get resolved. Points unlock badges and trusted-reporter status.

**Score model (illustrative):**

| Action | Points |
|---|---|
| File a valid complaint | +5 |
| Complaint marked resolved by BMC | +20 |
| Complaint resolved + photo evidence | +30 |
| Successful escalation (RTI / CPGRAMS) | +50 |
| Logged update on someone else's heatmap-listed complaint | +10 |
| Filed duplicate (dismissed) | −5 |
| Marked as spam by moderator | −50 |

**Badge tiers:**

| Tier | Threshold | Privileges |
|---|---|---|
| 🥉 Civic Spotter | 50 pts | Profile badge |
| 🥈 Civic Advocate | 250 pts | Higher rate-limit ceiling, priority email queue |
| 🥇 Civic Champion | 1000 pts | "Trusted Reporter" tag visible to BMC; complaints flagged for faster routing |
| 🏛️ Civic Steward | 5000 pts | Heatmap moderation rights, early access to new features |

**Why it matters**
- **Retention:** civic apps die because filing is one-and-done. Score+badge gives a reason to come back.
- **Quality signal for BMC:** a complaint from a verified Civic Champion carries more institutional credibility than a brand-new account's first post.
- **Self-policing community:** trusted reporters can flag spam, reducing manual moderation load.

**Implementation sketch**
- New `civic_scores` table (or denormalized column on `citizens`)
- Event-driven point increments triggered by `tracker.py` resolve hooks and `escalate.py` filings
- Frontend: profile page on `/dashboard` showing score, badges, and rank percentile

**Feasibility**

| Dimension | Rating | Notes |
|---|---|---|
| Technical | 🟢 | Pure CRUD with event hooks — straightforward |
| Gaming risk | 🟡 | Users could file spam to farm points. Mitigation: only resolved-by-BMC complaints earn major points; require Aadhaar verification (Phase 2.1) before scoring |
| Effort | 🟢 | < 1 eng-week for v1 |

**Tradeoffs**
- **Perverse incentives:** rewarding "complaints filed" over "complaints resolved" would flood the system. The model above weights resolution heavily — keep it that way.
- **Equity:** wealthy / well-connected residents may resolve issues faster (because they file in English, have BMC contacts, etc.). Score gaps could ossify civic inequality. Mitigation: per-ward leaderboards instead of global; visible "first-timer" bonuses.

---

## Cross-Cutting Recommendations

### Suggested Build Order (12 eng-weeks total)

```
   Week 1-2    │  ▓▓▓▓ Rate limiting (2.3) — easiest win
   Week 3-4    │  ▓▓▓▓ Heatmap (3.1)       — biggest user-facing impact
   Week 5-7    │  ▓▓▓▓▓▓ Aadhaar/Digilocker (2.1)
   Week 8-9    │  ▓▓▓▓ PII redaction (2.2)
   Week 10-12  │  ▓▓▓▓▓▓ 24-ward expansion (3.2) — partner-led
   Parallel    │  ░░░░ Offline mode (4.1) + Reputation (4.2) as time allows
```

### Risk Register

| Risk | Mitigation |
|---|---|
| UIDAI AUA paperwork stalls Phase 2.1 | Start with Digilocker (no AUA needed); upgrade to UIDAI later |
| BMC department contact data goes stale | Community-curated correction flow + quarterly RTI verification |
| PII redaction over-blurs the actual issue | Confidence threshold per detector; user can opt-out per upload |
| Score system gets gamed | Tie major points to BMC-confirmed resolution + Aadhaar gate |
| Mapbox costs spike | Switch to Leaflet + OpenStreetMap tiles (free, no quota) |

---

## Out of Scope (For Now)

- **Direct API integration with BMC** — no public API exists. Email is the only reliable channel.
- **SMS-based filing** — interesting accessibility play, but cost prohibitive at scale.
- **Multi-language complaint drafts to BMC** — BMC processes English. Internal UI multilingual support is enough.
- **AI-driven priority scoring of complaints** — too political; reserve for civic-tech academia, not the platform itself.

---

## How to Contribute

Pick any item rated 🟢 in the feasibility table, open a GitHub issue with the heading `[Phase X.Y] <name>`, and tag it `roadmap`. Items rated 🟡 or 🔴 are partner-led — reach out via the README contact before starting work.

> **Civic Issue Bridge is built on the bet that civic accountability gets cheaper, faster, and fairer when the right citizen finds the right inbox at the right time. Everything in this roadmap exists to widen that bet.**
