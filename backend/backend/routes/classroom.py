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

# Allowed extensions (lower-case)
_ALLOWED_EXTS = {".pdf", ".pptx"}


@classroom_bp.post("/upload")
def upload():
    """Accept a PDF or PPTX upload, extract content, store notes, delete temp file."""
    temp_path: Path | None = None

    try:
        notes_id = request.form.get("notes_id")
        if not (isinstance(notes_id, str) and notes_id.strip()):
            return jsonify({"status": "error", "message": "notes_id is required"}), 400
        notes_id = notes_id.strip()

        if "file" not in request.files:
            return jsonify({"status": "error", "message": "A PDF or PPTX file is required"}), 400

        uploaded = request.files["file"]
        if not uploaded or not uploaded.filename:
            return jsonify({"status": "error", "message": "A PDF or PPTX file is required"}), 400

        original_name: str = uploaded.filename
        ext = Path(original_name).suffix.lower()

        # Explicitly reject old .ppt binary format
        if ext == ".ppt":
            return jsonify({
                "status": "error",
                "message": (
                    "The old .ppt format is not supported. "
                    "Please re-save the file as .pptx (PowerPoint 2007+) and try again."
                ),
            }), 400

        if ext not in _ALLOWED_EXTS:
            return jsonify({
                "status": "error",
                "message": "Only PDF and PPTX files are supported.",
            }), 400

        _TMP_DIR.mkdir(parents=True, exist_ok=True)
        safe_name = secure_filename(original_name) or f"upload{ext}"
        temp_path = _TMP_DIR / f"{uuid.uuid4().hex}_{safe_name}"
        uploaded.save(str(temp_path))

        result = save_classroom_notes(notes_id, str(temp_path), original_name)

        response_body: dict = {
            "status": "success",
            "message": "notes uploaded successfully",
            "notes_id": result["notes_id"],
            "page_count": result["page_count"],
            "text_length": result["text_length"],
        }
        if result.get("summary"):
            response_body["summary"] = result["summary"]
        if result.get("figure"):
            response_body["figure"] = result["figure"]

        return jsonify(response_body), 201

    except InvalidPdfError as exc:
        return jsonify({"status": "error", "message": str(exc)}), 400
    except Exception as exc:
        return jsonify({"status": "error", "message": str(exc)}), 500
    finally:
        if temp_path is not None and temp_path.exists():
            temp_path.unlink()


@classroom_bp.post("/ask")
def ask():
    """Answer a question using uploaded classroom notes and Groq."""
    try:
        payload = request.get_json(silent=True)
        if not isinstance(payload, dict):
            return jsonify({"status": "error", "message": "JSON body is required"}), 400

        question = payload.get("question")
        if not (isinstance(question, str) and question.strip()):
            return jsonify({"status": "error", "message": "question is required"}), 400
        question = question.strip()

        notes_id = payload.get("notes_id")
        if not (isinstance(notes_id, str) and notes_id.strip()):
            return jsonify({"status": "error", "message": "notes_id is required"}), 400
        notes_id = notes_id.strip()

        result = ask_notes_question(notes_id, question)

        # Base response (unchanged existing fields)
        response: dict = {
            "status": "success",
            "answer": result["answer"],
            "source": result["source"],
            "model": result["model"],
        }
        # Optional new fields — only present when slide was identified
        if result.get("slide_num") is not None:
            response["slide_num"] = result["slide_num"]
        if result.get("slide_image_base64"):
            response["slide_image_base64"] = result["slide_image_base64"]

        return jsonify(response), 200

    except NotesNotFoundError:
        return jsonify({"status": "error", "message": "notes not found"}), 404
    except Exception as exc:
        return jsonify({"status": "error", "message": str(exc)}), 500


