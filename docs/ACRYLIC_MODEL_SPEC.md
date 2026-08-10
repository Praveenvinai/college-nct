# 📐 Acrylic Model Specification — Simplified Build
## Gate Unit (1 barrier) + Store Unit (2 dispensing slots)

---

## 1. WHAT CHANGED (simplified from earlier 4-slot design)

- Store unit reduced from 4 dispensing slots to **2** — enough to prove the mechanism works without quadrupling the build risk
- Servo count reduced from 4 to **3 total** (1 for the gate barrier, 2 for the store slots)
- Both slots share **one output tray and one IR sensor** at the exit, rather than duplicating sensors per slot
- This is deliberately scoped to be buildable and reliable in your timeline, not to showcase every possible feature

---

## 2. CUT LIST — GATE UNIT

| Piece | Dimensions (W×H) | Qty | Material |
|---|---|---|---|
| Vertical panel | 150mm × 300mm | 1 | 4mm cast acrylic |
| Base plate | 180mm × 60mm | 1 | 4mm cast acrylic |
| LCD cutout (in panel) | 82mm × 38mm | 1 opening | — |
| RFID reader cutout (in panel) | 62mm × 41mm | 1 opening | — |
| Buzzer/LED hole (in panel) | 10mm diameter | 1 opening | — |

**Panel joins to base**: a simple slot-and-tab joint (a rectangular notch cut into the base that the panel's bottom edge slides into) is the easiest for a laser-cutting shop to include, and needs no separate hardware. If they don't offer that, a right-angle L-bracket + hot glue works fine too.

**Barrier arm**: not acrylic — this is the SG90 servo horn (comes with the servo) with a ~70mm thin acrylic or wooden strip glued/screwed onto it as the visible "arm." Ask the shop for one **10mm × 70mm strip** cut from scrap if they have offcuts — this is a trivial extra cut.

---

## 3. CUT LIST — STORE UNIT (2-slot)

| Piece | Dimensions (W×H) | Qty | Material |
|---|---|---|---|
| Cabinet front panel | 200mm × 300mm | 1 | 4mm cast acrylic |
| Base plate | 220mm × 60mm | 1 | 4mm cast acrylic |
| Side panels (optional, for a boxed look) | 200mm × 200mm | 2 | 4mm cast acrylic |
| OLED viewing window (in front panel) | 30mm × 14mm | 1 opening | — |
| Button holes (in front panel) | 12mm diameter, 55mm apart | 2 openings | — |
| Output chute opening (in front panel, near base) | 60mm × 25mm | 1 opening | — |

**Side panels are optional**: a front-panel-only "standee" build (like the Gate unit) works fine for a demo and is simpler/cheaper. Only add the two side panels if you want a fully boxed cabinet look — this roughly doubles the acrylic cost for this unit.

**Internal tubes for the 2 item slots**: these don't need to be precision laser-cut — the simplest approach is **two short lengths of PVC pipe or thick cardboard tube** (roughly 35-40mm diameter, ~120mm long) mounted vertically behind the front panel, one per item type. This is much easier than trying to laser-cut a tube shape from flat acrylic, and completely invisible to the audience since it's inside the cabinet.

---

## 4. MATERIAL SPECIFICATION

| Spec | Value | Why |
|---|---|---|
| Material | **Cast acrylic** (not extruded) | Cast acrylic laser-cuts with cleaner edges and is less prone to cracking — worth asking for specifically, extruded is cheaper but chips more easily at small cutouts |
| Thickness | **4mm** | Rigid enough to hold servo torque and component weight without needing internal bracing, still easy for a laser to cut cleanly |
| Color | Clear, or frosted white if you want a more "product" look | Clear is cheaper and shows the electronics through the panel, which can actually look more impressive at an expo ("look, real hardware") |
| Total sheet area needed | Roughly **1 sheet of 2ft × 2ft (600×600mm)**, sometimes sold as a standard small sheet | Covers both panels + both bases with room to spare; ask the shop if they sell smaller offcut sizes to avoid paying for a full large sheet |

---

## 5. TRICHY PURCHASE LIST

### From the acrylic/laser-cutting shop
- [ ] 1× acrylic sheet, 4mm cast acrylic, ~600×600mm (or shop's nearest standard offcut size)
- [ ] Laser cutting service for the 2 panels + 2 base plates + all cutouts listed above (bring/describe the cut list from Sections 2 & 3)
- [ ] Ask if they can also cut the 10mm × 70mm barrier arm strip from offcut scrap (usually free or near-free)
- [ ] *Optional*: 2× side panels for the store unit if going for a fully boxed look

### From a general hardware store (Palakkarai or similar, already on your Chennai/Trichy list)
- [ ] 2× short PVC pipe or thick cardboard tube sections, ~35-40mm diameter × 120mm long (for the 2 item-storage tubes inside the store unit) — a hardware or plumbing shop will have PVC offcuts cheaply, or repurpose a thick cardboard postal tube
- [ ] M3 screws + nylon standoffs (small pack) — for mounting the ESP32/NodeMCU boards onto the back of the panels (glue gun works too, but standoffs look tidier and are removable if you need to debug)

### Already on your Chennai list (no change needed)
- Glue gun + sticks — for mounting tubes, boards, and general assembly
- Acrylic paint / props — for finishing touches

---

## 6. ASSEMBLY SEQUENCE (once panels arrive)

1. Dry-fit the panel into the base slot — check it stands square before gluing anything
2. Mount LCD/RFID/OLED into their cutouts from the back, secured with hot glue around the edges
3. Mount the servo(s) behind their respective positions — the gate servo near the pivot point shown in the drawing, the store servos behind the internal tube area
4. Glue the item-storage tubes in place behind the store unit's front panel, aligned above the shared output chute
5. Wire everything (this happens on breadboard first, per the earlier build plan — don't solder into the panel until the breadboard version is proven stable)
6. Once wiring is confirmed working, mount the (soldered or breadboard) circuit board onto the panel back using the M3 standoffs or hot glue

---

## 7. UPDATED SERVO COUNT (affects your Chennai shopping list)

Previously budgeted for 4 servos (1 gate + up to 3 store slots). With the simplified 2-slot store:

| Unit | Servos needed |
|---|---|
| Gate barrier | 1 |
| Store — slot 1 | 1 |
| Store — slot 2 | 1 |
| **Total** | **3** (down from 4) |

This is a small saving (~₹110) on the Chennai list — see updated `SHOPPING_CHECKLIST.md`.
