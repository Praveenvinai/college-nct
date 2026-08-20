"""Groq API client for AI Teacher (file kept as gemini_client.py)."""

from __future__ import annotations

import os
import re
from pathlib import Path

import requests
from dotenv import load_dotenv

_BACKEND_DIR = Path(__file__).resolve().parent
load_dotenv(_BACKEND_DIR / ".env")

GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = "openai/gpt-oss-20b"

# Character limit for summary input to keep latency and token usage low.
_SUMMARY_TEXT_LIMIT = 8000

_SUMMARY_SYSTEM_PROMPT = (
    "You are an expert academic summarizer for university students. "
    "Your task is to summarize the following classroom notes concisely. "
    "Structure your summary as follows:\n"
    "1. Main Topic: one sentence describing what the notes are about.\n"
    "2. Key Concepts: bullet points covering the most important ideas.\n"
    "3. Important Definitions: any key terms defined in the notes.\n"
    "4. Formulas / Theorems: mention any important equations or theorems if present.\n\n"
    "Rules:\n"
    "- Use ONLY the content provided in the notes below.\n"
    "- Do NOT add information from outside the notes.\n"
    "- Do NOT answer questions or speculate beyond what is written.\n"
    "- Keep the total response to 200-300 words maximum.\n"
    "- Write in clear, student-friendly academic language."
)


def _get_api_key() -> str:
    api_key = os.getenv("GROQ_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("GROQ_API_KEY is not configured")
    return api_key


def ask_groq(notes_text: str, question: str) -> str:
    """Ask Groq a question grounded in classroom notes text."""
    api_key = _get_api_key()

    system_prompt = (
        "You are a helpful AI teacher for students. "
        "Answer using ONLY the provided classroom notes as your knowledge source. "
        "If the answer is not present in the notes, clearly say that the information "
        "was not found in the uploaded notes. "
        "Keep answers concise and student-friendly."
    )
    user_prompt = (
        f"Classroom notes:\n{notes_text}\n\n"
        f"Student question:\n{question}"
    )

    payload = {
        "model": GROQ_MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": 0.2,
    }
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    try:
        response = requests.post(
            GROQ_API_URL,
            headers=headers,
            json=payload,
            timeout=60,
        )
    except requests.RequestException as exc:
        raise RuntimeError(f"Groq API request failed: {exc}") from exc

    if response.status_code != 200:
        raise RuntimeError(
            f"Groq API error {response.status_code}: {response.text}"
        )

    try:
        data = response.json()
        message = data["choices"][0]["message"]
        content = message.get("content")
        if not (isinstance(content, str) and content.strip()):
            content = message.get("reasoning_content") or message.get("reasoning")
    except (ValueError, KeyError, IndexError, TypeError) as exc:
        raise RuntimeError("Groq API returned an unexpected response") from exc

    if not isinstance(content, str) or not content.strip():
        raise RuntimeError("Groq API returned an empty answer")

    return content.strip()


def summarize_notes(notes_text: str) -> str:
    """Generate a concise academic summary of classroom notes using Groq.

    Only the first _SUMMARY_TEXT_LIMIT characters are sent to keep latency
    and token usage predictable regardless of PDF size.
    """
    api_key = _get_api_key()

    # Truncate to avoid excessive token usage on very large PDFs.
    truncated = notes_text[:_SUMMARY_TEXT_LIMIT]

    user_prompt = f"Classroom notes to summarize:\n\n{truncated}"

    payload = {
        "model": GROQ_MODEL,
        "messages": [
            {"role": "system", "content": _SUMMARY_SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": 0.2,
    }
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    try:
        response = requests.post(
            GROQ_API_URL,
            headers=headers,
            json=payload,
            timeout=30,
        )
    except requests.RequestException as exc:
        raise RuntimeError(f"Groq summarize request failed: {exc}") from exc

    if response.status_code != 200:
        raise RuntimeError(
            f"Groq API error {response.status_code} during summarize: {response.text}"
        )

    try:
        data = response.json()
        message = data["choices"][0]["message"]
        content = message.get("content")
        if not (isinstance(content, str) and content.strip()):
            content = message.get("reasoning_content") or message.get("reasoning")
    except (ValueError, KeyError, IndexError, TypeError) as exc:
        raise RuntimeError("Groq API returned an unexpected summarize response") from exc

    if not isinstance(content, str) or not content.strip():
        raise RuntimeError("Groq API returned an empty summary")

    return content.strip()


def ask_groq_with_slide(
    slides: dict, question: str
) -> tuple[str, int | None]:
    """Answer a student question from per-slide/page context and identify the
    most relevant slide.

    Args:
        slides: Firebase slides dict keyed by string slide numbers.
                Each value must have at minimum a "text" key.
        question: Student's question.

    Returns:
        (answer_text, slide_number_or_None)

        answer_text has the RELEVANT_SLIDE marker stripped so it is never
        shown to the student.
        slide_number is None when the model returns an invalid/missing marker.
    """
    _MAX_CONTEXT_SLIDES = 25
    _MAX_CHARS_PER_SLIDE = 350

    api_key = _get_api_key()

    # Sort by slide number; limit to _MAX_CONTEXT_SLIDES
    sorted_keys = sorted(
        slides.keys(),
        key=lambda k: int(k) if k.isdigit() else 0,
    )[:_MAX_CONTEXT_SLIDES]

    context_blocks: list[str] = []
    for key in sorted_keys:
        slide = slides[key]
        text = (slide.get("text") or "").strip()[:_MAX_CHARS_PER_SLIDE]
        if text:
            context_blocks.append(f"[Slide {key}]\n{text}")

    if not context_blocks:
        raise RuntimeError("no slide text available for Q&A")

    slide_context = "\n\n".join(context_blocks)

    system_prompt = (
        "You are a helpful academic AI tutor. "
        "Answer the student's question using ONLY the slide content provided below. "
        "If the answer is not clearly present in the slides, say so clearly. "
        "Be concise and student-friendly. "
        "At the very end of your response, on its own line, write exactly:\n"
        "RELEVANT_SLIDE: <number>\n"
        "where <number> is the integer slide number most relevant to your answer. "
        "Do NOT include any text after the number on that line."
    )
    user_prompt = (
        f"Slide content:\n\n{slide_context}\n\n"
        f"Student question: {question}"
    )

    payload = {
        "model": GROQ_MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": 0.2,
    }
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    try:
        response = requests.post(
            GROQ_API_URL, headers=headers, json=payload, timeout=60
        )
    except requests.RequestException as exc:
        raise RuntimeError(f"Groq slide Q&A request failed: {exc}") from exc

    if response.status_code != 200:
        raise RuntimeError(
            f"Groq API error {response.status_code} during slide Q&A: {response.text}"
        )

    try:
        data = response.json()
        message = data["choices"][0]["message"]
        content = message.get("content")
        if not (isinstance(content, str) and content.strip()):
            content = message.get("reasoning_content") or message.get("reasoning")
    except (ValueError, KeyError, IndexError, TypeError) as exc:
        raise RuntimeError("Groq slide Q&A returned unexpected response") from exc

    if not isinstance(content, str) or not content.strip():
        raise RuntimeError("Groq slide Q&A returned empty answer")

    content = content.strip()

    # --- Parse and strip RELEVANT_SLIDE marker ---
    slide_num: int | None = None
    lines = content.splitlines()
    _marker_re = re.compile(r"RELEVANT[-_\s]+SLIDE\s*:\s*(\d+)", re.IGNORECASE)

    for idx, line in enumerate(lines):
        match = _marker_re.search(line)
        if match:
            candidate = int(match.group(1))
            if str(candidate) in slides:  # Validate slide exists
                slide_num = candidate
            # If the line is mostly just the marker, clear the line.
            # Otherwise, just remove the marker text from the line.
            cleaned_line = line.replace(match.group(0), "").strip()
            if len(cleaned_line) < 3:
                lines[idx] = ""
            else:
                lines[idx] = cleaned_line
            break

    answer = "\n".join(lines).strip() or content
    return answer, slide_num
