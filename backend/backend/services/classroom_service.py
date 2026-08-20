"""Classroom / AI Teacher service."""

from __future__ import annotations

from datetime import datetime, timezone

from firebase_config import get_ref
from gemini_client import GROQ_MODEL, ask_groq, ask_groq_with_slide, summarize_notes
from pdf_extractor import extract_pdf_slides
from pptx_extractor import extract_pptx_slides


class InvalidPdfError(Exception):
    """Raised when content extraction yields no usable text."""


class NotesNotFoundError(Exception):
    """Raised when classroom notes are missing in Firebase."""


# ---------------------------------------------------------------------------
# Upload / Save
# ---------------------------------------------------------------------------

def save_classroom_notes(
    notes_id: str,
    file_path: str,
    original_filename: str = "",
) -> dict:
    """Extract content from a PDF or PPTX and persist it in Firebase.

    Behaviour
    ---------
    1.  Detect file type from original_filename extension.
    2.  Extract per-slide data (text + image) using the correct extractor.
    3.  Build combined text for backward-compatible extracted_text field.
    4.  Store the full record in Firebase including the slides dict.
    5.  Generate an auto-summary from the combined text (best-effort).
    6.  Select a representative figure from the first slide with an image.

    Args
    ----
    notes_id:          Firebase key for the notes record.
    file_path:         Absolute path to the temporary file on disk.
    original_filename: Original filename from the upload — used to detect type.

    Returns
    -------
    dict with keys: notes_id, page_count, text_length, summary, figure, file_type.

    Raises
    ------
    InvalidPdfError: if text extraction yields nothing usable.
    """
    fname_lower = (original_filename or file_path).lower()
    is_pptx = fname_lower.endswith(".pptx")
    file_type = "pptx" if is_pptx else "pdf"

    # --- Extract per-slide data ---
    try:
        slides_list: list[dict] = (
            extract_pptx_slides(file_path) if is_pptx else extract_pdf_slides(file_path)
        )
    except Exception as exc:
        raise InvalidPdfError("unable to extract content from file") from exc

    if not slides_list:
        raise InvalidPdfError("no content could be extracted from the file")

    # --- Build combined text (backward-compatible field) ---
    combined_text = "\n\n".join(
        s.get("text", "").strip()
        for s in slides_list
        if s.get("text", "").strip()
    )
    if not combined_text.strip():
        raise InvalidPdfError("unable to extract text from file")

    page_count = len(slides_list)

    # --- Build Firebase slides dict (keys must be strings) ---
    slides_firebase: dict = {
        str(s["slide_num"]): {
            "text": s.get("text", ""),
            "image_base64": s.get("image_base64"),
        }
        for s in slides_list
    }

    # --- Persist to Firebase ---
    record: dict = {
        "extracted_text": combined_text,
        "uploaded_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "page_count": page_count,
        "file_type": file_type,
        "slides": slides_firebase,
    }
    get_ref(f"classroom_notes/{notes_id}").set(record)

    # --- Summary (best-effort — never block the upload) ---
    summary: str | None = None
    try:
        summary = summarize_notes(combined_text)
    except Exception:
        summary = None

    # --- Representative figure = first slide with an image ---
    figure: dict | None = None
    try:
        label = "Slide" if is_pptx else "Page"
        for s in slides_list:
            if s.get("image_base64"):
                figure = {
                    "page": s["slide_num"],
                    "image_base64": s["image_base64"],
                    "mime_type": "image/jpeg",
                    "caption": f"{label} {s['slide_num']}",
                }
                break
    except Exception:
        figure = None

    return {
        "notes_id": notes_id,
        "page_count": page_count,
        "text_length": len(combined_text),
        "summary": summary,
        "figure": figure,
        "file_type": file_type,
    }


# ---------------------------------------------------------------------------
# Q&A
# ---------------------------------------------------------------------------

def ask_notes_question(notes_id: str, question: str) -> dict:
    """Answer a student question using classroom notes from Firebase.

    If the Firebase record contains per-slide data (new uploads), uses
    slide-aware Q&A via ask_groq_with_slide() and returns the relevant
    slide image alongside the answer.

    For old Firebase records without a 'slides' key, falls back to the
    original ask_groq() path — existing behaviour is preserved exactly.
    """
    data = get_ref(f"classroom_notes/{notes_id}").get()
    if data is None or not isinstance(data, dict):
        raise NotesNotFoundError("notes not found")

    notes_text = data.get("extracted_text", "")
    if not isinstance(notes_text, str) or not notes_text.strip():
        raise RuntimeError("classroom notes text is empty")

    slides = data.get("slides")
    # Normalize slides representation (Firebase auto-converts sequential integer keys into lists)
    if isinstance(slides, list):
        slides_dict = {}
        for idx, item in enumerate(slides):
            if item and isinstance(item, dict):
                slides_dict[str(idx)] = item
        slides = slides_dict

    slide_num: int | None = None
    slide_image_base64: str | None = None

    if slides and isinstance(slides, dict) and len(slides) > 0:
        # --- Slide-aware Q&A path (new uploads) ---
        try:
            answer, slide_num = ask_groq_with_slide(slides, question)
        except Exception:
            # Fall back gracefully rather than returning a 500
            answer = ask_groq(notes_text, question)
            slide_num = None

        # Retrieve image for the identified slide
        if slide_num is not None:
            try:
                slide_data = slides.get(str(slide_num)) or {}
                if isinstance(slide_data, dict):
                    img = slide_data.get("image_base64")
                    slide_image_base64 = img if isinstance(img, str) and img else None
            except Exception:
                slide_image_base64 = None
    else:
        # --- Legacy path (old Firebase records without 'slides' key) ---
        answer = ask_groq(notes_text, question)

    result: dict = {
        "answer": answer,
        "source": notes_id,
        "model": GROQ_MODEL,
    }
    if slide_num is not None:
        result["slide_num"] = slide_num
    if slide_image_base64:
        result["slide_image_base64"] = slide_image_base64

    return result

