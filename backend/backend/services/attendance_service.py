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


def list_students() -> list[dict]:
    """Return all students from Firebase as a read-only list (no writes)."""
    students = get_ref("students").get() or {}
    if not isinstance(students, dict):
        return []

    result: list[dict] = []
    for student_id, student in students.items():
        if not isinstance(student, dict):
            continue
        result.append(
            {
                "student_id": student_id,
                "name": student.get("name", ""),
                "department": student.get("department", ""),
                "rfid_uid": student.get("rfid_uid", ""),
            }
        )
    return result


def list_attendance_logs(student_id: str | None = None) -> list[dict]:
    """Return attendance_log entries (read-only), newest timestamp first."""
    raw = get_ref("attendance_log").get() or {}
    if not isinstance(raw, dict):
        return []

    entries: list[dict] = []
    for push_id, record in raw.items():
        if not isinstance(record, dict):
            continue
        sid = record.get("student_id", "")
        if student_id is not None and sid != student_id:
            continue
        entries.append(
            {
                "id": push_id,
                "student_id": sid if isinstance(sid, str) else "",
                "student_name": record.get("student_name", "")
                if isinstance(record.get("student_name"), str)
                else "",
                "department": record.get("department", "")
                if isinstance(record.get("department"), str)
                else "",
                "confidence": record.get("confidence", 0),
                "timestamp": record.get("timestamp", "")
                if isinstance(record.get("timestamp"), str)
                else "",
                "source": record.get("source", "")
                if isinstance(record.get("source"), str)
                else "",
            }
        )

    entries.sort(key=lambda e: e.get("timestamp") or "", reverse=True)
    return entries


def list_gate_logs(student_id: str | None = None) -> list[dict]:
    """Return gate_log entries (read-only), newest timestamp first."""
    raw = get_ref("gate_log").get() or {}
    if not isinstance(raw, dict):
        return []

    entries: list[dict] = []
    for push_id, record in raw.items():
        if not isinstance(record, dict):
            continue
        sid = record.get("student_id", "")
        if student_id is not None and sid != student_id:
            continue
        entries.append(
            {
                "id": push_id,
                "student_id": sid if isinstance(sid, str) else "",
                "student_name": record.get("student_name", "")
                if isinstance(record.get("student_name"), str)
                else "",
                "department": record.get("department", "")
                if isinstance(record.get("department"), str)
                else "",
                "card_uid": record.get("card_uid", "")
                if isinstance(record.get("card_uid"), str)
                else "",
                "timestamp": record.get("timestamp", "")
                if isinstance(record.get("timestamp"), str)
                else "",
                "gate_status": record.get("gate_status", "")
                if isinstance(record.get("gate_status"), str)
                else "",
                "source": record.get("source", "")
                if isinstance(record.get("source"), str)
                else "",
            }
        )

    entries.sort(key=lambda e: e.get("timestamp") or "", reverse=True)
    return entries


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
