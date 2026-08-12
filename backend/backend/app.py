"""Flask application entrypoint."""

import os

from flask import Flask, jsonify
from flask_cors import CORS

from firebase_config import get_ref
from routes.face import face_bp
from routes.rfid import rfid_bp
from routes.store import store_bp
from routes.classroom import classroom_bp
from routes.students import students_bp

app = Flask(__name__)
CORS(app)
app.register_blueprint(face_bp, url_prefix="/api/face")
app.register_blueprint(rfid_bp, url_prefix="/api/rfid")
app.register_blueprint(store_bp, url_prefix="/api/store")
app.register_blueprint(classroom_bp, url_prefix="/api/classroom")
app.register_blueprint(students_bp, url_prefix="/api/students")


@app.get("/api/health")
def health():
    """Verify Firebase connectivity with a lightweight read."""
    try:
        get_ref("students/22AIDS001").get()
        return jsonify({"status": "ok", "firebase": "connected"}), 200
    except Exception as exc:
        return (
            jsonify(
                {
                    "status": "error",
                    "firebase": "disconnected",
                    "message": str(exc),
                }
            ),
            500,
        )


if __name__ == "__main__":
    port = int(os.getenv("PORT", "5000"))
    app.run(host="0.0.0.0", port=port, debug=False)
