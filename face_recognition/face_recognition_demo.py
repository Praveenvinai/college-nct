"""
Smart Campus — Face Recognition Gate (Laptop Webcam)
======================================================

Loads a folder of known student photos, builds face encodings for each,
then continuously scans the webcam feed and POSTs matches to the Flask backend.

FOLDER SETUP
------------
Put student photos inside `known_faces/`, one clear frontal face per image.
The filename (without extension) becomes the display name:

    known_faces/
        Praveen.jpg
        Priya_Dharshini.jpg

Map each display name to a Firebase student_id in known_faces/student_ids.json:

    {
      "Praveen": "22AIDS001",
      "Priya Dharshini": "22AIDS002"
    }

USAGE
-----
    # Terminal 1 — start Flask backend first
    cd backend/backend
    python app.py

    # Terminal 2 — run face gate
    cd face_recognition
    python face_recognition_demo.py
    python face_recognition_demo.py --camera-index 1 --tolerance 0.55
    python face_recognition_demo.py --backend-url http://127.0.0.1:5000

Press 'q' in the video window to quit.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import time
from datetime import datetime
from pathlib import Path

import cv2
import face_recognition
import numpy as np
import requests


DEFAULT_BACKEND_URL = "http://127.0.0.1:5000"
STUDENT_IDS_FILENAME = "student_ids.json"


def parse_args():
    parser = argparse.ArgumentParser(description="Smart Campus face recognition demo")
    parser.add_argument(
        "--known-faces-dir",
        default="known_faces",
        help="Folder containing enrolled student photos (default: ./known_faces)",
    )
    parser.add_argument(
        "--backend-url",
        default=os.getenv("BACKEND_URL", DEFAULT_BACKEND_URL),
        help=f"Flask backend base URL (default: {DEFAULT_BACKEND_URL})",
    )
    parser.add_argument(
        "--camera-index",
        type=int,
        default=0,
        help="Webcam device index (default: 0, the default/built-in camera)",
    )
    parser.add_argument(
        "--tolerance",
        type=float,
        default=0.6,
        help="Match strictness — LOWER is stricter (default: 0.6). Try 0.5 if you get false matches.",
    )
    parser.add_argument(
        "--cooldown",
        type=int,
        default=30,
        help="Seconds to wait before logging the same person again (default: 30)",
    )
    parser.add_argument(
        "--resize-scale",
        type=float,
        default=0.25,
        help="Shrink frame before detection for speed (default: 0.25 = quarter size)",
    )
    parser.add_argument(
        "--detection-model",
        choices=["hog", "cnn"],
        default="hog",
        help="'hog' is fast on CPU (default). 'cnn' is more accurate but needs a GPU to run at speed.",
    )
    return parser.parse_args()


def clean_display_name(filename_stem: str) -> str:
    """
    Turns 'Priya_Dharshini_2' into 'Priya Dharshini'
    (strips a trailing _<digits> used for multiple photos of the same person,
    then swaps remaining underscores for spaces).
    """
    stem = re.sub(r"_\d+$", "", filename_stem)
    return stem.replace("_", " ").strip()


def load_student_id_map(known_faces_dir: str) -> dict[str, str]:
    """Load display-name → student_id mapping from known_faces/student_ids.json."""
    path = Path(known_faces_dir) / STUDENT_IDS_FILENAME
    if not path.is_file():
        print(f"[ERROR] Missing mapping file: {path}")
        print("        Create it like:")
        print('        { "Praveen": "22AIDS001" }')
        print("        Keys must match photo display names (underscores → spaces).")
        sys.exit(1)

    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        print(f"[ERROR] Invalid JSON in {path}: {exc}")
        sys.exit(1)

    if not isinstance(raw, dict) or not raw:
        print(f"[ERROR] {path} must be a non-empty JSON object of name → student_id")
        sys.exit(1)

    mapping: dict[str, str] = {}
    for name, student_id in raw.items():
        if not isinstance(name, str) or not isinstance(student_id, str):
            print(f"[ERROR] Both keys and values in {path} must be strings")
            sys.exit(1)
        name = name.strip()
        student_id = student_id.strip()
        if not name or not student_id:
            print(f"[ERROR] Empty name or student_id in {path}")
            sys.exit(1)
        mapping[name] = student_id

    print(f"[INFO] Loaded {len(mapping)} student_id mapping(s) from {path}")
    return mapping


def load_known_faces(known_faces_dir: str, student_id_map: dict[str, str]):
    """
    Scans known_faces_dir, builds a face encoding for every valid photo found.
    Returns (list_of_encodings, list_of_names) — same length, index-aligned.
    """
    if not os.path.isdir(known_faces_dir):
        print(f"[ERROR] Folder not found: {known_faces_dir}")
        print("        Create it and add student photos before running this script.")
        sys.exit(1)

    valid_ext = (".jpg", ".jpeg", ".png")
    encodings = []
    names = []
    skipped = []

    files = sorted(f for f in os.listdir(known_faces_dir) if f.lower().endswith(valid_ext))

    if not files:
        print(f"[ERROR] No photos found in {known_faces_dir}")
        print(
            "        Add at least one .jpg/.jpeg/.png file named after a student, e.g. Praveen.jpg"
        )
        sys.exit(1)

    print(f"[INFO] Enrolling faces from {len(files)} photo(s) in {known_faces_dir}/ ...")

    for filename in files:
        path = os.path.join(known_faces_dir, filename)
        stem = os.path.splitext(filename)[0]
        display_name = clean_display_name(stem)

        if display_name not in student_id_map:
            skipped.append(
                (
                    filename,
                    f"no student_id mapping for '{display_name}' in {STUDENT_IDS_FILENAME}",
                )
            )
            continue

        image = face_recognition.load_image_file(path)
        face_locations = face_recognition.face_locations(image)

        if len(face_locations) == 0:
            skipped.append((filename, "no face detected in photo"))
            continue
        if len(face_locations) > 1:
            skipped.append(
                (
                    filename,
                    f"{len(face_locations)} faces detected — use a photo with only one person",
                )
            )
            continue

        face_encoding = face_recognition.face_encodings(
            image, known_face_locations=face_locations
        )[0]
        encodings.append(face_encoding)
        names.append(display_name)
        student_id = student_id_map[display_name]
        print(f"  ✓ {display_name:<25s} → {student_id:<12s} ({filename})")

    if skipped:
        print("\n[WARNING] Skipped the following photos:")
        for filename, reason in skipped:
            print(f"  ✗ {filename} — {reason}")

    if not encodings:
        print("[ERROR] No usable faces were enrolled. Fix the photos/mapping above and try again.")
        sys.exit(1)

    unique_people = sorted(set(names))
    print(f"\n[INFO] Ready — {len(unique_people)} student(s) enrolled: {', '.join(unique_people)}\n")

    return encodings, names


def log_match(
    name: str,
    confidence: float,
    student_id_map: dict[str, str],
    backend_url: str,
):
    """Print the match and POST attendance to Flask /api/face/recognize."""
    timestamp = datetime.now().strftime("%H:%M:%S")
    student_id = student_id_map.get(name)
    if not student_id:
        print(f"[{timestamp}] ✗ MATCH but no student_id for '{name}' — skipped backend")
        return

    print(
        f"[{timestamp}] ✓ MATCH — {name} ({student_id})  "
        f"(confidence: {confidence * 100:.1f}%)"
    )

    url = backend_url.rstrip("/") + "/api/face/recognize"
    payload = {
        "student_id": student_id,
        "confidence": round(float(confidence), 3),
    }

    try:
        response = requests.post(url, json=payload, timeout=5)
        try:
            body = response.json()
        except ValueError:
            body = {"raw": response.text}

        if response.ok:
            student_name = body.get("student_name", name)
            print(
                f"[{timestamp}]   → backend OK ({response.status_code}): "
                f"attendance logged for {student_name}"
            )
        else:
            print(
                f"[{timestamp}]   → backend ERROR ({response.status_code}): "
                f"{body.get('message', body)}"
            )
    except requests.RequestException as exc:
        print(f"[{timestamp}]   → backend UNREACHABLE: {exc}")
        print(f"                 Is Flask running at {backend_url} ?")


def main():
    args = parse_args()

    student_id_map = load_student_id_map(args.known_faces_dir)
    known_encodings, known_names = load_known_faces(args.known_faces_dir, student_id_map)

    print(f"[INFO] Backend URL: {args.backend_url}")
    print("[INFO] Starting webcam... press 'q' in the video window to quit.\n")
    video_capture = cv2.VideoCapture(args.camera_index)

    if not video_capture.isOpened():
        print(f"[ERROR] Could not open camera index {args.camera_index}.")
        print(
            "        Try a different --camera-index (0, 1, 2...) or check camera permissions."
        )
        sys.exit(1)

    last_seen = {}  # name -> last logged timestamp, for cooldown de-duplication
    frame_count = 0
    process_every_n_frames = 3  # skip frames for speed; still feels responsive

    # These persist across skipped frames so boxes don't flicker off
    # on the frames where we don't re-run detection.
    face_locations = []
    face_labels = []

    try:
        while True:
            ret, frame = video_capture.read()
            if not ret:
                print("[ERROR] Failed to read from camera. Exiting.")
                break

            frame_count += 1
            process_this_frame = frame_count % process_every_n_frames == 0

            if process_this_frame:
                small_frame = cv2.resize(
                    frame, (0, 0), fx=args.resize_scale, fy=args.resize_scale
                )
                rgb_small_frame = cv2.cvtColor(small_frame, cv2.COLOR_BGR2RGB)

                face_locations = face_recognition.face_locations(
                    rgb_small_frame, model=args.detection_model
                )
                face_encodings = face_recognition.face_encodings(
                    rgb_small_frame, face_locations
                )

                face_labels = []  # (name, confidence) per detected face

                for face_encoding in face_encodings:
                    distances = face_recognition.face_distance(
                        known_encodings, face_encoding
                    )
                    best_match_index = (
                        int(np.argmin(distances)) if len(distances) else None
                    )

                    if (
                        best_match_index is not None
                        and distances[best_match_index] <= args.tolerance
                    ):
                        name = known_names[best_match_index]
                        confidence = 1.0 - float(distances[best_match_index])

                        now = time.time()
                        if name not in last_seen or (now - last_seen[name]) >= args.cooldown:
                            log_match(name, confidence, student_id_map, args.backend_url)
                            last_seen[name] = now

                        face_labels.append((f"{name} ({confidence * 100:.0f}%)", (0, 200, 0)))
                    else:
                        face_labels.append(("Unknown", (0, 0, 220)))

            # Draw boxes/labels on the full-size frame (scale locations back up)
            scale = 1 / args.resize_scale
            for (top, right, bottom, left), (label, color) in zip(
                face_locations, face_labels
            ):
                top, right, bottom, left = (
                    int(top * scale),
                    int(right * scale),
                    int(bottom * scale),
                    int(left * scale),
                )
                cv2.rectangle(frame, (left, top), (right, bottom), color, 2)
                cv2.rectangle(
                    frame, (left, bottom - 22), (right, bottom), color, cv2.FILLED
                )
                cv2.putText(
                    frame,
                    label,
                    (left + 4, bottom - 6),
                    cv2.FONT_HERSHEY_DUPLEX,
                    0.5,
                    (255, 255, 255),
                    1,
                )

            cv2.putText(
                frame,
                "Smart Campus - Face Recognition Gate  (q to quit)",
                (10, 24),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.55,
                (20, 33, 61),
                2,
            )

            cv2.imshow("Smart Campus - Gate Camera", frame)

            if cv2.waitKey(1) & 0xFF == ord("q"):
                break

    finally:
        video_capture.release()
        cv2.destroyAllWindows()
        print("\n[INFO] Camera released. Goodbye.")


if __name__ == "__main__":
    main()
