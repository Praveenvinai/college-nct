"""Firebase Admin SDK configuration for Realtime Database."""

from __future__ import annotations

import os
from pathlib import Path

import firebase_admin
from firebase_admin import credentials, db
from dotenv import load_dotenv

_BACKEND_DIR = Path(__file__).resolve().parent
_SERVICE_ACCOUNT_PATH = _BACKEND_DIR / "firebase-service-account.json"

load_dotenv(_BACKEND_DIR / ".env")


def _initialize_firebase() -> None:
    """Initialize Firebase Admin once; safe to call on every import."""
    if firebase_admin._apps:
        return

    db_url = os.getenv("FIREBASE_DB_URL", "").strip()
    if not db_url:
        raise RuntimeError(
            "FIREBASE_DB_URL is missing or empty. "
            "Set it in backend/.env without hardcoding it in Python."
        )

    if not _SERVICE_ACCOUNT_PATH.is_file():
        raise FileNotFoundError(
            f"Firebase service account file not found at: {_SERVICE_ACCOUNT_PATH}"
        )

    cred = credentials.Certificate(str(_SERVICE_ACCOUNT_PATH))
    firebase_admin.initialize_app(cred, {"databaseURL": db_url})


_initialize_firebase()


def get_db():
    """Return a reference to the Firebase Realtime Database root."""
    return db.reference()


def get_ref(path: str):
    """Return a reference to a Firebase Realtime Database path."""
    return db.reference(path)
