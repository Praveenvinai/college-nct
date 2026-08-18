"""Smart store hardware device routes (ESP32 polling contract).

Mounted as a nested blueprint under the store blueprint, so these live at:

    GET  /api/store/device/commands
    POST /api/store/device/ack
    POST /api/store/device/result
    POST /api/store/device/manual-dispense

Kept in a separate module so nothing here can affect the existing
``POST /api/store/dispense`` route, which is untouched.

Communication direction is device -> Flask only. Flask never dials out to a
private LAN address, so the same firmware works whether Flask runs on the
campus network or on Render.
"""

from __future__ import annotations

import logging

from flask import Blueprint, jsonify, request

from services.store_purchase_service import (
    CommandNotFoundError,
    DeviceUnauthorizedError,
    InvalidRequestError,
    InvalidSlotError,
    InvalidTransitionError,
    OutOfStockError,
    StoreUnavailableError,
    TransactionNotFoundError,
    ack_command,
    get_device_mode,
    list_device_commands,
    manual_device_dispense,
    report_result,
)

logger = logging.getLogger(__name__)

store_device_bp = Blueprint("store_device", __name__)


def _error_response(exc: Exception):
    """Map a service error to an HTTP response for device clients."""
    if isinstance(exc, InvalidRequestError):
        return jsonify({"status": "error", "message": str(exc)}), 400
    if isinstance(exc, DeviceUnauthorizedError):
        return jsonify({"status": "error", "message": str(exc)}), 403
    if isinstance(exc, (CommandNotFoundError, TransactionNotFoundError, InvalidSlotError)):
        return jsonify({"status": "error", "message": str(exc)}), 404
    if isinstance(exc, (InvalidTransitionError, OutOfStockError)):
        return jsonify({"status": "error", "message": str(exc)}), 409
    if isinstance(exc, StoreUnavailableError):
        return jsonify({"status": "error", "message": str(exc)}), 503
    logger.exception("Unhandled store device error")
    return jsonify({"status": "error", "message": "store device request failed"}), 500


def _json_body() -> dict:
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        raise InvalidRequestError("JSON body is required")
    return payload


@store_device_bp.get("/commands")
def device_commands():
    """Return dispense commands waiting for a device.

    Read-only, so a dropped response never loses a command. The device claims
    work with POST /device/ack.
    """
    try:
        device_id = request.args.get("device_id")
        commands = list_device_commands(device_id)
        return (
            jsonify(
                {
                    "status": "ok",
                    "device_mode": get_device_mode(),
                    "count": len(commands),
                    "commands": commands,
                }
            ),
            200,
        )
    except Exception as exc:
        return _error_response(exc)


@store_device_bp.post("/ack")
def device_ack():
    """Claim a queued command so no other device can take the same one."""
    try:
        payload = _json_body()
        record = ack_command(payload.get("transaction_id"), payload.get("device_id"))
        return (
            jsonify(
                {
                    "status": "ok",
                    "transaction_id": record["transaction_id"],
                    "transaction_status": record["status"],
                    "item_slot": record["item_slot"],
                    "dispenser_slot": record["dispenser_slot"],
                }
            ),
            200,
        )
    except Exception as exc:
        return _error_response(exc)


@store_device_bp.post("/result")
def device_result():
    """Record the dispense outcome. A failure returns the reserved unit to stock."""
    try:
        payload = _json_body()
        record = report_result(
            payload.get("transaction_id"),
            payload.get("device_id"),
            payload.get("success"),
            payload.get("message"),
        )
        return (
            jsonify(
                {
                    "status": "ok",
                    "transaction_id": record["transaction_id"],
                    "transaction_status": record["status"],
                    "item_slot": record["item_slot"],
                    "failure_reason": record.get("failure_reason"),
                }
            ),
            200,
        )
    except Exception as exc:
        return _error_response(exc)


@store_device_bp.post("/manual-dispense")
def device_manual_dispense():
    """Record a physical button dispense that already happened on the device.

    Stock is decremented here; the servo has already moved. A failed report
    must not be treated as a reason to reverse the dispense on the ESP32.
    """
    try:
        payload = _json_body()
        result = manual_device_dispense(
            payload.get("device_id"),
            payload.get("dispenser_slot"),
        )
        return jsonify(result), 200
    except Exception as exc:
        return _error_response(exc)
