"""Face recognition gate routes."""

from __future__ import annotations

from flask import Blueprint, jsonify, request

from services.attendance_service import StudentNotFoundError, log_face_attendance

face_bp = Blueprint("face", __name__)


@face_bp.post("/recognize")
def recognize():
    """Log a face-recognition result from an external client (no image processing)."""
    try:
        payload = request.get_json(silent=True)
        if not isinstance(payload, dict):
            return jsonify({"status": "error", "message": "JSON body is required"}), 400

        student_id = payload.get("student_id")
        if student_id is None or not isinstance(student_id, str) or not student_id.strip():
            return jsonify({"status": "error", "message": "student_id is required"}), 400
        student_id = student_id.strip()

        if "confidence" not in payload:
            return jsonify({"status": "error", "message": "confidence is required"}), 400

        confidence = payload.get("confidence")
        if isinstance(confidence, bool) or not isinstance(confidence, (int, float)):
            return jsonify({"status": "error", "message": "confidence must be a number"}), 400
        if confidence < 0 or confidence > 1:
            return (
                jsonify(
                    {"status": "error", "message": "confidence must be between 0 and 1"}
                ),
                400,
            )

        result = log_face_attendance(student_id, float(confidence))
        return (
            jsonify(
                {
                    "status": "success",
                    "message": "attendance logged successfully",
                    "student_id": result["student_id"],
                    "student_name": result["student_name"],
                    "confidence": result["confidence"],
                }
            ),
            201,
        )
    except StudentNotFoundError:
        return jsonify({"status": "error", "message": "student not found"}), 404
    except Exception as exc:
        return jsonify({"status": "error", "message": str(exc)}), 500
