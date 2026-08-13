"""In-memory face matching for browser portal auth (read-only — no attendance writes)."""

from __future__ import annotations

import base64
import io
import json
import logging
import os
import re
import threading
from pathlib import Path

import numpy as np
from PIL import Image

from firebase_config import get_ref
from services.attendance_service import get_student

logger = logging.getLogger(__name__)

STUDENT_IDS_FILENAME = "student_ids.json"
DEFAULT_TOLERANCE = 0.6
MIN_PORTAL_CONFIDENCE = 0.45

# backend/backend/services -> repo root is parents[3]
_DEFAULT_KNOWN_FACES = (
    Path(__file__).resolve().parents[3] / "face_recognition" / "known_faces"
)


class FaceMatchError(Exception):
    """Structured match failure with HTTP-friendly code."""

    def __init__(self, code: str, message: str, http_status: int = 400):
        super().__init__(message)
        self.code = code
        self.message = message
        self.http_status = http_status


_lock = threading.Lock()
_encodings_cache: list | None = None
_names_cache: list[str] | None = None
_id_map_cache: dict[str, str] | None = None
_cache_dir: str | None = None


def _known_faces_dir() -> Path:
    raw = os.getenv("KNOWN_FACES_DIR", "").strip()
    if raw:
        return Path(raw)
    return _DEFAULT_KNOWN_FACES


def clean_display_name(filename_stem: str) -> str:
    stem = re.sub(r"_\d+$", "", filename_stem)
    return stem.replace("_", " ").strip()


def _load_student_id_map(known_faces_dir: Path) -> dict[str, str]:
    path = known_faces_dir / STUDENT_IDS_FILENAME
    if not path.is_file():
        raise FaceMatchError(
            "encodings_unavailable",
            f"Missing mapping file: {path}",
            503,
        )
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise FaceMatchError(
            "encodings_unavailable",
            f"Invalid student_ids.json: {exc}",
            503,
        ) from exc

    if not isinstance(raw, dict) or not raw:
        raise FaceMatchError(
            "encodings_unavailable",
            "student_ids.json must be a non-empty object",
            503,
        )

    mapping: dict[str, str] = {}
    for name, student_id in raw.items():
        if not isinstance(name, str) or not isinstance(student_id, str):
            continue
        name = name.strip()
        student_id = student_id.strip()
        if name and student_id:
            mapping[name] = student_id

    if not mapping:
        raise FaceMatchError(
            "encodings_unavailable",
            "student_ids.json has no valid mappings",
            503,
        )
    return mapping


def _ensure_encodings_loaded() -> tuple[list, list[str], dict[str, str]]:
    """Load known face encodings once (lazy)."""
    global _encodings_cache, _names_cache, _id_map_cache, _cache_dir

    known_dir = _known_faces_dir()
    dir_key = str(known_dir.resolve()) if known_dir.exists() else str(known_dir)

    with _lock:
        if (
            _encodings_cache is not None
            and _names_cache is not None
            and _id_map_cache is not None
            and _cache_dir == dir_key
        ):
            return _encodings_cache, _names_cache, _id_map_cache

        try:
            import face_recognition
        except ImportError as exc:
            raise FaceMatchError(
                "encodings_unavailable",
                "face_recognition library is not installed on the Flask server",
                503,
            ) from exc

        if not known_dir.is_dir():
            raise FaceMatchError(
                "encodings_unavailable",
                f"known_faces folder not found: {known_dir}",
                503,
            )

        id_map = _load_student_id_map(known_dir)
        valid_ext = (".jpg", ".jpeg", ".png")
        encodings: list = []
        names: list[str] = []

        files = sorted(
            f for f in os.listdir(known_dir) if f.lower().endswith(valid_ext)
        )
        if not files:
            raise FaceMatchError(
                "encodings_unavailable",
                f"No enrollment photos in {known_dir}",
                503,
            )

        for filename in files:
            path = known_dir / filename
            display_name = clean_display_name(path.stem)
            if display_name not in id_map:
                logger.warning("Skipping %s — no student_id mapping", filename)
                continue

            image = face_recognition.load_image_file(str(path))
            locations = face_recognition.face_locations(image)
            if len(locations) != 1:
                logger.warning(
                    "Skipping %s — expected 1 face, found %s",
                    filename,
                    len(locations),
                )
                continue

            encoding = face_recognition.face_encodings(
                image, known_face_locations=locations
            )[0]
            encodings.append(encoding)
            names.append(display_name)

        if not encodings:
            raise FaceMatchError(
                "encodings_unavailable",
                "No usable enrolled faces could be loaded",
                503,
            )

        _encodings_cache = encodings
        _names_cache = names
        _id_map_cache = id_map
        _cache_dir = dir_key
        logger.info(
            "Loaded %s face encoding(s) from %s",
            len(encodings),
            known_dir,
        )
        return encodings, names, id_map


def _decode_image_base64(image_base64: str) -> np.ndarray:
    """Decode base64 / data-URL into RGB numpy array. Image discarded by caller."""
    raw = image_base64.strip()
    if "," in raw and raw.lower().startswith("data:"):
        raw = raw.split(",", 1)[1]

    try:
        binary = base64.b64decode(raw, validate=False)
    except Exception as exc:
        raise FaceMatchError(
            "invalid_image",
            "Could not decode image data",
            400,
        ) from exc

    if not binary:
        raise FaceMatchError("invalid_image", "Empty image payload", 400)

    try:
        with Image.open(io.BytesIO(binary)) as img:
            rgb = img.convert("RGB")
            return np.asarray(rgb)
    except Exception as exc:
        raise FaceMatchError(
            "invalid_image",
            "Could not decode image data",
            400,
        ) from exc


def _resolve_matched_person(person_id: str) -> tuple[str, str, str, str] | None:
    """Look up Firebase identity: students first, then staff. No visitor faces."""
    student = get_student(person_id)
    if student is not None:
        name = student.get("name", "") if isinstance(student.get("name"), str) else ""
        department = (
            student.get("department", "")
            if isinstance(student.get("department"), str)
            else ""
        )
        return person_id, name, "student", department

    staff = get_ref(f"staff/{person_id}").get()
    if isinstance(staff, dict):
        name = staff.get("name", "") if isinstance(staff.get("name"), str) else ""
        designation = staff.get("designation", staff.get("desigination", ""))
        department = designation if isinstance(designation, str) else ""
        return person_id, name, "staff", department

    return None


def match_face_image(
    image_base64: str,
    tolerance: float = DEFAULT_TOLERANCE,
) -> dict:
    """
    Match a single face in the image against known_faces.
    Does NOT write Firebase or call attendance logging.
    """
    if not isinstance(tolerance, (int, float)) or isinstance(tolerance, bool):
        tolerance = DEFAULT_TOLERANCE
    tolerance = float(tolerance)
    if tolerance <= 0 or tolerance > 1:
        tolerance = DEFAULT_TOLERANCE

    import face_recognition

    known_encodings, known_names, id_map = _ensure_encodings_loaded()
    rgb = _decode_image_base64(image_base64)

    locations = face_recognition.face_locations(rgb)
    if len(locations) == 0:
        raise FaceMatchError(
            "no_face",
            "No face detected. Center your face in the frame and try again.",
            400,
        )
    if len(locations) > 1:
        raise FaceMatchError(
            "multiple_faces",
            "Multiple faces detected. Only one person should be in frame.",
            400,
        )

    encodings = face_recognition.face_encodings(rgb, known_face_locations=locations)
    if not encodings:
        raise FaceMatchError(
            "no_face",
            "No face detected. Center your face in the frame and try again.",
            400,
        )

    probe = encodings[0]
    distances = face_recognition.face_distance(known_encodings, probe)
    if len(distances) == 0:
        raise FaceMatchError(
            "no_match",
            "Face not recognized. Please try again.",
            401,
        )

    best_idx = int(np.argmin(distances))
    best_distance = float(distances[best_idx])
    confidence = 1.0 - best_distance

    if best_distance > tolerance or confidence < MIN_PORTAL_CONFIDENCE:
        raise FaceMatchError(
            "no_match",
            "Face not recognized. Please try again.",
            401,
        )

    display_name = known_names[best_idx]
    person_id = id_map.get(display_name)
    if not person_id:
        raise FaceMatchError(
            "no_match",
            "Face not recognized. Please try again.",
            401,
        )

    identity = _resolve_matched_person(person_id)
    if identity is None:
        raise FaceMatchError(
            "no_match",
            "Face not recognized. Please try again.",
            401,
        )

    resolved_id, person_name, role, department = identity

    return {
        "matched": True,
        "student_id": resolved_id,
        "student_name": person_name,
        "id": resolved_id,
        "name": person_name,
        "role": role,
        "department": department,
        "confidence": round(confidence, 3),
        "distance": round(best_distance, 3),
    }
