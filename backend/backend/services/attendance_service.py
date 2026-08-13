"""Attendance logging service."""

from __future__ import annotations

import threading
from datetime import datetime, timezone

from firebase_config import get_ref

BROWSER_FACE_SOURCE = "browser_face"
BROWSER_FACE_DUPLICATE_WINDOW_SECONDS = 60
_TIMESTAMP_FORMAT = "%Y-%m-%dT%H:%M:%SZ"
_browser_attendance_lock = threading.Lock()


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


def _parse_attendance_timestamp(raw: str) -> datetime | None:
    """Parse attendance_log timestamps (UTC ISO, typically ...Z)."""
    if not raw or not isinstance(raw, str):
        return None
    text = raw.strip()
    if not text:
        return None
    try:
        if text.endswith("Z"):
            return datetime.strptime(text, _TIMESTAMP_FORMAT).replace(tzinfo=timezone.utc)
        parsed = datetime.fromisoformat(text)
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=timezone.utc)
        return parsed.astimezone(timezone.utc)
    except ValueError:
        return None


def log_face_attendance(
    student_id: str,
    confidence: float,
    source: str = "face_recognition",
) -> dict:
    """Verify student exists and push a face-recognition attendance record."""
    student = get_student(student_id)
    if student is None:
        raise StudentNotFoundError("student not found")

    student_name = student.get("name", "")
    department = student.get("department", "")
    timestamp = datetime.now(timezone.utc).strftime(_TIMESTAMP_FORMAT)
    record_source = source if isinstance(source, str) and source.strip() else "face_recognition"

    record = {
        "student_id": student_id,
        "student_name": student_name,
        "department": department,
        "confidence": confidence,
        "timestamp": timestamp,
        "source": record_source,
    }

    get_ref("attendance_log").push(record)

    return {
        "student_id": student_id,
        "student_name": student_name,
        "confidence": confidence,
        "source": record_source,
        "timestamp": timestamp,
    }


def log_browser_face_attendance(student_id: str, confidence: float) -> dict:
    """
    Push one browser_face attendance record, or skip if the same student
    already has a browser_face check-in within the short duplicate window.
    """
    student = get_student(student_id)
    if student is None:
        raise StudentNotFoundError("student not found")

    student_name = student.get("name", "")

    with _browser_attendance_lock:
        now = datetime.now(timezone.utc)
        for entry in list_attendance_logs(student_id):
            if entry.get("source") != BROWSER_FACE_SOURCE:
                continue
            stamped = _parse_attendance_timestamp(entry.get("timestamp") or "")
            if stamped is None:
                continue
            age_seconds = (now - stamped).total_seconds()
            if 0 <= age_seconds <= BROWSER_FACE_DUPLICATE_WINDOW_SECONDS:
                return {
                    "student_id": student_id,
                    "student_name": student_name,
                    "confidence": confidence,
                    "source": BROWSER_FACE_SOURCE,
                    "timestamp": entry.get("timestamp", ""),
                    "recorded": False,
                    "duplicate": True,
                }

        result = log_face_attendance(
            student_id,
            confidence,
            source=BROWSER_FACE_SOURCE,
        )
        return {
            **result,
            "recorded": True,
            "duplicate": False,
        }


class InvalidRfidError(Exception):
    """Raised when no student, staff, or visitor matches the RFID card UID."""


def _find_by_rfid(node_path: str, card_uid: str) -> tuple[str, dict] | None:
    """Find a record under node_path whose rfid_uid exactly matches card_uid."""
    records = get_ref(node_path).get() or {}
    if not isinstance(records, dict):
        return None

    for record_id, record in records.items():
        if not isinstance(record, dict):
            continue
        if record.get("rfid_uid") == card_uid:
            return record_id, record
    return None


def find_student_by_rfid(card_uid: str) -> tuple[str, dict] | None:
    """Find a student whose rfid_uid matches card_uid."""
    return _find_by_rfid("students", card_uid)


def find_staff_by_rfid(card_uid: str) -> tuple[str, dict] | None:
    """Find a staff member whose rfid_uid matches card_uid."""
    return _find_by_rfid("staff", card_uid)


def find_visitor_by_rfid(card_uid: str) -> tuple[str, dict] | None:
    """Find a visitor whose rfid_uid matches card_uid."""
    return _find_by_rfid("visitor", card_uid)


def _department_for_role(role: str, person: dict) -> str:
    """Map role-specific fields onto the existing gate_log department field."""
    if role == "student":
        value = person.get("department", "")
    elif role == "staff":
        value = person.get("designation", person.get("desigination", ""))
    else:
        value = ""
    return value if isinstance(value, str) else ""


def log_rfid_gate_access(card_uid: str) -> dict:
    """Verify RFID card, push a gate_log entry, and return granted person info."""
    found = find_student_by_rfid(card_uid)
    role = "student"
    if found is None:
        found = find_staff_by_rfid(card_uid)
        role = "staff"
    if found is None:
        found = find_visitor_by_rfid(card_uid)
        role = "visitor"
    if found is None:
        raise InvalidRfidError("invalid RFID card")

    person_id, person = found
    person_name = person.get("name", "")
    if not isinstance(person_name, str):
        person_name = ""
    department = _department_for_role(role, person)
    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    record = {
        "student_id": person_id,
        "student_name": person_name,
        "department": department,
        "card_uid": card_uid,
        "timestamp": timestamp,
        "gate_status": "granted",
        "source": "rfid_gate",
    }

    get_ref("gate_log").push(record)

    return {
        "student_id": person_id,
        "student_name": person_name,
        "id": person_id,
        "name": person_name,
        "role": role,
    }
