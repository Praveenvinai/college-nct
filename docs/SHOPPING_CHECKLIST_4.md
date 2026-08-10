# 🛒 Smart Campus Mini Model — Shopping Checklist
### Chennai (Electronics) + Trichy (Acrylic Housing)

---

## 📍 TRIP 1: CHENNAI — Ritchie Street (Electronics, Tools, Wiring)

**Area**: Ritchie Street, off Anna Salai/Mount Road, Chennai
**Best time to go**: After 11 AM, shops start closing ~10 PM
**Tip**: Bargaining is normal — check 2-3 shops before buying if the price seems high

**Shops to check first:**
- [ ] Ocean Student Projects (RFID, Arduino, Raspberry Pi, servos, OLED — closest match to this list)
- [ ] Majestic Electronics — Athipattan Street, Mount Road, Chennai-600002
- [ ] Matrix Electronics & Projects

### A. Controllers
- [ ] ESP32 DevKit V1 — Qty 1 — ~₹450-500
- [ ] NodeMCU ESP8266 — Qty 1 — ~₹280-320

### B. Sensors & Identification
- [ ] MFRC522 RFID Reader Module — Qty 1 — ~₹150-180
- [ ] RFID Cards/Keychains (pack of 5) — Qty 1 — ~₹100-130
- [ ] IR Obstacle Sensor — Qty 3 — ~₹180-220
- [ ] Ultrasonic Sensor (HC-SR04) — Qty 1 — ~₹80-100

### C. Actuators & Displays
- [ ] SG90 Micro Servo Motor — Qty 3 — ~₹300-350 *(1 gate barrier + 2 store slots — simplified from 4 to 2 dispensing slots, see ACRYLIC_MODEL_SPEC.md)*
- [ ] 16×2 LCD + I2C adapter — Qty 1 — ~₹170-200
- [ ] 0.96" OLED Display — Qty 1 — ~₹180-220
- [ ] Active Buzzer — Qty 2 — ~₹40
- [ ] LEDs (assorted colors) — Qty 8 — ~₹40
- [ ] Push Buttons — Qty 6 — ~₹50

### D1. Breadboard Prototyping — BUY & BUILD FIRST (Days 3-4)
*Everything gets tested here before anything is permanent. Don't skip to soldering — this is where mistakes are cheap to fix.*
- [ ] Breadboard (full-size, 830-point) — Qty 2 — ~₹240 *(one for gate unit, one for store unit)*
- [ ] Jumper wire kit (M-M / M-F / F-F) — 1 set — ~₹180
- [ ] Resistor kit (assorted) — Qty 1 — ~₹80
- [ ] Single-core connecting wire roll — ~₹100

### D2. Soldering & Permanent Assembly — BUY NOW, USE ONLY ON DAY 5 (if breadboard is stable)
*Beginner soldering kit — includes a few safety/practice items you won't find in most basic lists, worth the small extra cost given this is a first-time solder job under a deadline.*
- [ ] General purpose PCB / perfboard — Qty 2 — ~₹100
- [ ] **Perfboard scrap piece for practice** — Qty 1 — ~₹30-50 — *practice 5-6 solder joints here BEFORE touching the real board*
- [ ] Soldering iron (25-40W, if you don't already own one) — Qty 1 — ~₹150-250
- [ ] Soldering wire (60/40 rosin core) + flux — ~₹100
- [ ] **Solder sucker or desoldering wick** — Qty 1 — ~₹80-120 — *for undoing mistakes, very likely as a first-timer*
- [ ] **"Helping hands" tool (alligator clip stand)** — Qty 1 — ~₹150-200 — *holds the board steady, much easier and safer than holding it by hand*
- [ ] **Safety glasses** — Qty 1 — ~₹80-120 — *solder can spit hot flux, cheap insurance*
- [ ] **Heat shrink tubing (assorted sizes)** — 1 pack — ~₹80 — *cleaner, safer joint insulation than tape*
- [ ] Single-core connecting wire roll (extra, for permanent wiring) — ~₹100
- [ ] Glue gun + sticks — Qty 1 — ~₹150 *(also used for mounting into the acrylic housing later)*

### E. Power & Cables
- [ ] 5V 2A USB adapters — Qty 2 — ~₹300
- [ ] 18650 Li-ion battery + holder — 1 set — ~₹150
- [ ] TP4056 charging module — Qty 1 — ~₹60
- [ ] USB / Micro-USB / Type-C data cables — Qty 3 — ~₹240
- [ ] **Multi-socket extension board (4-6 socket)** — Qty 1 — ~₹250-350 — *mains power at the expo venue, don't rely on battery alone for an 8-hr day*
- [ ] **Power bank (10,000mAh, 5V/2A output)** — Qty 1 — ~₹500-700 — *backup only, for brief power cuts, not primary power*

### F. AI Teacher — Voice Agent Hardware ★NEW★ (Optional but recommended)
*The AI Teacher module itself costs ₹0 in software — Google Gemini's free API tier (no card, no expiry) handles the Q&A, and the browser's built-in Web Speech API handles voice input/output for free. These two items are the only physical additions, and only matter because an expo hall is noisy.*
- [ ] **USB clip-on/lapel microphone** — Qty 1 — ~₹300-500 — *improves speech-to-text accuracy over the laptop's built-in mic in a noisy hall*
- [ ] **Small USB/Bluetooth speaker** — Qty 1 — ~₹400-600 — *so the AI's spoken answer is actually audible over expo noise*

*Both are skippable if budget is tight — the feature works fine on a quiet desk using just the laptop's built-in mic/speaker; they just make it more reliable in a crowded expo hall.*

**CHENNAI SUBTOTAL: ~₹4,600 – ₹5,410** (core items)
**+ ₹700-1,100 optional** (AI Teacher audio gear, Section F)

> ⚠️ **Wiring note for demo day**: Power the servo motors off their own 5V rail from the wall adapter (sharing only ground with the ESP32/NodeMCU), not off the microcontroller's regulator pin. Servos drawing a current spike can brownout and reset the board mid-demo otherwise.

---

## 📍 TRIP 2: TRICHY — Acrylic Model Housing

**Call ahead before visiting — confirm pricing, turnaround, and whether they need a design file**

- [ ] **Lasertech Trichy** — No. 31, Annamalaiyar Street, Aruna Nagar, Puthur, Trichy-17
      ☎ +91 98424 34757 · suresh.essaar@gmail.com
      *(Best first call — dedicated laser cutting shop, does CO2 laser for acrylic/wood)*

- [ ] **Keddy Concept** — GST + TrustSEAL verified, 16 yrs, ~₹250/sq ft (IndiaMART)

- [ ] **Sam Signs** — GST + TrustSEAL verified, 14 yrs, ~₹100/sq ft (IndiaMART)

- [ ] **GR Sign Gallery** — 30 yrs in signage, acrylic sign boards (Sulekha)

**What to bring/say on the call:**
- Exact dimensions and material spec — see `ACRYLIC_MODEL_SPEC.md` for the full cut list (4mm cast acrylic, Gate panel 150×300mm + base 180×60mm, Store panel 200×300mm + base 220×60mm, plus all cutout sizes)
- Ask if they can also cut a 10mm × 70mm strip from offcut scrap (barrier arm)
- A simple hand-drawn sketch with measurements works fine — no CAD file needed

### Housing & Finishing Items
- [ ] 4mm cast acrylic sheet, ~600×600mm + laser cutting (Gate panel + base, Store panel + base, all cutouts) — ~₹1,200 — *see ACRYLIC_MODEL_SPEC.md for exact cut list to hand the shop*
- [ ] 2× short PVC pipe or thick cardboard tube, ~35-40mm diameter × 120mm long — ~₹100 — *item-storage tubes inside the store unit, from a hardware/plumbing shop*
- [ ] M3 screws + nylon standoffs (small pack) — ~₹80 — *for mounting ESP32/NodeMCU boards onto the panel backs*
- [ ] Miniature figures/decorative props — ~₹250
- [ ] Acrylic paint / poster colors — ~₹150
- [ ] Paint brushes, misc finishing — ~₹150

**TRICHY SUBTOTAL: ~₹1,930**

---

## 💰 GRAND TOTAL

| Trip | Subtotal |
|---|---|
| Chennai — core electronics, tools, wiring, power, soldering kit | ₹4,600 – ₹5,410 |
| Chennai — AI Teacher audio gear (optional) | ₹700 – ₹1,100 |
| Trichy — acrylic housing + finishing (see `ACRYLIC_MODEL_SPEC.md`) | ₹1,930 |
| **TOTAL HARDWARE (with optional audio gear)** | **₹7,230 – ₹8,440** |
| **TOTAL HARDWARE (skip optional audio gear)** | **₹6,530 – ₹7,340** |
| *(Includes ~10% shipping/contingency buffer if bought online instead)* | *up to ₹9,300* |

**AI Teacher software cost: ₹0** — Google Gemini API free tier (no card, no expiry) + browser's built-in Web Speech API. No new cloud service, no new billing account, nothing to sign up for beyond a free Google AI Studio API key.

*Note: buying in-person at Ritchie Street is often cheaper than the online-quoted estimate because you skip shipping costs and can negotiate — actual total will depend on bargaining and exact models chosen.*

---

## ✅ BUILD SEQUENCE (Breadboard → Solder → Acrylic)

**Buying happens all at once — building happens in phases.** Buy every item on this list (D1 + D2 + acrylic) in the same week, but only *use* D2 (soldering kit) and the acrylic housing once the breadboard version is proven working.

| Day | What happens |
|---|---|
| **Day 1** | Call Trichy acrylic shops, place the order now (longest lead time) |
| **Day 2** | Chennai trip — buy everything: D1 breadboard items, D2 soldering kit, acrylic paint/props, power items — all in one visit |
| **Day 3-4** | **Breadboard build** — wire the gate unit and store unit on breadboard, test against the backend, fix any issues. Don't touch the soldering kit yet. |
| **Day 4** | Pick up acrylic housing once Trichy shop confirms it's ready |
| **Day 5** | **Only if the breadboard version has run stable for a few hours**: practice 5-6 joints on the scrap perfboard first, then solder the real circuit onto perfboard. If anything feels uncertain, it's completely fine to skip soldering and mount the breadboard version instead — a tidy, hot-glued-down breadboard looks professional at an expo too. |
| **Day 6** | Mount the (soldered or breadboard) circuit into the acrylic housing, cable management, full integration test |
| **Day 7** | Dry-run rehearsal |

**The permission to skip soldering matters**: given this is your first solder job and the timeline is tight, a working breadboard beats a broken solder joint every time. Make that call on Day 5 based on how stable Days 3-4 actually went — not on a plan made today.

---

## 📋 WHAT'S NOT ON THIS LIST (already have / free)

- Laptop with webcam (for face recognition module)
- Chrome or Edge browser (needed for AI Teacher voice — Web Speech API support)
- Cloud accounts: Firebase (Spark, text-only), Render.com, Vercel, Google AI Studio (Gemini free tier) — all free, **no card required for any of them**
- Python + Arduino IDE — free software installs

## 🚫 WHAT'S DELIBERATELY EXCLUDED (see PRD.md for full reasoning)

- **Firebase Cloud Storage** — as of Feb 2026 this now requires a billing card even at $0 usage. This build avoids it entirely: face photos stay local on the laptop, and uploaded PDFs are converted to text and the original file is discarded — nothing binary ever touches the cloud.

---

**Print this page and carry it on both trips — check off items as you buy them.**
