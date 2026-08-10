# 🏗️ Smart Campus Mini Model — System Architecture

## Complete Flow: Laptop Face Recognition + ESP32 RFID Gate + NodeMCU Store + Cloud

---

## 1. HIGH-LEVEL SYSTEM DIAGRAM

```
                              ┌───────────────────────────────┐
                              │         CLOUD LAYER              │
                              │                                    │
                              │  ┌──────────────┐  ┌─────────────┐│
                              │  │  Flask API      │  │  Firebase    ││
                              │  │  (Render.com,    │◀▶│  Realtime    ││
                              │  │   free tier)       │  │  Database    ││
                              │  └──────┬───────┘  └──────┬──────┘│
                              └─────────┼──────────────────┼───────┘
                                        │  HTTPS               │ real-time
                             ┌──────────┼──────────┐          │ sync
                             │          │          │          │
                  HTTP POST  │  HTTP POST │HTTP POST│          │
                             │          │          │          ▼
                 ┌───────────▼──┐ ┌─────▼─────┐ ┌──▼────────┐ ┌────────────────┐
                 │  LAPTOP          │ │  ESP32       │ │  NodeMCU     │ │  WEB DASHBOARD    │
                 │  (Gate — Face)     │ │  (Gate — RFID) │ │  (Store)       │ │  (Vercel, free)     │
                 │                      │ │                │ │                │ │                      │
                 │  Webcam +              │ │  MFRC522 RFID   │ │  Button/RFID    │ │  Live attendance     │
                 │  face_recognition        │ │  + SG90 Servo    │ │  + SG90 Servo    │ │  Gate status           │
                 │  (Python script)           │ │  + 16x2 LCD       │ │  + IR Sensor      │ │  Store inventory        │
                 │                              │ │                    │ │  + OLED Display    │ │  (auto-refresh via         │
                 │                                │ │                      │ │                      │ │   Firebase listener)          │
                 └──────────────────┘ └──────────────┘ └────────────────┘ └────────────────────────┘
                     PHYSICAL GATE          PHYSICAL GATE        PHYSICAL STORE         BROWSER (client's laptop/phone)
                     Camera-based              Card-tap based        Servo dispenser
```

---

## 2. COMPONENT ROLES

| Component | Runs On | Responsibility |
|---|---|---|
| **Face Recognition Script** | Your laptop (Python) | Captures webcam frames, matches against enrolled student photos, POSTs result to cloud |
| **Gate ESP32** | ESP32 DevKit | Reads RFID card, opens servo barrier, shows welcome message on LCD, POSTs card ID to cloud |
   | **Store NodeMCU** | ESP8266 | Detects button/RFID trigger, dispenses via servo, confirms via IR sensor, POSTs event to cloud |
| **Flask API** | Render.com (free) | Central brain — validates identity, decides match/no-match, writes to Firebase, returns response to devices |
| **Firebase Realtime DB** | Google Cloud (free Spark plan) | Single source of truth — student list, attendance logs, store inventory. Pushes live updates to anything listening | Praveen
| **Web Dashboard** | Vercel (free) | Browser-based UI — subscribes to Firebase, shows everything updating live with zero page refresh | Aswin
| AI Teachwer| PDF uploaded (Chat bot/Voice agent which answer) Muzifa

---

## 3. FLOW A — FACE RECOGNITION ENTRY (Laptop Webcam)

```
 STUDENT WALKS UP TO CAMERA
            │
            ▼
 ┌─────────────────────┐
 │ Laptop webcam captures │
 │ a frame (every ~1 sec)   │
 └───────────┬─────────────┘
             ▼
 ┌─────────────────────────┐
 │ face_recognition library    │
 │ compares frame against         │
 │ known student encodings          │
 └───────────┬─────────────────┘
             │
     ┌───────┴────────┐
     ▼                 ▼
  MATCH FOUND      NO MATCH
     │                 │
     ▼                 ▼
 ┌─────────────┐  ┌──────────────┐
 │ POST to Flask: │  │ Keep scanning   │
 │ { student_id,   │  │ (loop continues)│
 │   confidence,    │  └──────────────┘
 │   method:"face" }│
 └──────┬──────────┘
        ▼
 ┌───────────────────────┐
 │ Flask API:                │
 │ 1. Verify student exists    │
 │ 2. Check not already logged  │
 │    in last 5 min (dedupe)      │
 │ 3. Write attendance record       │
 │    to Firebase                     │
 │ 4. Return { name, status: "ok" }     │
 └──────┬────────────────────────────┘
        ▼
 ┌─────────────────────┐        ┌──────────────────────────┐
 │ Laptop shows on-screen: │        │ Firebase pushes update to:  │
 │ "✓ Welcome, Priya"        │        │ → Web Dashboard (live row)     │
 └─────────────────────────┘        │ → (optionally) Gate ESP32 LCD     │
                                       └──────────────────────────────┘
```

**API call example:**
```
POST https://your-app.onrender.com/api/face/recognize
Content-Type: application/json

{
  "image_base64": "<captured frame>",
  "device": "laptop-webcam-01"
}

Response:
{
  "status": "matched",
  "student_name": "Priya Dharshini",
  "student_id": "22EC018",
  "confidence": 0.94,
  "timestamp": "2026-08-07T09:42:15Z"
}
```

---

## 4. FLOW B — RFID ENTRY (ESP32 Gate Barrier)

```
 STUDENT TAPS RFID CARD ON READER
            │
            ▼
 ┌─────────────────────┐
 │ MFRC522 reads card UID  │
 │ (ESP32 firmware)          │
 └───────────┬─────────────┘
             ▼
 ┌─────────────────────────┐
 │ ESP32 connects to WiFi     │
 │ POSTs UID to Flask API       │
 └───────────┬─────────────────┘
             ▼
 ┌───────────────────────┐
 │ Flask API:                │
 │ 1. Look up UID in Firebase   │
 │ 2. If found → log attendance   │
 │ 3. Return student name + "open"│
 └──────┬────────────────────────┘
        ▼
 ┌─────────────────────┐
 │ ESP32 receives response:│
 │ - Prints name on 16x2 LCD │
 │ - Rotates SG90 servo to     │
 │   open barrier (90°)          │
 │ - Waits 3 sec, closes barrier   │
 │ - Beeps buzzer once               │
 └─────────────────────────────────┘
             │
             ▼
 ┌──────────────────────────┐
 │ Firebase pushes update →     │
 │ Web Dashboard shows new row     │
 │ instantly (RFID icon badge)       │
 └──────────────────────────────┘
```

**API call example:**
```
POST https://your-app.onrender.com/api/rfid/scan
Content-Type: application/json

{ "card_uid": "A1B2C3D4", "device": "gate-esp32-01" }

Response:
{ "status": "granted", "student_name": "Karthik Raja", "action": "open_gate" }
```

---

## 5. FLOW C — SMART STORE DISPENSE (NodeMCU)

```
 STUDENT PRESSES BUTTON / TAPS RFID FOR ITEM
            │
            ▼
 ┌─────────────────────────┐
 │ NodeMCU detects button press │
 │ → identifies item slot #        │
 └───────────┬─────────────────┘
             ▼
 ┌─────────────────────────┐
 │ NodeMCU POSTs order to Flask:│
 │ { item: "pen", slot: 1 }        │
 └───────────┬─────────────────┘
             ▼
 ┌───────────────────────┐
 │ Flask API:                │
 │ 1. Check Firebase stock       │
 │    for slot 1 > 0               │
 │ 2. If yes → decrement stock       │
 │ 3. Return { "dispense": true }      │
 └──────┬────────────────────────────┘
        ▼
 ┌─────────────────────────┐
 │ NodeMCU receives "dispense":│
 │ - Rotates SG90 servo → drops  │
 │   item into tray                 │
 │ - IR sensor confirms item fell     │
 │ - Shows "Enjoy!" on OLED             │
 └───────────┬─────────────────────────┘
             ▼
 ┌─────────────────────────┐
 │ Firebase pushes update →     │
 │ Web Dashboard inventory tile    │
 │ updates live (e.g. "5 left")      │
 └──────────────────────────────┘
```

**API call example:**
```
POST https://your-app.onrender.com/api/store/dispense
Content-Type: application/json

{ "item_slot": 1, "device": "store-nodemcu-01" }

Response:
{ "status": "dispensed", "item": "Gel Pen", "remaining_stock": 41 }
```

---

## 6. CLOUD DATA MODEL (Firebase Realtime Database)

```
smart-campus-demo/
│
├── students/
│   ├── 22EC018/
│   │   ├── name: "Priya Dharshini"
│   │   ├── dept: "ECE"
│   │   ├── rfid_uid: "A1B2C3D4"
│   │   └── face_encoding_ref: "priya.jpg"
│   └── ... (more students)
│
├── attendance_log/
│   ├── -Nx7abc123/
│   │   ├── student_id: "22EC018"
│   │   ├── method: "face" | "rfid"
│   │   ├── timestamp: "2026-08-07T09:42:15Z"
│   │   └── status: "on_time" | "late"
│   └── ... (append-only log)
│
├── store_inventory/
│   ├── slot_1/ { item: "Gel Pen", stock: 41, price: 15 }
│   ├── slot_2/ { item: "Frooti",  stock: 6,  price: 20 }
│   └── ...
│
└── store_sales_log/
    └── -Nx9def456/ { item: "Gel Pen", time: "...", slot: 1 }
```

---

## 7. TECH STACK SUMMARY

| Layer | Technology | Cost |
|---|---|---|
| Face recognition | Python + OpenCV + `face_recognition` library (laptop) | ₹0 |
| Gate hardware | ESP32 + MFRC522 RFID + SG90 servo + 16×2 LCD | ~₹1,000 |
| Store hardware | NodeMCU ESP8266 + SG90 servo + IR sensor + OLED | ~₹700 |
| Backend API | Flask (Python), hosted on Render.com free tier | ₹0 |
| Database | Firebase Realtime Database, Spark (free) plan | ₹0 |
| Web dashboard | HTML/JS or React, hosted on Vercel free tier | ₹0 |
| Networking | Devices + laptop connect via venue WiFi (2.4GHz for ESP32/NodeMCU) | ₹0 |

---

## 8. NETWORK REQUIREMENTS (Important for Demo Day)

- ESP32 and NodeMCU **only support 2.4GHz WiFi** — make sure the demo venue's WiFi isn't 5GHz-only
- All three devices (laptop, ESP32, NodeMCU) must be on the **same network** or at least have internet access to reach Render/Firebase
- Render free tier **sleeps after ~15 min idle** — send a warm-up request 2-3 minutes before your live demo starts (I can build this into a "wake up" button on the dashboard)
- Firebase free tier has generous limits (100 simultaneous connections, 1GB storage) — more than enough for a demo

---

## 9. WHAT HAPPENS END-TO-END (Full Demo Script)

```
1. Client arrives → laptop webcam auto-detects face → "Welcome, [Name]" appears
   on both laptop screen AND web dashboard within ~1 second

2. Client (or you) taps an RFID card on the ESP32 reader → barrier servo swings
   open → LCD shows name → dashboard logs second entry with RFID badge

3. Client walks to store unit → presses "Pen" button → servo dispenses →
   OLED shows "Enjoy!" → dashboard inventory count drops from 42 to 41 live

4. Everything visible on ONE browser tab (the dashboard) — client sees
   hardware + cloud + web all working together in real time
```

---

## 10. NEXT: WHAT I'LL BUILD

In order:
1. **Flask API** (`app.py`) — all 3 endpoints above (`/api/face/recognize`, `/api/rfid/scan`, `/api/store/dispense`) + Firebase integration
2. **Laptop face recognition script** (`webcam_recognizer.py`) — captures, matches, posts
3. **ESP32 Arduino sketch** (`gate_esp32.ino`) — RFID + servo + LCD + WiFi POST
4. **NodeMCU Arduino sketch** (`store_nodemcu.ino`) — button + servo + IR + OLED + WiFi POST
5. **Web dashboard** (`dashboard.html` or React) — Firebase live listener UI

Ready to start with the Flask API + Firebase setup?
