"""AI Teacher classroom routes."""

from __future__ import annotations

import uuid
from pathlib import Path

from flask import Blueprint, jsonify, request
from werkzeug.utils import secure_filename

from services.classroom_service import (
    InvalidPdfError,
    NotesNotFoundError,
    ask_notes_question,
    save_classroom_notes,
)

classroom_bp = Blueprint("classroom", __name__)

_BACKEND_DIR = Path(__file__).resolve().parent.parent
_TMP_DIR = _BACKEND_DIR / "tmp"


@classroom_bp.post("/upload")
def upload():
    """Accept a PDF upload, extract text, store notes, delete temp file."""
    temp_pdf_path: Path | None = None

    try:
        notes_id = request.form.get("notes_id")
        if notes_id is None or not isinstance(notes_id, str) or not notes_id.strip():
            return jsonify({"status": "error", "message": "notes_id is required"}), 400
        notes_id = notes_id.strip()

        if "file" not in request.files:
            return jsonify({"status": "error", "message": "PDF file is required"}), 400

        uploaded = request.files["file"]
        if uploaded is None or not uploaded.filename:
            return jsonify({"status": "error", "message": "PDF file is required"}), 400

        original_name = uploaded.filename
        if not original_name.lower().endswith(".pdf"):
            return (
                jsonify({"status": "error", "message": "only PDF files are allowed"}),
                400,
            )

        _TMP_DIR.mkdir(parents=True, exist_ok=True)
        safe_name = secure_filename(original_name) or "upload.pdf"
        temp_pdf_path = _TMP_DIR / f"{uuid.uuid4().hex}_{safe_name}"
        uploaded.save(str(temp_pdf_path))

        result = save_classroom_notes(notes_id, str(temp_pdf_path))
        return (
            jsonify(
                {
                    "status": "success",
                    "message": "notes uploaded successfully",
                    "notes_id": result["notes_id"],
                    "page_count": result["page_count"],
                    "text_length": result["text_length"],
                }
            ),
            201,
        )
    except InvalidPdfError:
        return (
            jsonify(
                {"status": "error", "message": "unable to extract text from PDF"}
            ),
            400,
        )
    except Exception as exc:
        return jsonify({"status": "error", "message": str(exc)}), 500
    finally:
        if temp_pdf_path is not None and temp_pdf_path.exists():
            temp_pdf_path.unlink()


@classroom_bp.post("/ask")
def ask():
    """Answer a question using uploaded classroom notes and Groq."""
    try:
        payload = request.get_json(silent=True)
        if not isinstance(payload, dict):
            return jsonify({"status": "error", "message": "JSON body is required"}), 400

        question = payload.get("question")
        if question is None or not isinstance(question, str) or not question.strip():
            return jsonify({"status": "error", "message": "question is required"}), 400
        question = question.strip()

        notes_id = payload.get("notes_id")
        if notes_id is None or not isinstance(notes_id, str) or not notes_id.strip():
            return jsonify({"status": "error", "message": "notes_id is required"}), 400
        notes_id = notes_id.strip()

        result = ask_notes_question(notes_id, question)
        return (
            jsonify(
                {
                    "status": "success",
                    "answer": result["answer"],
                    "source": result["source"],
                    "model": result["model"],
                }
            ),
            200,
        )
    except NotesNotFoundError:
        return jsonify({"status": "error", "message": "notes not found"}), 404
    except Exception as exc:
        return jsonify({"status": "error", "message": str(exc)}), 500

