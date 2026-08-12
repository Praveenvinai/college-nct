"""Gate log routes (read-only)."""

from __future__ import annotations

import logging

from flask import Blueprint, jsonify, request

from services.attendance_service import list_gate_logs

logger = logging.getLogger(__name__)

gate_logs_bp = Blueprint("gate_logs", __name__)


@gate_logs_bp.get("")
def get_gate_logs():
    """Return gate_log entries. Read-only; no writes."""
    try:
        student_id = request.args.get("student_id")
        if isinstance(student_id, str):
            student_id = student_id.strip() or None
        else:
            student_id = None

        entries = list_gate_logs(student_id)
        payload: dict = {
            "count": len(entries),
            "entries": entries,
        }
        if student_id is not None:
            payload["student_id"] = student_id
        return jsonify(payload), 200
    except Exception:
        logger.exception("Failed to list gate logs")
        return (
            jsonify({"status": "error", "message": "failed to list gate logs"}),
            500,
        )
