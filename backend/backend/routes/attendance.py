"""Attendance log routes (read-only)."""

from __future__ import annotations

import logging

from flask import Blueprint, jsonify, request

from services.attendance_service import list_attendance_logs

logger = logging.getLogger(__name__)

attendance_bp = Blueprint("attendance", __name__)


@attendance_bp.get("")
def get_attendance():
    """Return attendance_log entries. Read-only; no writes."""
    try:
        student_id = request.args.get("student_id")
        if isinstance(student_id, str):
            student_id = student_id.strip() or None
        else:
            student_id = None

        entries = list_attendance_logs(student_id)
        payload: dict = {
            "count": len(entries),
            "entries": entries,
        }
        if student_id is not None:
            payload["student_id"] = student_id
        return jsonify(payload), 200
    except Exception:
        logger.exception("Failed to list attendance logs")
        return (
            jsonify({"status": "error", "message": "failed to list attendance logs"}),
            500,
        )
