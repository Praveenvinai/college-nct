"""Classroom / AI Teacher service."""

from __future__ import annotations

from datetime import datetime, timezone

from firebase_config import get_ref
from gemini_client import ask_groq
from pdf_extractor import extract_pdf_text


class InvalidPdfError(Exception):
    """Raised when PDF text extraction yields no usable text."""


class NotesNotFoundError(Exception):
    """Raised when classroom notes are missing in Firebase."""


def save_classroom_notes(notes_id: str, pdf_path: str) -> dict:
    """Extract text from a PDF and store notes metadata in Firebase."""
    try:
        extracted_text, page_count = extract_pdf_text(pdf_path)
    except Exception as exc:
        raise InvalidPdfError("unable to extract text from PDF") from exc

    if not extracted_text.strip():
        raise InvalidPdfError("unable to extract text from PDF")

    record = {
        "extracted_text": extracted_text,
        "uploaded_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "page_count": page_count,
    }
    get_ref(f"classroom_notes/{notes_id}").set(record)

    return {
        "notes_id": notes_id,
        "page_count": page_count,
        "text_length": len(extracted_text),
    }


def ask_notes_question(notes_id: str, question: str) -> dict:
    """Answer a student question using notes stored in Firebase + Groq."""
    data = get_ref(f"classroom_notes/{notes_id}").get()
    if data is None or not isinstance(data, dict):
        raise NotesNotFoundError("notes not found")

    notes_text = data.get("extracted_text", "")
    if not isinstance(notes_text, str) or not notes_text.strip():
        raise RuntimeError("classroom notes text is empty")

    answer = ask_groq(notes_text, question)
    return {
        "answer": answer,
        "source": notes_id,
        "model": "llama-3.1-8b-instant",
    }
