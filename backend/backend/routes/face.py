"""Face recognition gate routes."""

from __future__ import annotations

from flask import Blueprint, jsonify, request

from services.attendance_service import (
    StudentNotFoundError,
    log_browser_face_attendance,
    log_face_attendance,
)
from services.face_match_service import FaceMatchError, match_face_image

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


@face_bp.post("/browser-attendance")
def browser_attendance():
    """Log one browser-webcam face check-in. Does not run face ML."""
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

        result = log_browser_face_attendance(student_id, float(confidence))
        recorded = result.get("recorded") is True
        duplicate = result.get("duplicate") is True
        return (
            jsonify(
                {
                    "status": "success",
                    "recorded": recorded,
                    "duplicate": duplicate,
                    "student_id": result["student_id"],
                    "student_name": result["student_name"],
                    "confidence": result["confidence"],
                    "source": result.get("source", "browser_face"),
                    "timestamp": result.get("timestamp", ""),
                    "message": (
                        "attendance already recorded"
                        if duplicate
                        else "attendance logged successfully"
                    ),
                }
            ),
            200 if duplicate else 201,
        )
    except StudentNotFoundError:
        return jsonify({"status": "error", "message": "student not found"}), 404
    except Exception as exc:
        return jsonify({"status": "error", "message": str(exc)}), 500


@face_bp.post("/match-image")
def match_image():
    """
    Read-only browser face match against known_faces.
    Does NOT write attendance_log. Do not use for physical-gate logging.
    """
    try:
        payload = request.get_json(silent=True)
        if not isinstance(payload, dict):
            return (
                jsonify(
                    {
                        "matched": False,
                        "code": "invalid_image",
                        "message": "JSON body is required",
                    }
                ),
                400,
            )

        image_base64 = payload.get("image_base64")
        if image_base64 is None or not isinstance(image_base64, str) or not image_base64.strip():
            return (
                jsonify(
                    {
                        "matched": False,
                        "code": "invalid_image",
                        "message": "image_base64 is required",
                    }
                ),
                400,
            )

        tolerance = payload.get("tolerance", 0.6)
        result = match_face_image(image_base64.strip(), tolerance=tolerance)
        return jsonify(result), 200
    except FaceMatchError as exc:
        return (
            jsonify(
                {
                    "matched": False,
                    "code": exc.code,
                    "message": exc.message,
                }
            ),
            exc.http_status,
        )
    except Exception as exc:
        return (
            jsonify(
                {
                    "matched": False,
                    "code": "server_error",
                    "message": str(exc),
                }
            ),
            500,
        )
