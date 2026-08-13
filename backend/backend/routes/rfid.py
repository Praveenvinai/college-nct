"""RFID gate routes."""

from __future__ import annotations

from flask import Blueprint, jsonify, request

from services.attendance_service import InvalidRfidError, log_rfid_gate_access

rfid_bp = Blueprint("rfid", __name__)


@rfid_bp.post("/scan")
def scan():
    """Handle an RFID gate scan result (no hardware control)."""
    try:
        payload = request.get_json(silent=True)
        if not isinstance(payload, dict):
            return jsonify({"status": "error", "message": "JSON body is required"}), 400

        card_uid = payload.get("card_uid")
        if card_uid is None or not isinstance(card_uid, str) or not card_uid.strip():
            return jsonify({"status": "error", "message": "card_uid is required"}), 400
        card_uid = card_uid.strip()

        result = log_rfid_gate_access(card_uid)
        return (
            jsonify(
                {
                    "status": "granted",
                    "student_id": result["student_id"],
                    "student_name": result["student_name"],
                    "id": result["id"],
                    "name": result["name"],
                    "role": result["role"],
                    "action": "open_gate",
                }
            ),
            200,
        )
    except InvalidRfidError:
        return jsonify({"status": "denied", "message": "invalid RFID card"}), 404
    except Exception as exc:
        return jsonify({"status": "error", "message": str(exc)}), 500
