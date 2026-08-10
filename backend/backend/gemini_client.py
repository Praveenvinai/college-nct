"""Groq API client for AI Teacher (file kept as gemini_client.py)."""

from __future__ import annotations

import os
from pathlib import Path

import requests
from dotenv import load_dotenv

_BACKEND_DIR = Path(__file__).resolve().parent
load_dotenv(_BACKEND_DIR / ".env")

GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = "llama-3.1-8b-instant"


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
        content = data["choices"][0]["message"]["content"]
    except (ValueError, KeyError, IndexError, TypeError) as exc:
        raise RuntimeError("Groq API returned an unexpected response") from exc

    if not isinstance(content, str) or not content.strip():
        raise RuntimeError("Groq API returned an empty answer")

    return content.strip()
