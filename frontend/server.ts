import "dotenv/config";
import express from "express";
import path from "path";
import { Readable } from "stream";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { INITIAL_STUDENTS } from "./src/mockData";
import { Student, StoreItem, SupportTicket } from "./src/types";

// In-memory persistent database store.
// The Smart Store no longer keeps state here: inventory, purchases and history
// are owned by Flask/Firebase and proxied through this BFF.
let studentsDb: Student[] = [...INITIAL_STUDENTS];
let ticketsDb: SupportTicket[] = [];

const BACKEND_URL = (
  process.env.BACKEND_URL || "https://college-nct-backend.onrender.com"
).replace(/\/$/, "");

function flaskErrorMessage(data: unknown, fallback: string): string {
  if (data && typeof data === "object") {
    const rec = data as Record<string, unknown>;
    if (typeof rec.message === "string" && rec.message.trim()) return rec.message;
    if (typeof rec.error === "string" && rec.error.trim()) return rec.error;
  }
  return fallback;
}

function parseOptionalStudentId(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/** Map one Flask/Firebase student row into the portal Student shape. */
function mapLiveBackendStudent(row: Record<string, unknown>): Student | null {
  const studentId =
    typeof row.student_id === "string" ? row.student_id.trim() : "";
  const name = typeof row.name === "string" ? row.name : "";
  const department = typeof row.department === "string" ? row.department : "";
  if (!studentId) return null;

  return {
    id: studentId,
    name,
    rollNumber: studentId,
    department,
    year: "",
    gpa: 0,
    attendance: 0,
    walletBalance: 0,
    photoUrl: "",
    faceEmbeddingHash: "",
    email: "",
    bio: "",
    enrolledCourses: [],
    achievements: [],
  };
}

/**
 * Fetch live students from Flask.
 * Returns null when the backend is unreachable / invalid (caller may fall back).
 * Returns [] when the backend responds but has no mappable students.
 */
async function fetchLiveStudents(): Promise<Student[] | null> {
  try {
    const upstream = await fetch(`${BACKEND_URL}/api/students`, {
      method: "GET",
      signal: AbortSignal.timeout(15000),
    });
    if (!upstream.ok) return null;

    const data = await upstream.json().catch(() => null);
    if (
      !data ||
      typeof data !== "object" ||
      !Array.isArray((data as { students?: unknown }).students)
    ) {
      return null;
    }

    const mapped: Student[] = [];
    for (const row of (data as { students: unknown[] }).students) {
      if (!row || typeof row !== "object") continue;
      const student = mapLiveBackendStudent(row as Record<string, unknown>);
      if (student) mapped.push(student);
    }
    return mapped;
  } catch {
    return null;
  }
}

const STORE_ITEM_PRESENTATION: Record<
  string,
  { description: string; imageUrl: string }
> = {
  slot_1: {
    description: "Gel pen loaded in physical dispenser slot 1.",
    imageUrl:
      "https://images.unsplash.com/photo-1513666639414-f795d25747a8?auto=format&fit=crop&w=600&q=80",
  },
  slot_2: {
    description: "Pencil loaded in physical dispenser slot 2.",
    imageUrl:
      "https://images.unsplash.com/photo-1644004680400-b9425e4efa18?auto=format&fit=crop&w=600&q=80",
  },
  slot_3: {
    description: "Color pencil loaded in physical dispenser slot 3.",
    imageUrl:
      "https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=600&q=80",
  },
};

/** Map one Flask/Firebase inventory slot into the portal StoreItem shape. */
function mapLiveInventorySlot(row: Record<string, unknown>): StoreItem | null {
  const itemSlot =
    typeof row.item_slot === "string" ? row.item_slot.trim() : "";
  const itemName = typeof row.item === "string" ? row.item.trim() : "";
  const price =
    typeof row.price === "number" && Number.isFinite(row.price)
      ? row.price
      : null;
  const stock =
    typeof row.stock === "number" && Number.isFinite(row.stock)
      ? Math.max(0, Math.trunc(row.stock))
      : null;

  if (!itemSlot || !itemName || price === null || price < 0 || stock === null) {
    return null;
  }

  const dispenserSlot =
    typeof row.dispenser_slot === "number" &&
    Number.isFinite(row.dispenser_slot)
      ? Math.trunc(row.dispenser_slot)
      : null;
  const presentation = STORE_ITEM_PRESENTATION[itemSlot];
  const slotLabel = dispenserSlot === null ? itemSlot : `${dispenserSlot}`;

  return {
    id: itemSlot,
    itemSlot,
    dispenserSlot,
    name: itemName,
    price,
    stockCount: stock,
    maxStock: Math.max(stock, 500),
    category: "stationery",
    description:
      presentation?.description ??
      `${itemName} loaded in physical dispenser slot ${slotLabel}.`,
    imageUrl:
      presentation?.imageUrl ??
      "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=600&q=80",
    badge:
      stock === 0 ? "Out of Stock" : stock <= 3 ? "Low Stock" : "In Stock",
  };
}

/**
 * Fetch live physical inventory through Flask.
 * Returns null when the backend response is unavailable or malformed.
 */
async function fetchLiveStoreItems(): Promise<StoreItem[] | null> {
  try {
    const upstream = await fetch(`${BACKEND_URL}/api/store/inventory`, {
      method: "GET",
      signal: AbortSignal.timeout(15000),
    });
    if (!upstream.ok) return null;

    const data = await upstream.json().catch(() => null);
    if (
      !data ||
      typeof data !== "object" ||
      !Array.isArray((data as { inventory?: unknown }).inventory)
    ) {
      return null;
    }

    const mapped: StoreItem[] = [];
    for (const row of (data as { inventory: unknown[] }).inventory) {
      if (!row || typeof row !== "object") continue;
      const item = mapLiveInventorySlot(row as Record<string, unknown>);
      if (item) mapped.push(item);
    }
    return mapped;
  } catch {
    return null;
  }
}

/**
 * Forward a Smart Store request to Flask and pass the response straight
 * through. Flask owns purchase state, so this BFF adds no store state of its
 * own and never rewrites the upstream status code.
 */
async function proxyStoreRequest(
  res: express.Response,
  apiPath: string,
  init?: { method?: "GET" | "POST"; body?: unknown }
) {
  const method = init?.method ?? "GET";
  try {
    const upstream = await fetch(`${BACKEND_URL}${apiPath}`, {
      method,
      headers: method === "POST" ? { "Content-Type": "application/json" } : undefined,
      body: method === "POST" ? JSON.stringify(init?.body ?? {}) : undefined,
      signal: AbortSignal.timeout(15000),
    });

    const data = await upstream.json().catch(() => null);
    if (data === null) {
      return res.status(502).json({
        status: "error",
        message: "Smart Store backend returned an invalid response.",
      });
    }
    return res.status(upstream.status).json(data);
  } catch {
    return res.status(503).json({
      status: "error",
      message: "Smart Store service is unavailable. Please try again.",
    });
  }
}

async function proxyLogList(
  res: express.Response,
  apiPath: "/api/attendance" | "/api/gate-logs",
  studentId: string | undefined
) {
  const empty: Record<string, unknown> = {
    count: 0,
    entries: [],
  };
  if (studentId) {
    empty.student_id = studentId;
  }

  try {
    const url = new URL(`${BACKEND_URL}${apiPath}`);
    if (studentId) {
      url.searchParams.set("student_id", studentId);
    }

    const upstream = await fetch(url.toString(), {
      method: "GET",
      signal: AbortSignal.timeout(15000),
    });
    if (!upstream.ok) {
      return res.json(empty);
    }

    const data = await upstream.json().catch(() => null);
    if (
      !data ||
      typeof data !== "object" ||
      !Array.isArray((data as { entries?: unknown }).entries)
    ) {
      return res.json(empty);
    }

    const entries = (data as { entries: unknown[] }).entries;
    const count =
      typeof (data as { count?: unknown }).count === "number"
        ? (data as { count: number }).count
        : entries.length;

    const payload: Record<string, unknown> = { count, entries };
    if (studentId) {
      payload.student_id = studentId;
    } else if (typeof (data as { student_id?: unknown }).student_id === "string") {
      payload.student_id = (data as { student_id: string }).student_id;
    }
    return res.json(payload);
  } catch {
    return res.json(empty);
  }
}

// Gemini AI client (optional TTS / legacy fallback)
const getGeminiClient = () => {
  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY || "DUMMY_KEY",
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));

  // ===================== API ROUTES =====================

  // Health check
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", institution: "National College Portal", timestamp: new Date().toISOString() });
  });

  // Diagnostic: probe deployed Flask backend (does not replace mock APIs)
  app.get("/api/backend-health", async (_req, res) => {
    try {
      const upstream = await fetch(`${BACKEND_URL}/api/health`, {
        method: "GET",
        signal: AbortSignal.timeout(15000),
      });
      const data = await upstream.json().catch(() => null);
      if (!upstream.ok) {
        return res.status(upstream.status).json({
          status: "error",
          backend_url: BACKEND_URL,
          message: `Render backend returned HTTP ${upstream.status}`,
          upstream: data,
        });
      }
      return res.json({
        status: "ok",
        backend_url: BACKEND_URL,
        upstream: data,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      return res.status(502).json({
        status: "error",
        backend_url: BACKEND_URL,
        message: `Cannot reach Render backend at ${BACKEND_URL}/api/health`,
        detail: message,
      });
    }
  });

  // Get all registered students (live from Flask when available; mock fallback)
  app.get("/api/students", async (_req, res) => {
    const live = await fetchLiveStudents();
    if (live && live.length > 0) {
      return res.json({ students: live });
    }
    return res.json({ students: studentsDb });
  });

  // Read-only proxy: attendance_log via Flask backend
  app.get("/api/attendance", async (req, res) => {
    const studentId = parseOptionalStudentId(req.query.student_id);
    return proxyLogList(res, "/api/attendance", studentId);
  });

  // Read-only proxy: gate_log via Flask backend
  app.get("/api/gate-logs", async (req, res) => {
    const studentId = parseOptionalStudentId(req.query.student_id);
    return proxyLogList(res, "/api/gate-logs", studentId);
  });

  // Browser camera face match — Flask match-image (read-only), then one browser-attendance write (never /recognize)
  app.post("/api/face/verify-image", async (req, res) => {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const rawSnapshot = (body as { snapshotBase64?: unknown }).snapshotBase64;
    const snapshotBase64 =
      typeof rawSnapshot === "string" ? rawSnapshot.trim() : "";

    if (!snapshotBase64) {
      return res.status(400).json({
        success: false,
        code: "invalid_image",
        message: "Could not capture image. Retry camera.",
      });
    }

    try {
      const upstream = await fetch(`${BACKEND_URL}/api/face/match-image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_base64: snapshotBase64, tolerance: 0.6 }),
        signal: AbortSignal.timeout(60000),
      });

      const data = await upstream.json().catch(() => null);
      if (!data || typeof data !== "object") {
        return res.status(502).json({
          success: false,
          code: "backend_unavailable",
          message: "Face service unavailable. Check backend connection.",
        });
      }

      const matched = (data as { matched?: unknown }).matched === true;
      const studentId =
        typeof (data as { student_id?: unknown }).student_id === "string"
          ? (data as { student_id: string }).student_id.trim()
          : typeof (data as { id?: unknown }).id === "string"
            ? (data as { id: string }).id.trim()
            : "";
      const personName =
        typeof (data as { name?: unknown }).name === "string"
          ? (data as { name: string }).name.trim()
          : typeof (data as { student_name?: unknown }).student_name === "string"
            ? (data as { student_name: string }).student_name.trim()
            : "";
  const role =
    typeof (data as { role?: unknown }).role === "string"
      ? (data as { role: string }).role.trim()
      : "";
  const normalizedRole = role === "staff" || role === "student" ? role : "";
      const department =
        typeof (data as { department?: unknown }).department === "string"
          ? (data as { department: string }).department.trim()
          : "";
      const confidence =
        typeof (data as { confidence?: unknown }).confidence === "number"
          ? (data as { confidence: number }).confidence
          : undefined;
      const upstreamMessage =
        typeof (data as { message?: unknown }).message === "string"
          ? (data as { message: string }).message
          : undefined;
      const upstreamCode =
        typeof (data as { code?: unknown }).code === "string"
          ? (data as { code: string }).code
          : undefined;

      if (!upstream.ok || !matched || !studentId) {
        const status =
          upstream.status === 401 || upstream.status === 400
            ? upstream.status
            : upstream.status >= 500
              ? 502
              : upstream.status || 401;

        const codeMap: Record<string, string> = {
          no_face: "No face detected. Center your face in the frame and try again.",
          multiple_faces:
            "Multiple faces detected. Only one person should be in frame.",
          no_match:
            "Face not recognized. Please try again.",
          invalid_image: "Could not capture image. Retry camera.",
          encodings_unavailable:
            "Face service unavailable. Check backend connection.",
        };

        return res.status(status >= 400 && status < 600 ? status : 401).json({
          success: false,
          code: upstreamCode || "no_match",
          message:
            upstreamMessage ||
            (upstreamCode && codeMap[upstreamCode]) ||
            "Face service unavailable. Check backend connection.",
        });
      }

      const live = await fetchLiveStudents();
      const liveAvailable = live !== null && live.length > 0;
      const pool = liveAvailable ? live! : studentsDb;
      let matchedStudent = pool.find((s) => s.id === studentId) ?? null;

      if (!matchedStudent) {
        matchedStudent = mapLiveBackendStudent({
          student_id: studentId,
          name: personName,
          department,
        });
      }

      if (!matchedStudent) {
        return res.status(401).json({
          success: false,
          code: "no_match",
          message: "Face not recognized. Please try again.",
        });
      }

      if (normalizedRole) {
        matchedStudent = {
          ...matchedStudent,
          role: normalizedRole,
          ...(department ? { department } : {}),
        };
      }

      let attendance: {
        recorded: boolean;
        source: string;
        duplicate?: boolean;
      } = {
        recorded: false,
        source: "browser_face",
      };

      if (normalizedRole !== "staff") {
        try {
          const attRes = await fetch(`${BACKEND_URL}/api/face/browser-attendance`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              student_id: studentId,
              confidence: confidence ?? 0,
            }),
            signal: AbortSignal.timeout(15000),
          });
          const attData = await attRes.json().catch(() => null);
          if (attData && typeof attData === "object") {
            const recorded = (attData as { recorded?: unknown }).recorded === true;
            const duplicate = (attData as { duplicate?: unknown }).duplicate === true;
            attendance = {
              recorded,
              source: "browser_face",
              ...(duplicate ? { duplicate: true } : {}),
            };
          }
        } catch {
          // Match already succeeded — do not block portal session if attendance write fails.
        }
      }

      return res.json({
        success: true,
        student: matchedStudent,
        confidence: confidence ?? 0,
        matchDescriptor: matchedStudent.faceEmbeddingHash,
        attendance,
        message: attendance.recorded
          ? "Face recognized and attendance recorded."
          : "Biometric face verification successful. Access granted.",
      });
    } catch {
      return res.status(502).json({
        success: false,
        code: "backend_unavailable",
        message: "Face service unavailable. Check backend connection.",
      });
    }
  });

  // Face Verification Endpoint — resolves against LIVE Flask students (no image ML; no attendance write)
  app.post("/api/face/verify", async (req, res) => {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const rawStudentId = (body as { studentId?: unknown }).studentId;
    const studentId =
      typeof rawStudentId === "string" ? rawStudentId.trim() : "";
    const snapshotBase64 = (body as { snapshotBase64?: unknown }).snapshotBase64;
    const overrideMatch = (body as { overrideMatch?: unknown }).overrideMatch;

    const live = await fetchLiveStudents();
    const liveAvailable = live !== null && live.length > 0;
    const pool = liveAvailable ? live! : studentsDb;

    let matchedStudent: Student | undefined;

    if (studentId) {
      matchedStudent = pool.find((s) => s.id === studentId);
      if (!matchedStudent) {
        return res.status(401).json({
          success: false,
          message: "Student record not found.",
        });
      }
    } else if (overrideMatch || snapshotBase64) {
      // Mock-path fallback: first LIVE student when backend is up; else in-memory seed
      matchedStudent = pool[0];
    }

    if (matchedStudent) {
      return res.json({
        success: true,
        student: matchedStudent,
        confidence: 0.984,
        matchDescriptor: matchedStudent.faceEmbeddingHash,
        message: "Biometric face verification successful. Access granted.",
      });
    }

    return res.status(401).json({
      success: false,
      message: "Student record not found.",
    });
  });

  // Latest gate face check-in — READ ONLY; never writes attendance / never calls /recognize
  const FACE_CHECKIN_FRESHNESS_MS = 60_000;

  app.get("/api/face/latest-checkin", async (_req, res) => {
    try {
      const upstream = await fetch(`${BACKEND_URL}/api/attendance`, {
        method: "GET",
        signal: AbortSignal.timeout(15000),
      });
      if (!upstream.ok) {
        return res.status(502).json({
          success: false,
          message:
            "Cannot reach attendance service. Check that the backend is running.",
          code: "backend_unavailable",
        });
      }

      const data = await upstream.json().catch(() => null);
      if (
        !data ||
        typeof data !== "object" ||
        !Array.isArray((data as { entries?: unknown }).entries)
      ) {
        return res.status(502).json({
          success: false,
          message:
            "Cannot reach attendance service. Check that the backend is running.",
          code: "backend_unavailable",
        });
      }

      const entries = (data as { entries: Record<string, unknown>[] }).entries;

      if (entries.length === 0) {
        return res.status(404).json({
          success: false,
          message:
            "No gate face recognition found. Please perform a face scan at the gate first.",
          code: "no_records",
        });
      }

      // Flask already returns newest timestamp first; preserve that order when filtering
      const faceEntries = entries.filter(
        (e) =>
          e &&
          typeof e === "object" &&
          typeof e.source === "string" &&
          e.source === "face_recognition"
      );

      if (faceEntries.length === 0) {
        return res.status(404).json({
          success: false,
          message:
            "No recent face recognition found. Please perform a face scan at the gate first.",
          code: "no_face_entries",
        });
      }

      const newest = faceEntries[0];
      const studentId =
        typeof newest.student_id === "string" ? newest.student_id.trim() : "";
      if (!studentId) {
        return res.status(404).json({
          success: false,
          message: "No recent gate face recognition found.",
          code: "missing_student_id",
        });
      }

      const timestamp =
        typeof newest.timestamp === "string" ? newest.timestamp : "";
      const parsedMs = Date.parse(timestamp);
      if (!Number.isFinite(parsedMs)) {
        return res.status(404).json({
          success: false,
          message: "No recent gate face recognition found.",
          code: "invalid_timestamp",
        });
      }

      const ageMs = Date.now() - parsedMs;
      if (ageMs > FACE_CHECKIN_FRESHNESS_MS) {
        return res.status(410).json({
          success: false,
          message:
            "The latest gate recognition has expired. Please scan your face at the gate again.",
          code: "expired",
        });
      }

      return res.json({
        success: true,
        entry: {
          id: typeof newest.id === "string" ? newest.id : "",
          student_id: studentId,
          student_name:
            typeof newest.student_name === "string" ? newest.student_name : "",
          confidence:
            typeof newest.confidence === "number" ? newest.confidence : 0,
          timestamp,
          source: "face_recognition",
        },
      });
    } catch {
      return res.status(502).json({
        success: false,
        message:
          "Cannot reach attendance service. Check that the backend is running.",
        code: "backend_unavailable",
      });
    }
  });

  // Face Enrollment Endpoint
  app.post("/api/face/enroll", (req, res) => {
    const { name, rollNumber, department, year, email, snapshotBase64 } = req.body;

    if (!name || !email) {
      return res.status(400).json({ success: false, message: "Missing student name or institutional email." });
    }

    const newStudent: Student = {
      id: `NC-2026-${Math.floor(100 + Math.random() * 900)}`,
      name,
      rollNumber: rollNumber || `NC-${Math.floor(1000 + Math.random() * 9000)}`,
      department: department || "School of Computer Science & AI",
      year: year || "Freshman (Year 1)",
      gpa: 4.0,
      attendance: 100.0,
      walletBalance: 100.0, // Complimentary welcome wallet balance
      photoUrl: snapshotBase64 || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80",
      faceEmbeddingHash: `0x${Math.random().toString(16).substring(2, 12)}`,
      email,
      bio: "Newly enrolled student at National College.",
      enrolledCourses: ["CS101: Intro to AI & Computation", 'MA101: Advanced Calculus'],
      achievements: ['Biometric Face Enrolled 2026'],
    };

    studentsDb.unshift(newStudent);

    return res.json({
      success: true,
      student: newStudent,
      message: "Student facial embedding registered securely in National College biometric vault.",
    });
  });

  // Live physical vending-machine inventory (Express → Flask → Firebase)
  app.get("/api/store/items", async (_req, res) => {
    const items = await fetchLiveStoreItems();
    if (items === null) {
      return res.status(503).json({
        items: [],
        source: "unavailable",
        message: "Live store inventory is currently unavailable.",
      });
    }
    return res.json({ items, source: "firebase" });
  });

  // Resolve an RFID card to a store user (Express → Flask → Firebase).
  // Read-only: it does not touch the RFID gate, gate logs or attendance.
  app.post("/api/store/identify", async (req, res) => {
    const body = req.body ?? {};
    return proxyStoreRequest(res, "/api/store/identify", {
      method: "POST",
      body: { card_uid: body.card_uid },
    });
  });

  // Create a purchase + physical dispense transaction (Express → Flask → Firebase).
  // Only the identifiers are forwarded; Flask resolves role, item, price,
  // dispenser slot and stock from Firebase.
  app.post("/api/store/purchase", async (req, res) => {
    const body = req.body ?? {};
    return proxyStoreRequest(res, "/api/store/purchase", {
      method: "POST",
      body: {
        user_id: body.user_id,
        item_slot: body.item_slot,
        idempotency_key: body.idempotency_key,
      },
    });
  });

  // Poll one purchase transaction's state.
  app.get("/api/store/purchase/:transactionId", async (req, res) => {
    const transactionId = String(req.params.transactionId ?? "").trim();
    if (!transactionId) {
      return res.status(400).json({ status: "error", message: "transaction_id is required" });
    }
    return proxyStoreRequest(
      res,
      `/api/store/purchase/${encodeURIComponent(transactionId)}`
    );
  });

  // Purchase history for one user. user_id is required upstream, so a caller
  // cannot read another user's purchases.
  app.get("/api/store/history", async (req, res) => {
    const userId = typeof req.query.user_id === "string" ? req.query.user_id.trim() : "";
    if (!userId) {
      return res.status(400).json({ status: "error", message: "user_id is required" });
    }
    const query = new URLSearchParams({ user_id: userId });
    return proxyStoreRequest(res, `/api/store/history?${query.toString()}`);
  });

  // Overall store_sales_log, including student-less manual button rows.
  app.get("/api/store/sales", async (req, res) => {
    const query = new URLSearchParams();
    const limit = typeof req.query.limit === "string" ? req.query.limit.trim() : "";
    if (limit) {
      query.set("limit", limit);
    }
    const suffix = query.toString() ? `?${query.toString()}` : "";
    return proxyStoreRequest(res, `/api/store/sales${suffix}`);
  });

  // Proxy PDF upload → Flask classroom notes (pdfplumber + Firebase text)
  app.post("/api/tutor/upload", async (req, res) => {
    try {
      const contentType = req.headers["content-type"];
      if (!contentType || !contentType.includes("multipart/form-data")) {
        return res.status(400).json({ error: "Expected multipart/form-data with a PDF file." });
      }

      const upstream = await fetch(`${BACKEND_URL}/api/classroom/upload`, {
        method: "POST",
        headers: { "content-type": contentType },
        body: Readable.toWeb(req) as unknown as BodyInit,
        duplex: "half",
      } as RequestInit);

      const data = await upstream.json().catch(() => null);
      if (!upstream.ok || !data || data.status === "error") {
        const status = upstream.status >= 400 ? upstream.status : 400;
        return res.status(status).json({
          error: flaskErrorMessage(data, "PDF upload failed on classroom service."),
          details: data,
        });
      }

      return res.json({
        success: true,
        notes_id: data.notes_id,
        pages: data.page_count,
        text_length: data.text_length,
        message: data.message,
      });
    } catch (err: unknown) {
      console.error("AI Tutor upload proxy error:", err);
      const errorMsg = err instanceof Error ? err.message : String(err);
      return res.status(502).json({
        error: `Classroom AI Tutor is unreachable at ${BACKEND_URL}. Is Flask running?`,
        details: errorMsg,
      });
    }
  });

  // Clear portal PDF library only. Flask has no delete-notes route; Firebase text stays.
  app.delete("/api/tutor/docs", async (_req, res) => {
    return res.json({
      message: "Portal notes library cleared. Classroom notes in Firebase are unchanged.",
      documents: [],
    });
  });

  // AI Tutor chat → Flask classroom ask (Groq openai/gpt-oss-20b)
  app.post("/api/tutor/chat", async (req, res) => {
    const { prompt, notes_id: notesIdRaw, question: questionRaw } = req.body ?? {};

    const question =
      typeof prompt === "string" && prompt.trim()
        ? prompt.trim()
        : typeof questionRaw === "string" && questionRaw.trim()
          ? questionRaw.trim()
          : "";

    if (!question) {
      return res.status(400).json({ error: "Prompt is required." });
    }

    const notes_id =
      typeof notesIdRaw === "string" && notesIdRaw.trim() ? notesIdRaw.trim() : "";

    if (!notes_id) {
      return res.status(400).json({
        error: "notes_id is required. Upload a classroom PDF first.",
      });
    }

    try {
      const upstream = await fetch(`${BACKEND_URL}/api/classroom/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, notes_id }),
      });

      const data = await upstream.json().catch(() => null);
      if (!upstream.ok || !data || data.status === "error") {
        const status = upstream.status >= 400 ? upstream.status : 502;
        return res.status(status).json({
          error: flaskErrorMessage(data, "Classroom ask failed."),
          text: null,
        });
      }

      const answer = typeof data.answer === "string" ? data.answer : "";
      const source = typeof data.source === "string" ? data.source : notes_id;

      return res.json({
        text: answer,
        pdfUsed: true,
        activeDocs: source ? [source] : [],
        source,
        model: data.model || "openai/gpt-oss-20b",
      });
    } catch (err: unknown) {
      console.error("AI Tutor classroom proxy error:", err);
      return res.status(502).json({
        error: `Classroom AI Tutor is unreachable at ${BACKEND_URL}. Is Flask running?`,
        text: null,
      });
    }
  });

  // AI Tutor Text-To-Speech Generation Route
  app.post("/api/tutor/tts", async (req, res) => {
    try {
      const { text } = req.body;
      if (!text) {
        return res.status(400).json({ error: "Text is required for speech synthesis." });
      }

      const aiClient = getGeminiClient();

      // Clean text snippet for audio speech
      const cleanedText = text.replace(/[*_#`~]/g, "").substring(0, 400);

      const response = await aiClient.models.generateContent({
        model: "gemini-3.1-flash-tts-preview",
        contents: [{ parts: [{ text: `Say in a warm, articulate, academic voice: ${cleanedText}` }] }],
        config: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: "Kore" },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

      if (base64Audio) {
        return res.json({ audioBase64: base64Audio });
      }

      return res.json({ audioBase64: null });
    } catch (err) {
      console.error("TTS Generation error:", err);
      return res.json({ audioBase64: null });
    }
  });

  // Support Ticket submission
  app.post("/api/support", (req, res) => {
    const { name, email, subject, category, message } = req.body;
    const ticket: SupportTicket = {
      id: `TICKET-${Math.floor(1000 + Math.random() * 9000)}`,
      name: name || "Anonymous Scholar",
      email: email || "student@national.edu",
      subject: subject || "General Inquiry",
      category: category || "Academic",
      message: message || "",
      createdAt: new Date().toLocaleString(),
      status: "Submitted",
    };
    ticketsDb.unshift(ticket);
    return res.json({ success: true, ticket });
  });

  // ======================================================

  // Vite middleware setup for development vs production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[National College Portal Server] Running on http://localhost:${PORT}`);
  });
}

startServer();
