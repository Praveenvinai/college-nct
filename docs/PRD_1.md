# 📄 Product Requirements Document (PRD)
## Smart Campus — IoT Mini Working Model

**Version**: 2.0
**Date**: August 2026
**Status**: Active build

---

## 1. PURPOSE

Build a low-cost (~₹10-12K), physically working proof-of-concept of the Smart Campus system for a college expo demo — real hardware, real cloud sync, real AI — to validate the user experience before proposing a full-scale campus deployment.

This is a **prototype/demo artifact**, not a production system. Every decision in this document optimizes for: low budget, beginner-buildable, free-tier cloud only (no billing card required anywhere), and reliability on a single expo day.

---

## 2. GOALS

| Goal | Success Criteria |
|---|---|
| Demonstrate live attendance automation | Face recognition + RFID both log an entry within 2 seconds, visible on dashboard |
| Demonstrate automated dispensing | Store unit physically dispenses an item and updates inventory live |
| Demonstrate AI-assisted teaching | Student can ask a spoken question about uploaded notes and get a spoken answer |
| Prove cloud integration works end-to-end | All 3 hardware/software units write to Firebase and reflect on the dashboard in real time |
| Stay within budget and skill level | Total hardware cost ≤ ₹10-12K; buildable by a first-time IoT/soldering beginner in ~1 week |
| Zero ongoing cost | Every cloud service used must have a genuinely free tier with **no credit card required** |

---

## 3. SCOPE

### 3.1 — IN SCOPE

| Module | What's included |
|---|---|
| **Gate — Face Recognition** | Laptop webcam, local photo matching, live logging to cloud |
| **Gate — RFID** | ESP32 + RFID reader + servo barrier + LCD, physical working gate |
| **Smart Store** | NodeMCU + servo dispenser(s) + IR confirmation + OLED, live inventory sync |
| **AI Teacher (Voice Agent)** ★NEW★ | PDF notes upload → text extraction → spoken Q&A via browser voice + Gemini API |
| **Web Dashboard** | Live attendance log, gate status, store inventory, AI Teacher panel — single browser tab |
| **Cloud Backend** | Flask API on Render (free), Firebase Realtime Database (free, text-only) |

### 3.2 — OUT OF SCOPE (explicitly excluded from this phase)

| Excluded item | Reason |
|---|---|
| **Firebase Cloud Storage (image/file hosting)** | As of Feb 2026 requires a billing card even for free-tier usage. This build **never uploads binary files (photos, PDFs) to the cloud** — see Section 4 for how this is avoided. |
| Industrial-grade turnstiles / multi-lane gates | Cost and complexity — a small servo barrier demonstrates the same mechanic |
| Dedicated CCTV-grade cameras | Laptop webcam is sufficient for a demo and costs ₹0 extra |
| Large-scale store inventory (many item types) | A handful of demo slots is enough to prove the mechanism |
| Paid LLM APIs (OpenAI, Claude API, etc.) | Google Gemini's free tier covers this use case at ₹0 with no card |
| Multi-student / multi-classroom AI Teacher at scale | This phase proves the mechanism with one notes document at a time |
| Production-grade authentication / user accounts | Not needed for a demo; deferred to full-scale proposal |
| Persistent, always-on cloud hosting | Render free tier (sleeps when idle) is accepted for this phase — a paid tier is a full-scale-only requirement |

**A separate proposal for full-scale, production deployment (addressing every item above) is available once this prototype validates the core experience.**

---

## 4. KEY ARCHITECTURAL DECISION: NO CLOUD FILE STORAGE

This deserves its own section because it shapes several design choices:

- **Face photos** stay in a local folder on the laptop running the recognition script. The cloud only ever receives a text result: `{name, confidence, timestamp}`. The photo itself is never transmitted.
- **PDF class notes** are uploaded to the Flask backend, which extracts the **text** immediately (via PyPDF2/pdfplumber) and discards the original file. Only the extracted text is stored in Firebase Realtime Database — as a normal text field, not a stored file.

This means the entire project runs on Firebase's **Spark (free, no-card) plan** — the Realtime Database free tier is untouched by the 2026 Storage billing change, since Storage is a separate product that this project simply doesn't use.

---

## 5. FUNCTIONAL REQUIREMENTS

### 5.1 Gate — Face Recognition
- FR1: System shall detect a face in the webcam feed within 2 seconds
- FR2: System shall compare detected face against locally stored known faces
- FR3: On match ≥ configured confidence threshold, system shall log the event to the cloud with name, confidence, timestamp
- FR4: System shall not log the same person again within a configurable cooldown window (default 30 sec for demo)
- FR5: System shall display a visible on-screen indicator of match/no-match

### 5.2 Gate — RFID
- FR6: System shall read an RFID card UID via the MFRC522 reader
- FR7: On a recognized UID, system shall open the servo barrier, display the student's name on the LCD, and log the event to the cloud
- FR8: On an unrecognized UID, system shall not open the barrier and shall show an error state

### 5.3 Smart Store
- FR9: System shall accept an item selection via button press
- FR10: On selection, if stock > 0, system shall dispense via servo and confirm the drop via IR sensor
- FR11: System shall decrement the stock count in the cloud on successful dispense
- FR12: System shall display order confirmation on the OLED

### 5.4 AI Teacher (Voice Agent)
- FR13: System shall accept a PDF upload via the dashboard
- FR14: System shall extract text from the PDF and store only the text (not the file) in the cloud
- FR15: System shall accept a spoken question via the browser microphone (Web Speech API)
- FR16: System shall convert the spoken question to text client-side before sending to the backend
- FR17: System shall send the question + relevant notes text to the Gemini API and return an answer
- FR18: System shall display the answer as a chat message AND read it aloud via browser text-to-speech
- FR19: System shall handle a Gemini API failure gracefully (e.g., "Sorry, I couldn't process that — try again")

### 5.5 Web Dashboard
- FR20: Dashboard shall display live attendance entries within 1 second of a cloud write (Firebase real-time listener)
- FR21: Dashboard shall display live store inventory counts
- FR22: Dashboard shall provide the AI Teacher panel (upload + voice Q&A) as described above
- FR23: Dashboard shall be accessible via a public URL (Vercel-hosted)

---

## 6. NON-FUNCTIONAL REQUIREMENTS

| Category | Requirement |
|---|---|
| **Budget** | Total hardware cost ≤ ₹10,000-12,000, all cloud/software services ₹0 with no card required |
| **Buildability** | Must be achievable by a first-time IoT/soldering beginner within ~1 week, using breadboard-first testing before any soldering |
| **Reliability** | Must run stably for a full expo day (~8 hours) — mains power required, battery as backup only |
| **Network** | Must work on standard 2.4GHz WiFi (no 5GHz-only dependency for ESP32/NodeMCU) |
| **Browser compatibility** | AI Teacher voice features require Chrome or Edge (Web Speech API support) |
| **Data privacy** | No student photos or uploaded documents ever leave local/ephemeral processing — only derived text/results are stored in the cloud |

---

## 7. ASSUMPTIONS

- Expo venue has standard WiFi (2.4GHz band available) and mains power access
- Demo laptop runs Chrome or Edge as the primary browser
- 3-5 students will be pre-enrolled (photos + RFID cards) for the live demo, not the full student body
- One PDF document will be pre-loaded for the AI Teacher demo, not a live multi-document library
- Render free-tier "cold start" delay (~20-30 sec after inactivity) is acceptable if mitigated with a pre-demo warm-up ping

---

## 8. OPEN QUESTIONS

- [ ] Which specific PDF/notes topic should be used for the AI Teacher demo? (affects what questions to rehearse)
- [ ] How many students should be enrolled for the live demo — names/photos still needed
- [ ] Does the expo booth have confirmed WiFi and power access, or should a mobile hotspot be a backup plan?

---

## 9. RELATED DOCUMENTS

- `SYSTEM_ARCHITECTURE.md` — full technical flow diagrams and data model
- `SHOPPING_CHECKLIST.md` — itemized BOM with sourcing (Chennai electronics + Trichy acrylic)
- `Smart_Campus_Mini_Project_Proposal.docx` — client-facing cost proposal
