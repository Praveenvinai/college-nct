"""Student directory routes (read-only)."""

from __future__ import annotations

import logging

from flask import Blueprint, jsonify

from services.attendance_service import list_students

logger = logging.getLogger(__name__)

students_bp = Blueprint("students", __name__)


@students_bp.get("")
def list_all_students():
    """Return all students from Firebase. Read-only; no writes."""
    try:
        return jsonify({"students": list_students()}), 200
    except Exception:
        logger.exception("Failed to list students")
        return (
            jsonify({"status": "error", "message": "failed to list students"}),
            500,
        )
