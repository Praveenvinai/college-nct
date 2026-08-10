# Smart Campus Backend — Complete Mini Technical Report

**Coverage:** Phase 1 → Phase 5.6B  
**Scope:** Backend repository only (`Smart_campus_Backend`)  
**Generated from:** Actual codebase inspection (not assumptions)  
**Date context:** August 2026 development journey

---

# 23. ONE-PAGE EXECUTIVE SUMMARY

## Project
**Smart Campus Backend** is a Flask REST API that acts as the cloud “brain” for a college expo **Smart Campus IoT Mini Model**. It receives events from gate/face clients, RFID clients, a smart store, and an AI Teacher UI, then reads/writes **Firebase Realtime Database** (text/JSON only).

## Goal
Prove a lean, free-tier demo: live attendance logging, gate access logging, store inventory dispense, and AI Q&A over uploaded class notes — **without Firebase Storage** (no image/PDF binaries in the cloud).

## Tech stack (backend, as implemented)
| Layer | Technology |
|---|---|
| API framework | Flask 3.x + flask-cors |
| Process entry | `app.py` (dev), Gunicorn via `Procfile` (deploy) |
| Database | Firebase Realtime Database via `firebase-admin` |
| Config | `python-dotenv` + `backend/.env` |
| PDF extraction | `pdfplumber` (`PyPDF2` is installed but not used in app code) |
| AI Teacher LLM | **Groq** Chat Completions (`llama-3.1-8b-instant`) via `requests` — implemented in file `gemini_client.py` |
| Secrets | `.env`, `firebase-service-account.json` (gitignored) |

## Architecture (actual)
```text
Clients (laptop face script / ESP32 / NodeMCU / dashboard)
        ↓ HTTP JSON or multipart
Flask app.py  (+ CORS)
        ↓ Blueprints
routes/  →  services/  →  firebase_config / pdf_extractor / gemini_client
        ↓
Firebase RTDB          Groq API
```

## Major modules
Health, Face attendance logging, RFID gate logging, Store dispense, Classroom PDF upload + Ask (Groq).

## AI integration
Upload PDF → extract text → store in `classroom_notes` → Ask reads notes → Groq answers grounded in notes.

## Firebase
Text-only nodes: `students`, `attendance_log`, `gate_log`, `store_inventory`, `store_sales_log`, `classroom_notes`.

## Testing
Manual/API tests across phases; late regressions confirmed health/face/RFID/store/upload/ask.

## Current status
**Backend Phase 5.6B complete** for cloud APIs. Hardware face matching, ESP32 firmware, dashboard UI, browser TTS, and production auth are **outside this repo / Planned**. Original PRD mentioned Gemini; **implemented LLM is Groq**.

---

# 1. PROJECT OVERVIEW

## What Smart Campus Backend is
A Python Flask service that centralizes Smart Campus demo cloud operations: validate inputs, talk to Firebase, extract PDF text, and call Groq for classroom Q&A.

## What problem it solves
Different physical/software units need one shared cloud API so attendance, gate events, inventory, and notes stay synchronized for a live expo demo — without storing photos/PDFs in paid Firebase Storage.

## Who uses it
| User / Client | How they use the backend |
|---|---|
| Laptop face script | `POST /api/face/recognize` with match result (no images) |
| ESP32 RFID gate | `POST /api/rfid/scan` with card UID |
| NodeMCU store | `POST /api/store/dispense` with item slot |
| Dashboard / AI Teacher UI | Upload PDF + ask questions |
| Operators | `GET /api/health` connectivity check |

## Main backend responsibilities
1. Accept HTTP API requests  
2. Validate JSON / multipart input  
3. Read/write Firebase RTDB  
4. Extract PDF text and discard temp files  
5. Call Groq and return answers  
6. Return clear JSON status codes  

## Main technologies used
Flask, flask-cors, firebase-admin, python-dotenv, pdfplumber, requests, gunicorn, Groq REST API.

## Overall architecture (actual implementation)

```text
┌─────────────────────────────────────────────────────────────┐
│ Clients                                                     │
│  Face script │ ESP32 RFID │ Store NodeMCU │ Dashboard/UI    │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTP
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ Smart Campus Backend (Flask)                                │
│  /api/health                                                │
│  /api/face/recognize                                        │
│  /api/rfid/scan                                             │
│  /api/store/dispense                                        │
│  /api/classroom/upload                                      │
│  /api/classroom/ask                                         │
│                                                             │
│  routes → services → firebase_config / pdf_extractor /      │
│                      gemini_client (Groq)                   │
└───────────────┬─────────────────────────────┬───────────────┘
                ▼                             ▼
     Firebase Realtime DB              Groq (Llama 3.1 8B)
     (text/JSON only)                  Chat Completions
```

**Not in this backend repo (Planned / external):** webcam face recognition ML, ESP32/Arduino firmware, servo/GPIO, Vercel dashboard, browser Web Speech API, Firebase Auth, Gemini API (docs planned Gemini; code uses Groq).

---

# 2. PHASE-BY-PHASE DEVELOPMENT

| Phase | Purpose | What was implemented | Important files | Final status |
| ----- | ------- | -------------------- | --------------- | ------------ |
| 1 | Workspace scaffold | Folders, stubs, `.gitignore`, `requirements` placeholders, `Procfile` | Root docs, `backend/*` stubs | Complete |
| 2 | Firebase project setup | RTDB + service account JSON placed by developer (outside code changes in this chat) | `firebase-service-account.json`, Firebase console | Complete |
| 3 | Python venv + deps | `.venv`, install packages, `pip freeze` → `requirements.txt` | `backend/.venv`, `requirements.txt` | Complete |
| 4 | Env configuration | `.env` with DB URL / keys / PORT | `backend/.env` | Complete |
| 5 | Feature APIs (umbrella) | Split into 5.1–5.6B | See below | Complete through 5.6B |
| 5.1 | Firebase connection | Admin SDK init + helpers + read test | `firebase_config.py`, `test_firebase_connection.py` | Complete |
| 5.2 | Health API | `GET /api/health` | `app.py` | Complete |
| 5.3 | Face logging API | Validate + log attendance | `routes/face.py`, `attendance_service.py` | Complete |
| 5.4 | RFID gate API | Lookup by `rfid_uid` + `gate_log` | `routes/rfid.py`, `attendance_service.py` | Complete |
| 5.5 | Store dispense API | Stock−1 + sales log | `routes/store.py`, `inventory_service.py` | Complete |
| 5.6 | Classroom (umbrella) | Split into 5.6A + 5.6B | classroom modules | Complete |
| 5.6A | PDF upload | Extract text → Firebase, delete temp PDF | `pdf_extractor.py`, classroom service/route | Complete |
| 5.6B | Ask API (Groq) | Read notes → Groq → answer | `gemini_client.py`, classroom service/route | Complete |

---

## Phase 1 — Backend Workspace Setup

### Goal
Create a clean production-style folder layout before writing business logic.

### Why needed
Avoid messy “all code in one file” structure; separate routes, services, config.

### Implemented
- Project folders: `backend/`, `backend/routes/`, `backend/services/`, `docs/`
- Stub modules and config placeholders
- `.gitignore` protecting secrets, venv, uploads, tmp, images/PDFs

### Code changes
Created stubs such as `app.py`, `firebase_config.py`, `gemini_client.py`, `pdf_extractor.py`, route/service stubs, `Procfile`, `requirements.txt`, `.env`.

### How it works
Empty/stub Python files with docstrings only — no runtime APIs yet.

### Why this way
Matches Flask blueprint + service-layer pattern used later.

### Testing
Structure verified with `tree /f`.

---

## Phase 2 — Firebase Realtime Database Setup

### Goal
Create Firebase RTDB and place service account credentials for Admin SDK.

### Why needed
Backend needs a free text database and a credential file for server-side access.

### Implemented (project setup)
- Firebase RTDB URL configured later as `FIREBASE_DB_URL`
- Root nodes prepared (from project context): `students`, `attendance_log`, `gate_log`, `store_inventory`, `store_sales_log`, `classroom_notes`
- File present: `backend/firebase-service-account.json` (gitignored; contents not documented here)

### Code changes
Mostly configuration/assets, not application logic.

### Testing
Verified later in Phase 5.1 by reading real paths.

---

## Phase 3 — Python Environment

### Goal
Isolated venv with required packages.

### Implemented
- `python -m venv .venv`
- Installed: flask, flask-cors, firebase-admin, python-dotenv, gunicorn, requests, PyPDF2, pdfplumber
- `requirements.txt` frozen from venv

### Testing
Package imports succeeded in `.venv`.

---

## Phase 4 — Environment Configuration

### Goal
Centralize secrets/config in `.env` (not hardcoded in Python).

### Implemented (current `.env` keys, values redacted)
```text
FIREBASE_DB_URL=********
GROQ_API_KEY=********
FLASK_ENV=********
PORT=********
```

### Change note
Early Phase 4 used `FIREBASE_DB_URL` and placeholder Gemini key naming in planning. Final AI key in use is **`GROQ_API_KEY`** (Gemini key not used by current code).

### Testing
Env loaded via `python-dotenv` in `firebase_config.py` / `gemini_client.py`.

---

## Phase 5 — Feature Implementation (umbrella)

Phase 5 was delivered as incremental API phases 5.1–5.6B rather than one giant dump.

---

## Phase 5.1 — Firebase Connection

### Goal
Connect Admin SDK safely and prove real RTDB reads.

### Implemented
- `firebase_config.py`: load `.env`, Certificate from `firebase-service-account.json`, single init, `get_db()` / `get_ref(path)`
- `test_firebase_connection.py`: read-only test of `students/22AIDS001` and `store_inventory/slot_1`

### How it works
On import, initialize Firebase once (`if not firebase_admin._apps`). Helpers return RTDB references.

### Testing
Successful reads returned student department/name/rfid and store Gel Pen inventory.

---

## Phase 5.2 — Health Check API

### Goal
Expose a simple liveness/connectivity endpoint.

### Implemented
`GET /api/health` in `app.py` reads `students/22AIDS001`.

### Testing
HTTP 200 → `{"status":"ok","firebase":"connected"}`.

---

## Phase 5.3 — Face Recognition Logging API

### Goal
Accept a face-match **result** and log attendance. **Does not perform face recognition.**

### Implemented
- Route: `POST /api/face/recognize` (`routes/face.py`)
- Service: `get_student`, `log_face_attendance` (`attendance_service.py`)
- Writes push to `attendance_log` with `source: "face_recognition"`

### Flow
Validate `student_id` + `confidence` (0–1) → read `students/<id>` → push log → 201.

### Testing
Valid student → 201; bad confidence → 400; unknown student → 404.

### Planned / Not Implemented (backend)
Actual webcam matching, local photo encoding, cooldown window (PRD FR4).

---

## Phase 5.4 — RFID Gate API

### Goal
Simulate RFID scan: map card UID → student → gate log → “open_gate” action JSON.

### Implemented
- Route: `POST /api/rfid/scan`
- Service: `find_student_by_rfid`, `log_rfid_gate_access`
- Writes `gate_log` with `gate_status: "granted"`, `source: "rfid_gate"`

### Testing
`A1B2C3D4` → 200 granted; invalid UID → 404 denied; missing field → 400.

### Planned / Not Implemented (backend)
ESP32 firmware, servo, LCD, GPIO.

---

## Phase 5.5 — Smart Store Dispense API

### Goal
Dispense one inventory unit safely (no negative stock).

### Implemented
- Route: `POST /api/store/dispense`
- Service: `dispense_item`
- Updates only `store_inventory/<slot>/stock`
- Pushes `store_sales_log` with `source: "smart_store"`

### Testing
Valid dispense 200; unknown slot 404; missing slot 400; stock≤0 → 409 without sales write.

---

## Phase 5.6A — Classroom PDF Upload API

### Goal
Upload PDF, extract text, store text+metadata in Firebase, delete temp PDF.

### Implemented
- `pdf_extractor.extract_pdf_text` (pdfplumber)
- `save_classroom_notes`
- `POST /api/classroom/upload` (multipart: `file`, `notes_id`)
- Temp path under `backend/tmp/`, always deleted in `finally`

### Testing
201 with page_count/text_length; Firebase notes created; tmp cleaned; validation 400s; regressions OK.

---

## Phase 5.6B — Classroom Ask API (Groq)

### Goal
Answer student questions using stored notes via Groq.

### Implemented
- `ask_groq` in `gemini_client.py` (filename retained; implementation is Groq)
- `ask_notes_question` in classroom service
- `POST /api/classroom/ask`

### Change from original docs
PRD/architecture describe **Gemini**. Implementation uses **Groq** `llama-3.1-8b-instant` and `GROQ_API_KEY`.

### Testing
Valid ask 200; missing fields 400; unknown notes 404; empty key → RuntimeError; regressions OK.  
Known issue: stale Flask process once returned HTML 404 for `/ask` until server restart (see §19).

---

# 3. COMPLETE BACKEND ARCHITECTURE

```text
Client / Frontend / Device
       ↓
HTTP Request (JSON or multipart)
       ↓
Flask Application (app.py)
       ↓
Routes / Blueprints (routes/*)
       ↓
Services / Business Logic (services/*)
       ↓
┌────────────────┬────────────────┬────────────────┐
↓                ↓                ↓
Firebase RTDB    Groq API         Local tmp PDF
(get_ref)        (ask_groq)       (upload only)
```

### Responsibility matrix

| Component | Responsibility |
|---|---|
| `app.py` | Create Flask app, enable CORS, register blueprints, health route, run server |
| `routes/*` | HTTP validation, status codes, thin controllers |
| `services/*` | Business rules + Firebase writes/reads |
| `firebase_config.py` | Admin SDK init + `get_ref` |
| `pdf_extractor.py` | PDF → text |
| `gemini_client.py` | Groq LLM calls |
| `.env` | Secrets/config |
| `firebase-service-account.json` | Firebase credentials |
| `Procfile` | Render/Gunicorn entry: `web: gunicorn app:app` |
| `test_firebase_connection.py` | Temporary Phase 5.1 read test |

**Authentication / authorization modules:** Not implemented in this backend.

**ML face models in backend:** Not present (logging API only).

---

# 4. COMPLETE API INVENTORY

All implemented HTTP endpoints found in code:

| Method | Endpoint | Purpose | Request | Response (success) | Status codes |
| ------ | -------- | ------- | ------- | ------------------ | ------------ |
| GET | `/api/health` | Firebase connectivity check | none | `{status, firebase}` | 200, 500 |
| POST | `/api/face/recognize` | Log face attendance result | JSON `{student_id, confidence}` | success + student fields | 201, 400, 404, 500 |
| POST | `/api/rfid/scan` | RFID gate access decision/log | JSON `{card_uid}` | `{status:granted, action:open_gate, ...}` | 200, 400, 404, 500 |
| POST | `/api/store/dispense` | Dispense one inventory item | JSON `{item_slot}` | success + remaining_stock | 200, 400, 404, 409, 500 |
| POST | `/api/classroom/upload` | Upload PDF notes | multipart `file`, `notes_id` | success + page_count/text_length | 201, 400, 500 |
| POST | `/api/classroom/ask` | Ask AI over notes | JSON `{question, notes_id}` | `{status, answer, source, model}` | 200, 400, 404, 500 |

No login/register/auth routes found.

---

# 5. END-TO-END REQUEST FLOW

```text
User / Device
 ↓
HTTP Request to Flask (port from PORT, default 5000)
 ↓
Flask matches route (blueprint prefix + path)
 ↓
Route validates input (JSON/multipart)
 ↓
Service function runs business logic
 ↓
Firebase and/or Groq and/or pdfplumber
 ↓
Route builds jsonify(...) + HTTP status
 ↓
Client receives JSON
```

Simple terms:
1. Client calls a URL with data.  
2. Flask finds the right function.  
3. Function checks data is valid.  
4. Service talks to Firebase/AI.  
5. Result comes back as JSON.

---

# 6. MODULE-BY-MODULE LOGIC

## 6.1 Health (`app.py`)

### Purpose
Quick check that Firebase is reachable.

### Input
None.

### Processing
`get_ref("students/22AIDS001").get()`

### External dependency
Firebase RTDB.

### Output
200 connected / 500 disconnected with message.

### Important functions
`health()`

---

## 6.2 Face attendance logging

### Purpose
Record that a student was recognized (by an external laptop script).

### Input
`student_id` (string), `confidence` (0–1 number).

### Processing
Validate → `get_student` → push `attendance_log`.

### External dependency
Firebase.

### Output
201 success JSON.

### Error handling
400 validation, 404 student missing, 500 unexpected.

### Important functions
`recognize()`, `log_face_attendance()`, `get_student()`

### Example
`{"student_id":"22AIDS001","confidence":0.95}` → logs Praveen attendance.

---

## 6.3 RFID gate

### Purpose
Decide if a card is valid and log gate grant.

### Input
`card_uid`.

### Processing
Scan `students` for matching `rfid_uid` → push `gate_log` → return `action: open_gate`.

### External dependency
Firebase.

### Output
200 granted / 404 denied.

### Important functions
`scan()`, `find_student_by_rfid()`, `log_rfid_gate_access()`

### Note
Backend returns JSON action only; it does **not** drive hardware.

---

## 6.4 Store / inventory

### Purpose
Dispense one item and keep stock consistent.

### Input
`item_slot` (e.g. `slot_1`).

### Processing
Read inventory → reject if stock ≤ 0 → set stock−1 → push sale.

### External dependency
Firebase.

### Output
200 with `remaining_stock`.

### Error handling
404 item missing, 409 out of stock, 400 bad input.

### Important functions
`dispense()`, `dispense_item()`

---

## 6.5 Classroom file upload

### Purpose
Turn PDF into text notes in Firebase; never keep PDF.

### Input
multipart `file` (.pdf) + `notes_id`.

### Processing
Save temp → extract pages with pdfplumber → set `classroom_notes/<notes_id>` → delete temp in `finally`.

### External dependency
Firebase + local filesystem `tmp/`.

### Output
201 with page_count and text_length.

### Important functions
`upload()`, `save_classroom_notes()`, `extract_pdf_text()`

---

## 6.6 AI question answering

### Purpose
Answer from uploaded notes via Groq.

### Input
`question`, `notes_id`.

### Processing
Read notes → build system/user prompts → Groq chat completions → return answer.

### External dependency
Firebase + Groq API.

### Output
200 with `answer`, `source`, `model`.

### Important functions
`ask()`, `ask_notes_question()`, `ask_groq()`

---

## 6.7 Firebase access layer

### Purpose
One shared Admin SDK connection.

### Important functions
`_initialize_firebase()`, `get_db()`, `get_ref(path)`

### Error handling
Missing URL / missing service-account file raise clear exceptions at init.

---

## 6.8 Authentication module
**Planned / Not Implemented** in this repository.

---

# 7. FIREBASE ARCHITECTURE

## Why Firebase
Free Spark RTDB for live text/JSON sync; avoids Firebase Storage billing for binaries.

## Configuration
- Env: `FIREBASE_DB_URL`
- Creds: `backend/firebase-service-account.json`
- SDK: `firebase_admin` + `db.reference`

## Access pattern
All data access goes through `get_ref(path)` then `.get()`, `.set()`, or `.push()`.

## Confirmed node structure (from code + verified tests)

```text
Firebase Realtime Database
│
├── students/
│   └── 22AIDS001/
│         ├── name
│         ├── department
│         └── rfid_uid
│
├── attendance_log/
│   └── <auto-id>/ { student_id, student_name, department, confidence, timestamp, source }
│
├── gate_log/
│   └── <auto-id>/ { student_id, student_name, department, card_uid, timestamp, gate_status, source }
│
├── store_inventory/
│   └── slot_1/ { item, stock, price }
│
├── store_sales_log/
│   └── <auto-id>/ { item_slot, item, price, timestamp, source }
│
└── classroom_notes/
      ├── unit3-entropy/ { extracted_text, page_count, uploaded_at? }
      ├── unit3-thermo/   (created during 5.6A tests)
      └── other notes_id keys from uploads/tests
```

`uploaded_at` is written by `save_classroom_notes`. Older manual notes may vary; **not verifiable for every historical key without a live dump**.

## Operations used
| Op | Where |
|---|---|
| Read `.get()` | health, students, inventory, notes, RFID student scan |
| Write `.set()` | classroom notes full record; inventory stock field |
| Write `.push()` | attendance_log, gate_log, store_sales_log |
| Delete | **Not implemented** for Firebase data (only local temp PDF delete) |

## No Firebase Storage
By design: no `face_images` / PDF binary nodes.

---

# 8. AI CLASSROOM COMPLETE FLOW (5.6A + 5.6B)

```text
[Upload path]
PDF file + notes_id
  → POST /api/classroom/upload
  → validate PDF + notes_id
  → save to backend/tmp/
  → pdfplumber extract text
  → Firebase classroom_notes/<notes_id>
  → delete temp PDF
  → 201 JSON

[Ask path]
Student Question + notes_id
  → POST /api/classroom/ask
  → validate question & notes_id
  → Firebase classroom_notes/<notes_id>
  → read extracted_text
  → build system + user prompt
  → Groq API (llama-3.1-8b-instant)
  → generate answer
  → return JSON {status, answer, source, model}
```

### Key fields explained
| Term | Meaning |
|---|---|
| `question` | Student’s natural-language question |
| `notes_id` | Key under `classroom_notes` (e.g. `unit3-entropy`) |
| `classroom_notes` | RTDB node storing extracted text + metadata |
| `unit3-entropy` | Verified notes document used in ask tests (logic-building PDF text) |
| Prompt | System: answer only from notes; User: notes + question |
| Groq | Hosted LLM API endpoint used by backend |
| Llama model | `llama-3.1-8b-instant` |
| `source` | Echoes `notes_id` used |
| `model` | Echoes model name for transparency |

AI answers are **not** stored back to Firebase.

---

# 9. VALIDATION AND ERROR HANDLING

| Situation | Endpoint/Module | Expected result | Why |
| --------- | --------------- | --------------- | --- |
| Missing/invalid JSON body | face/rfid/store/ask | 400 JSON body required | Cannot parse request |
| Missing `student_id` | face | 400 | Required field |
| Bad `confidence` | face | 400 | Must be number 0–1 |
| Unknown student | face | 404 | No Firebase student |
| Missing `card_uid` | rfid | 400 | Required |
| Unknown RFID | rfid | 404 denied | No matching `rfid_uid` |
| Missing `item_slot` | store | 400 | Required |
| Unknown slot | store | 404 | Inventory missing |
| Stock ≤ 0 | store | 409 | Prevent negative stock / no sale |
| Missing PDF file | classroom upload | 400 | Required |
| Missing `notes_id` | upload/ask | 400 | Required |
| Non-`.pdf` file | upload | 400 | Only PDF allowed |
| Empty/failed extraction | upload | 400 unable to extract | InvalidPdfError |
| Missing `question` | ask | 400 | Required |
| Unknown `notes_id` | ask | 404 | NotesNotFoundError |
| Empty notes text | ask service | 500 with message | RuntimeError |
| Missing `GROQ_API_KEY` | gemini_client | RuntimeError → ask 500 | Config required |
| Firebase down | health | 500 disconnected | Connectivity failure |
| Unexpected exceptions | most routes | 500 with `str(exc)` | Dev-friendly errors |

---

# 10. SECURITY

## Implemented security
- Secrets in `.env` (gitignored)
- Service account JSON gitignored (`firebase-service-account.json` and patterns)
- `.venv/` ignored
- Temp uploads (`tmp/`, `uploads/`) and media extensions ignored
- Input validation on all public APIs
- PDF extension check + `secure_filename` for temp names
- Temp PDF deleted after upload request
- CORS enabled (`flask_cors.CORS(app)`) for browser clients
- No hardcoded API keys in Python source
- Groq key required at call time

## Not implemented
- User authentication / JWT / API keys for clients
- Role-based authorization
- Rate limiting
- Strict CORS origin allowlist
- Request signing for ESP32 devices
- Production secret manager

## Recommended future improvements
Auth for dashboard, device tokens, origin restrictions, structured logging without leaking stack secrets, move service account to platform secret store on Render.

---

# 11. COMPLETE DATA FLOW

### General API
```text
Client → Flask → Route → Service → Data source → Response JSON → Client
```

### Firebase
```text
Request → Backend get_ref(path) → RTDB node → get/set/push → Backend → JSON
```

### AI Classroom
```text
Question → /ask → Validate → Firebase notes → Prompt → Groq/Llama → Answer JSON
```

### Store
```text
item_slot → read stock → stock-1 set → push sale → remaining_stock response
```

---

# 12. COMPLETE TESTING REPORT

| Test | Endpoint | Input | Expected | Actual | Status |
| ---- | -------- | ----- | -------- | ------ | ------ |
| Firebase student read | test script | `students/22AIDS001` | student dict | department AI&DS, name Praveen | Pass |
| Firebase inventory read | test script | `store_inventory/slot_1` | Gel Pen data | item/stock/price present | Pass |
| Health | GET `/api/health` | — | 200 connected | 200 | Pass |
| Face success | POST face | 22AIDS001 + 0.95 | 201 | 201 | Pass |
| Face bad confidence | POST face | confidence 1.5 | 400 | 400 | Pass |
| Face unknown | POST face | NOPE001 | 404 | 404 | Pass |
| RFID valid | POST rfid | A1B2C3D4 | 200 granted | 200 | Pass |
| RFID invalid | POST rfid | INVALID123 | 404 denied | 404 | Pass |
| Store dispense | POST store | slot_1 | 200 stock−1 | 200 | Pass |
| Store unknown | POST store | slot_999 | 404 | 404 | Pass |
| Store missing field | POST store | `{}` | 400 | 400 | Pass |
| Store OOS | service/API | stock 0 | 409 / no sale | Pass | Pass |
| Upload PDF | POST upload | sample PDF | 201 | 201 | Pass |
| Upload validations | upload | missing/invalid | 400 | 400 | Pass |
| Ask success | POST ask | perfect number + unit3-entropy | 200 answer | 200 | Pass |
| Ask missing question | ask | no question | 400 | 400 | Pass |
| Ask missing notes_id | ask | no notes_id | 400 | 400 | Pass |
| Ask unknown notes | ask | does-not-exist | 404 | 404 | Pass |
| Empty Groq key | `ask_groq` | env cleared | RuntimeError | RuntimeError | Pass |
| Stale server `/ask` | live old process | ask | 200 | HTML 404 | Fail until restart |
| After Flask restart | ask | same | 200 | 200 | Pass |

Note: repeated store regression tests decreased `slot_1` stock over time (expected side effect).

---

# 13. REGRESSION TESTING

## What it means
Re-testing older endpoints after adding new features to ensure nothing broke.

## Why after AI Classroom
Upload/ask touched shared app registration, Firebase, and dependencies; older gate/store APIs must keep working for the expo demo.

## Endpoints retested after 5.6A/5.6B
| Endpoint | Result |
|---|---|
| GET `/api/health` | 200 |
| POST `/api/face/recognize` | 201 |
| POST `/api/rfid/scan` | 200 |
| POST `/api/store/dispense` | 200 |
| POST `/api/classroom/upload` | 201 |

## Conclusion
No lasting regression bugs found in API logic. The only `/ask` failure observed was **stale Flask process** (old code still bound to port 5000), fixed by restart. Current backend has **no known open regression defects** after restart verification.

---

# 14. FILE AND FOLDER STRUCTURE

Actual project layout (excluding `.venv` site-packages):

```text
Smart_campus_Backend/
├── SMART_CAMPUS_BACKEND_COMPLETE_MINI_REPORT.md
├── PRD.md
├── SYSTEM_ARCHITECTURE.md
├── .gitignore
├── docs/
│   └── .gitkeep
└── backend/
    ├── app.py
    ├── firebase_config.py
    ├── gemini_client.py          # Groq client (filename historical)
    ├── pdf_extractor.py
    ├── test_firebase_connection.py
    ├── requirements.txt
    ├── Procfile
    ├── .env                      # gitignored
    ├── firebase-service-account.json  # gitignored
    ├── .venv/                    # gitignored
    ├── tmp/                      # created at runtime, gitignored
    ├── routes/
    │   ├── __init__.py
    │   ├── face.py
    │   ├── rfid.py
    │   ├── store.py
    │   └── classroom.py
    └── services/
        ├── __init__.py
        ├── attendance_service.py
        ├── inventory_service.py
        └── classroom_service.py
```

### Important files

```text
app.py
    ↓ Flask entry, CORS, blueprint registration, /api/health
    ↓ Used by: local run + Gunicorn

firebase_config.py
    ↓ Admin SDK init, get_ref/get_db
    ↓ Used by: all services + health

gemini_client.py
    ↓ ask_groq() → Groq Chat Completions
    ↓ Used by: classroom_service.ask_notes_question

pdf_extractor.py
    ↓ extract_pdf_text()
    ↓ Used by: classroom_service.save_classroom_notes

routes/face.py
    ↓ POST /recognize
    ↓ Used by: face clients

routes/rfid.py
    ↓ POST /scan
    ↓ Used by: RFID clients

routes/store.py
    ↓ POST /dispense
    ↓ Used by: store clients

routes/classroom.py
    ↓ POST /upload, POST /ask
    ↓ Used by: AI Teacher UI

services/attendance_service.py
    ↓ face + RFID Firebase logic
    ↓ Used by: face/rfid routes

services/inventory_service.py
    ↓ dispense_item
    ↓ Used by: store route

services/classroom_service.py
    ↓ save_classroom_notes, ask_notes_question
    ↓ Used by: classroom routes
```

---

# 15. DEPENDENCIES

From `backend/requirements.txt` (direct relevance):

| Dependency | Purpose | Where used |
| ---------- | ------- | ---------- |
| Flask | Web framework | `app.py`, routes |
| flask-cors | CORS headers | `app.py` |
| firebase-admin | RTDB Admin SDK | `firebase_config.py` |
| python-dotenv | Load `.env` | `firebase_config.py`, `gemini_client.py` |
| gunicorn | Production WSGI | `Procfile` |
| requests | HTTP client | `gemini_client.py` (Groq) |
| pdfplumber | PDF text extraction | `pdf_extractor.py` |
| PyPDF2 | Installed | **Not imported by app code currently** |
| google-cloud-* / grpc / etc. | Transitive deps of firebase-admin | Indirect |

No `google-generativeai` package in current freeze (Gemini SDK not installed).

---

# 16. ENVIRONMENT CONFIGURATION

```text
FIREBASE_DB_URL=********
GROQ_API_KEY=********
FLASK_ENV=********
PORT=********
```

| Variable | Purpose |
|---|---|
| `FIREBASE_DB_URL` | Realtime Database URL for Admin SDK |
| `GROQ_API_KEY` | Bearer token for Groq API |
| `FLASK_ENV` | Environment label (e.g. development) |
| `PORT` | Flask listen port (default 5000 if missing) |

Also required on disk: `firebase-service-account.json` (not an env var).

---

# 17. HOW TO RUN THE PROJECT

```text
1. Open project: Smart_campus_Backend/
2. cd backend
3. Create venv (if needed): python -m venv .venv
4. Activate: .\.venv\Scripts\Activate.ps1
5. Install: pip install -r requirements.txt
6. Ensure .env has FIREBASE_DB_URL, GROQ_API_KEY, PORT
7. Ensure firebase-service-account.json is present in backend/
8. Start: python app.py
   (or gunicorn for deploy: Procfile → web: gunicorn app:app)
9. Verify: GET http://127.0.0.1:5000/api/health
10. Test other APIs with PowerShell / requests
```

Optional Phase 5.1 check:
```text
python test_firebase_connection.py
```

---

# 18. MANUAL TESTING GUIDE (PowerShell)

Assume server running at `http://127.0.0.1:5000`.

### Health
```powershell
Invoke-RestMethod http://127.0.0.1:5000/api/health
```

### Face
```powershell
Invoke-RestMethod http://127.0.0.1:5000/api/face/recognize -Method Post -ContentType "application/json" -Body '{"student_id":"22AIDS001","confidence":0.95}'
```

### RFID
```powershell
Invoke-RestMethod http://127.0.0.1:5000/api/rfid/scan -Method Post -ContentType "application/json" -Body '{"card_uid":"A1B2C3D4"}'
```

### Store
```powershell
Invoke-RestMethod http://127.0.0.1:5000/api/store/dispense -Method Post -ContentType "application/json" -Body '{"item_slot":"slot_1"}'
```

### Classroom upload
```powershell
Invoke-RestMethod http://127.0.0.1:5000/api/classroom/upload -Method Post -Form @{
  notes_id = "unit3-entropy"
  file = Get-Item "C:\path\to\notes.pdf"
}
```

### Classroom ask — success
```powershell
Invoke-RestMethod http://127.0.0.1:5000/api/classroom/ask -Method Post -ContentType "application/json" -Body '{"question":"What is a perfect number?","notes_id":"unit3-entropy"}'
```
Expected: **200**, `status=success`, answer text, `source=unit3-entropy`, `model=llama-3.1-8b-instant`.

### Missing question → 400
```powershell
# Body without question
```

### Missing notes_id → 400

### Invalid notes_id → 404
```json
{"question":"What is a perfect number?","notes_id":"does-not-exist"}
```

---

# 19. PROBLEMS ENCOUNTERED AND FIXES

## Problem A — Stale Flask process hid `/api/classroom/ask`
```text
Problem: Live POST /api/classroom/ask returned HTML 404
   ↓
Why: Flask process on port 5000 was started before /ask was added
   ↓
Diagnosis: Other APIs worked; /ask path not registered in that process
   ↓
Change: Restart Flask with latest app.py/routes
   ↓
Result: POST /api/classroom/ask → 200 with Groq answer
```

## Problem B — Avoiding Firebase Storage billing
```text
Problem: Firebase Storage requires billing card (project constraint)
   ↓
Why: Product policy change
   ↓
Diagnosis: Architecture/PRD decision
   ↓
Change: Store only extracted text; delete local PDF; face photos stay local (outside backend)
   ↓
Result: Spark RTDB-only backend design
```

## Problem C — AI provider naming mismatch
```text
Problem: Docs say Gemini; implementation uses Groq
   ↓
Why: Phase 5.6B chose Groq; reused gemini_client.py filename to avoid restructuring
   ↓
Diagnosis: Code inspection of gemini_client.py + GROQ_API_KEY
   ↓
Change: ask_groq + llama-3.1-8b-instant
   ↓
Result: Working AI Teacher ask path; docs partially outdated
```

## Problem D — Store stock decreases during regression tests
```text
Problem: slot_1 stock reduced across repeated 200 tests
   ↓
Why: Real dispense writes to Firebase
   ↓
Diagnosis: Expected side effect
   ↓
Change: None required for demo; manually restock in Firebase if needed
   ↓
Result: Known operational note
```

---

# 20. BEFORE VS AFTER

| Before (Phase 1) | After (Phase 5.6B) |
| ------------------- | -------------------- |
| Empty stubs only | Working multi-module Flask API |
| No runtime server logic | Health + 5 feature endpoints |
| No Firebase code | Admin SDK + RTDB reads/writes |
| No AI | Groq grounded Q&A |
| No PDF handling | pdfplumber extract + temp cleanup |
| Placeholder env | Configured `.env` + service account |
| Docs-only architecture | Runnable backend for expo integrations |

---

# 21. CURRENT FINAL STATE

### Implemented
- Workspace + gitignore + Procfile + requirements
- Firebase Admin connection helpers
- Health, Face logging, RFID scan, Store dispense
- Classroom upload + ask (Groq)
- CORS, validation, service-layer separation
- Temp PDF deletion after upload

### Tested
- Firebase reads/writes for core nodes
- All six HTTP endpoints (happy path + key validations)
- Regression suite after classroom features
- Groq ask against `unit3-entropy`

### Planned / Not Implemented (in this backend repo)
- Actual face recognition / OpenCV pipeline
- ESP32 / NodeMCU firmware and GPIO/servo control
- Web dashboard (Vercel)
- Browser speech recognition/TTS
- Gemini API (docs planned; code uses Groq)
- Attendance cooldown enforcement
- Firebase Auth / user accounts
- Chat history / conversation memory
- Payment processing
- Firebase Storage
- Automated pytest suite (tests were manual/scripted)

### Future improvements (recommendations)
- Rename `gemini_client.py` → `groq_client.py` and update PRD/architecture docs
- Add API authentication for devices/dashboard
- Add cooldown for face/RFID spam
- Add pytest CI
- Restock helper or admin endpoint for demo inventory
- Deploy to Render with env secrets (no service account in git)

---

# 22. SIMPLE 2-MINUTE PROJECT EXPLANATION

“We built a Smart Campus backend in Flask that connects our expo demo devices to the cloud. Instead of putting photos or PDF files into Firebase Storage, we only store text and JSON in Firebase Realtime Database, which keeps us on the free plan.

When a laptop face script recognizes a student, it posts the student ID and confidence to our API and we log attendance. When an RFID card is scanned, we look up the card UID, log a gate event, and tell the device it can open the gate. When the store requests a dispense, we check stock, reduce it by one, and log the sale.

For the AI Teacher, a teacher uploads a PDF. We extract the text with pdfplumber, save only that text under classroom notes, and delete the temporary file. A student can then ask a question; we load those notes from Firebase, send them with the question to Groq’s Llama model, and return a short answer based on the notes.

So the backend is the central API: validate requests, update Firebase, and call AI when needed — while the heavy camera matching and hardware control stay on the laptop and microcontrollers.”

---

# APPENDIX — Source-of-truth notes

- This report is based on repository inspection of `Smart_campus_Backend` after Phase 5.6B.
- Hardware, dashboard, and local face ML are described in `PRD.md` / `SYSTEM_ARCHITECTURE.md` but are **not implemented inside this backend codebase**.
- Where live Firebase contents can drift (stock counts, extra notes IDs), values are described as verified during development tests, not as permanent constants.
- Anything not present in code or confirmed by tests is labeled **Planned / Not Implemented** or **Not verifiable from the current codebase.**

---

**End of report.**
