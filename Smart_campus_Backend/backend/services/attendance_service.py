"""Attendance logging service."""

from __future__ import annotations

from datetime import datetime, timezone

from firebase_config import get_ref


class StudentNotFoundError(Exception):
    """Raised when a student_id is not present in Firebase."""


def get_student(student_id: str) -> dict | None:
    """Return student data from Firebase, or None if missing."""
    data = get_ref(f"students/{student_id}").get()
    if data is None:
        return None
    if not isinstance(data, dict):
        return None
    return data


def log_face_attendance(student_id: str, confidence: float) -> dict:
    """Verify student exists and push a face-recognition attendance record."""
    student = get_student(student_id)
    if student is None:
        raise StudentNotFoundError("student not found")

    student_name = student.get("name", "")
    department = student.get("department", "")
    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    record = {
        "student_id": student_id,
        "student_name": student_name,
        "department": department,
        "confidence": confidence,
        "timestamp": timestamp,
        "source": "face_recognition",
    }

    get_ref("attendance_log").push(record)

    return {
        "student_id": student_id,
        "student_name": student_name,
        "confidence": confidence,
    }


class InvalidRfidError(Exception):
    """Raised when no student matches the RFID card UID."""


def find_student_by_rfid(card_uid: str) -> tuple[str, dict] | None:
    """Find a student whose rfid_uid matches card_uid."""
    students = get_ref("students").get() or {}
    if not isinstance(students, dict):
        return None

    for student_id, student in students.items():
        if not isinstance(student, dict):
            continue
        if student.get("rfid_uid") == card_uid:
            return student_id, student
    return None


def log_rfid_gate_access(card_uid: str) -> dict:
    """Verify RFID card, push a gate_log entry, and return granted student info."""
    found = find_student_by_rfid(card_uid)
    if found is None:
        raise InvalidRfidError("invalid RFID card")

    student_id, student = found
    student_name = student.get("name", "")
    department = student.get("department", "")
    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    record = {
        "student_id": student_id,
        "student_name": student_name,
        "department": department,
        "card_uid": card_uid,
        "timestamp": timestamp,
        "gate_status": "granted",
        "source": "rfid_gate",
    }

    get_ref("gate_log").push(record)

    return {
        "student_id": student_id,
        "student_name": student_name,
    }
