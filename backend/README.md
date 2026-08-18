# Smart Campus Backend

A modular Flask + Firebase backend for a Smart Campus IoT mini project that provides attendance logging, RFID gate management, smart store inventory control, PDF-based classroom notes management, and an AI Teacher module powered by Groq Llama 3.1.

---

## Features

- Face attendance logging (match result API — no image processing in the backend)
- RFID gate access logging
- Smart store inventory dispensing
- Classroom PDF upload and text extraction
- AI Teacher question answering from uploaded notes (Groq)
- Firebase Realtime Database integration (text/JSON only — no cloud file storage)
- RESTful API architecture with Flask Blueprints

---

## Tech Stack

| Layer | Technology |
|------|------------|
| Language | Python 3.14 |
| Backend | Flask |
| Database | Firebase Realtime Database |
| AI Model | Groq `llama-3.1-8b-instant` |
| PDF Processing | pdfplumber, PyPDF2 |
| Environment | python-dotenv |
| Deployment Ready | gunicorn |

---

## Project Structure

```text
Smart_campus_Backend/
├── backend/
│   ├── app.py
│   ├── firebase_config.py
│   ├── gemini_client.py
│   ├── pdf_extractor.py
│   ├── requirements.txt
│   ├── Procfile
│   ├── routes/
│   │   ├── face.py
│   │   ├── rfid.py
│   │   ├── store.py
│   │   └── classroom.py
│   └── services/
│       ├── attendance_service.py
│       ├── inventory_service.py
│       └── classroom_service.py
├── PRD.md
├── SYSTEM_ARCHITECTURE.md
└── README.md
```

> Local-only secrets (not committed): `backend/.env`, `backend/firebase-service-account.json`

---

## API Endpoints

| Method | Endpoint | Description |
|-------|----------|-------------|
| GET | `/api/health` | Backend health check |
| POST | `/api/face/recognize` | Log face attendance |
| POST | `/api/rfid/scan` | Validate RFID card and log gate access |
| POST | `/api/store/dispense` | Dispense item and update inventory |
| POST | `/api/classroom/upload` | Upload classroom PDF and extract text |
| POST | `/api/classroom/ask` | Ask questions from uploaded classroom notes |

---

## Local Setup Instructions

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python app.py
```

The backend runs on:

```text
http://127.0.0.1:5000
```

Also place your Firebase service account JSON at:

```text
backend/firebase-service-account.json
```

---

## Environment Variables

Create `backend/.env` (do not commit real secrets):

```env
FIREBASE_DB_URL=https://your-project-default-rtdb.asia-southeast1.firebasedatabase.app/
GROQ_API_KEY=your_groq_api_key
FLASK_ENV=development
PORT=5000
```

### Smart Store device mode

`POST /api/store/purchase` reserves stock and queues a dispense command. How
that command completes is controlled by `STORE_DEVICE_MODE`:

| Value | Behaviour |
| --- | --- |
| `hardware` | **Default.** The transaction stays `pending` until a real device reports a result via `POST /api/store/device/result`. Nothing is ever auto-completed. |
| `simulation` | Development/testing only. The device handshake is simulated immediately and every affected record is tagged `simulated: true` with `device_id: "simulator"`. |

Simulation is never implicit: an unset, empty or unrecognised value falls back to
`hardware` and logs a warning. Enable it explicitly and only before the ESP32 is
wired up:

```env
STORE_DEVICE_MODE=simulation
```

`STORE_COMMAND_TTL_SECONDS` (default `90`) is how long a queued command stays
valid. Once it expires the transaction is marked `failed` and the reserved unit
is returned to `store_inventory`, so an unreachable dispenser can never leave
stock permanently held.

---

## Firebase Data Model

Root nodes used by the backend:

```text
students
staff
visitor
attendance_log
gate_log
store_inventory
store_sales_log
store_dispense_queue
store_purchase_keys
classroom_notes
```

`store_sales_log` is the single store transaction ledger. Records created by the
purchase flow add `user_id`, `user_name`, `role`, `dispenser_slot`, `status`,
`requested_at`, `completed_at`, `device_id` and `idempotency_key`; older records
written by `POST /api/store/dispense` have no `status` and are read as completed.

`store_dispense_queue` holds only in-flight hardware commands (keyed by
transaction id) so the node the ESP32 polls stays small; entries are removed once
a transaction is completed or failed. `store_purchase_keys` is a small
idempotency index mapping `idempotency_key` to `transaction_id`, which is what
stops a double click from dispensing twice.

Example `classroom_notes` document:

```text
classroom_notes/
└── unit3-entropy/
    ├── extracted_text: "..."
    ├── uploaded_at: "2026-08-09T12:00:00Z"
    └── page_count: 2
```

Only extracted text and metadata are stored — **no PDF binary data**.

---

## Example Requests

### Face Recognition

`POST /api/face/recognize`

```json
{
  "student_id": "22AIDS001",
  "confidence": 0.95
}
```

### RFID Scan

`POST /api/rfid/scan`

```json
{
  "card_uid": "A1B2C3D4"
}
```

### Classroom Ask

`POST /api/classroom/ask`

```json
{
  "question": "What is a perfect number?",
  "notes_id": "unit3-entropy"
}
```

---

## AI Teacher Workflow

```text
PDF Upload
    ↓
Extract Text
    ↓
Store in Firebase
    ↓
Ask Question
    ↓
Read Notes
    ↓
Groq Llama 3.1
    ↓
Return Grounded Answer
```

The AI Teacher answers using **only** the uploaded classroom notes as context. If the information is not present in the notes, it clearly says so instead of inventing unrelated content.

---

## Security Notes

- `.env` is excluded from Git
- `firebase-service-account.json` is excluded from Git
- Temporary uploaded PDFs are deleted automatically after processing
- No PDF binary data is stored in Firebase
- Face photos stay on the client device — the backend only receives match results

---

## Testing Status

Manually verified:

- Health API
- Face Recognition API
- RFID Gate API
- Smart Store API
- Classroom Upload API
- Classroom Ask API

---

## Current Status

> **Backend Status:** Completed through **Phase 5.6B** with Flask, Firebase Realtime Database, PDF extraction, and Groq-powered AI Teacher integration fully implemented and manually verified.

---

