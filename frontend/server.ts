import "dotenv/config";
import express from "express";
import path from "path";
import { Readable } from "stream";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { INITIAL_STUDENTS, INITIAL_STORE_ITEMS, INITIAL_PURCHASES } from "./src/mockData";
import { Student, StoreItem, PurchaseRecord, SupportTicket } from "./src/types";

// In-memory persistent database store
let studentsDb: Student[] = [...INITIAL_STUDENTS];
let storeDb: StoreItem[] = [...INITIAL_STORE_ITEMS];
let purchasesDb: PurchaseRecord[] = [...INITIAL_PURCHASES];
let ticketsDb: SupportTicket[] = [];

const AI_TUTOR_URL = (process.env.AI_TUTOR_URL || "http://127.0.0.1:8001").replace(/\/$/, "");
const BACKEND_URL = (
  process.env.BACKEND_URL || "https://college-nct-backend.onrender.com"
).replace(/\/$/, "");

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

  // Get all registered students
  app.get("/api/students", (_req, res) => {
    res.json({ students: studentsDb });
  });

  // Face Verification Endpoint
  app.post("/api/face/verify", (req, res) => {
    const { studentId, snapshotBase64, overrideMatch } = req.body;

    // Direct ID match or mock facial similarity computation
    let matchedStudent = studentsDb.find((s) => s.id === studentId);

    if (!matchedStudent && overrideMatch) {
      matchedStudent = studentsDb[0]; // Fallback default scholar
    }

    if (!matchedStudent && snapshotBase64) {
      // Simulate real-time biometric vector embedding calculation
      matchedStudent = studentsDb[0]; // Matches default primary enrolled student
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
      message: "Face biometric signature not recognized in National College database.",
    });
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

  // Vending Machine Store Catalog
  app.get("/api/store/items", (_req, res) => {
    res.json({ items: storeDb });
  });

  // Execute Vending Machine Purchase & IoT Stock Dispense
  app.post("/api/store/purchase", (req, res) => {
    const { studentId, itemId } = req.body;

    const student = studentsDb.find((s) => s.id === studentId);
    if (!student) {
      return res.status(404).json({ success: false, message: "Student record not found." });
    }

    const itemIndex = storeDb.findIndex((i) => i.id === itemId);
    if (itemIndex === -1) {
      return res.status(404).json({ success: false, message: "Store item not found in dispenser." });
    }

    const item = storeDb[itemIndex];

    if (item.stockCount <= 0) {
      return res.status(400).json({ success: false, message: "Item is currently out of stock." });
    }

    if (student.walletBalance < item.price) {
      return res.status(400).json({
        success: false,
        message: `Insufficient student wallet balance. Required: $${item.price.toFixed(2)}, Available: $${student.walletBalance.toFixed(2)}`,
      });
    }

    // Deduct student balance and update store item stock
    student.walletBalance -= item.price;
    item.stockCount -= 1;
    if (item.stockCount === 0) {
      item.badge = "Out of Stock";
    } else if (item.stockCount <= 3) {
      item.badge = "Low Stock";
    }

    // Create purchase transaction record
    const newRecord: PurchaseRecord = {
      id: `tx-${Math.floor(1000 + Math.random() * 9000)}`,
      studentId: student.id,
      studentName: student.name,
      itemId: item.id,
      itemName: item.name,
      price: item.price,
      timestamp: new Date().toLocaleString("en-US", { dateStyle: "short", timeStyle: "short" }),
      status: "Dispensed & Delivered",
      location: "Central Library Dispenser #04",
    };

    purchasesDb.unshift(newRecord);

    return res.json({
      success: true,
      updatedBalance: student.walletBalance,
      updatedItem: item,
      purchaseRecord: newRecord,
      message: `IoT Signal Sent! ${item.name} dispensed successfully.`,
    });
  });

  // Get Purchase History
  app.get("/api/store/history", (req, res) => {
    const { studentId } = req.query;
    if (studentId) {
      const studentHistory = purchasesDb.filter((p) => p.studentId === studentId);
      return res.json({ history: studentHistory });
    }
    return res.json({ history: purchasesDb });
  });

  // Proxy PDF upload → FastAPI RAG (/upload)
  app.post("/api/tutor/upload", async (req, res) => {
    try {
      const contentType = req.headers["content-type"];
      if (!contentType || !contentType.includes("multipart/form-data")) {
        return res.status(400).json({ error: "Expected multipart/form-data with a PDF file." });
      }

      const upstream = await fetch(`${AI_TUTOR_URL}/upload`, {
        method: "POST",
        headers: { "content-type": contentType },
        // Stream the raw multipart body through to FastAPI
        body: Readable.toWeb(req) as unknown as BodyInit,
        duplex: "half",
      } as RequestInit);

      const data = await upstream.json();
      if (!upstream.ok || data.error) {
        return res.status(upstream.ok ? 400 : upstream.status).json({
          error: data.error || "PDF upload failed on AI Tutor service.",
          details: data,
        });
      }

      return res.json({
        success: true,
        filename: data.filename,
        pages: data.pages,
        chunks: data.chunks,
        message: data.message,
        documents: data.documents || [],
      });
    } catch (err: unknown) {
      console.error("AI Tutor upload proxy error:", err);
      const errorMsg = err instanceof Error ? err.message : String(err);
      return res.status(502).json({
        error: `AI Tutor service unreachable at ${AI_TUTOR_URL}. Is rag.py running?`,
        details: errorMsg,
      });
    }
  });

  // Clear RAG knowledge base on FastAPI
  app.delete("/api/tutor/docs", async (_req, res) => {
    try {
      const upstream = await fetch(`${AI_TUTOR_URL}/knowledge-base`, { method: "DELETE" });
      const data = await upstream.json();
      return res.json(data);
    } catch (err: unknown) {
      console.error("AI Tutor clear-docs proxy error:", err);
      return res.status(502).json({
        error: `AI Tutor service unreachable at ${AI_TUTOR_URL}.`,
      });
    }
  });

  // AI Tutor chat → FastAPI RAG (/chat), Gemini fallback if RAG is down
  app.post("/api/tutor/chat", async (req, res) => {
    const { prompt, pdfContexts, history, filenames } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required." });
    }

    const activeFilenames: string[] =
      Array.isArray(filenames) && filenames.length > 0
        ? filenames
        : Array.isArray(pdfContexts)
          ? pdfContexts.map((d: { name: string }) => d.name).filter(Boolean)
          : [];

    let question = prompt;
    if (history && Array.isArray(history) && history.length > 0) {
      const formattedHistory = history
        .slice(-6)
        .map((msg: { sender: string; text: string }) => `${msg.sender.toUpperCase()}: ${msg.text}`)
        .join("\n");
      question = `Prior Conversation History:\n${formattedHistory}\n\nStudent Current Question: ${prompt}`;
    }

    try {
      const upstream = await fetch(`${AI_TUTOR_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          filenames: activeFilenames.length > 0 ? activeFilenames : null,
        }),
      });

      if (upstream.ok) {
        const data = await upstream.json();
        const cited =
          Array.isArray(data.activeDocs) && data.activeDocs.length > 0
            ? data.activeDocs
            : activeFilenames;

        return res.json({
          text: data.answer,
          pdfUsed: data.source === "uploaded_document",
          activeDocs: cited,
          source: data.source,
          retrieved_pages: data.retrieved_pages || [],
        });
      }

      console.warn("AI Tutor RAG returned non-OK status:", upstream.status);
    } catch (err: unknown) {
      console.error("AI Tutor RAG proxy error:", err);
    }

    // Optional Gemini fallback when FastAPI is offline
    if (process.env.GEMINI_API_KEY) {
      try {
        const aiClient = getGeminiClient();
        let systemInstruction = `You are "Professor Cybera", National College's elite AI Voice Tutor.
Explain academic concepts clearly with structure, examples, and mentorship.`;

        if (Array.isArray(pdfContexts) && pdfContexts.length > 0) {
          const compiled = pdfContexts
            .map(
              (doc: { name: string; contentSnippet?: string; pages?: number }, idx: number) =>
                `=== DOCUMENT #${idx + 1}: "${doc.name}" ===\n${(doc.contentSnippet || "").substring(0, 4000)}`
            )
            .join("\n\n");
          systemInstruction += `\n\nCourse materials:\n${compiled.substring(0, 16000)}`;
        }

        const response = await aiClient.models.generateContent({
          model: "gemini-2.0-flash",
          contents: question,
          config: { systemInstruction, temperature: 0.7 },
        });

        return res.json({
          text: response.text || "I analyzed your query. How else can I help?",
          pdfUsed: activeFilenames.length > 0,
          activeDocs: activeFilenames,
          source: "gemini_fallback",
        });
      } catch (geminiErr) {
        console.error("Gemini fallback error:", geminiErr);
      }
    }

    return res.status(502).json({
      error: `AI Tutor RAG service is unreachable at ${AI_TUTOR_URL}. Start it with: python ai-tutor/rag/rag.py`,
      text: null,
    });
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
