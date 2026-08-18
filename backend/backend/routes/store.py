"""Smart store routes."""

from __future__ import annotations

import logging

from flask import Blueprint, jsonify, request

from routes.store_device import store_device_bp
from services.inventory_service import (
    ItemNotFoundError,
    OutOfStockError,
    dispense_item,
    list_inventory,
)
from services.store_purchase_service import (
    InvalidRequestError,
    InvalidSlotError,
    InvalidUserError,
    OutOfStockError as PurchaseOutOfStockError,
    StoreUnavailableError,
    TransactionNotFoundError,
    create_purchase,
    get_device_mode,
    get_purchase,
    identify_by_card,
    list_all_sales,
    list_user_purchases,
)

logger = logging.getLogger(__name__)

store_bp = Blueprint("store", __name__)

# Hardware polling routes live under /api/store/device/* in their own module.
store_bp.register_blueprint(store_device_bp, url_prefix="/device")


@store_bp.get("/inventory")
def get_inventory():
    """Return store_inventory slots. Read-only; no writes."""
    try:
        slots = list_inventory()
        return jsonify({"count": len(slots), "inventory": slots}), 200
    except Exception:
        logger.exception("Failed to list store inventory")
        return (
            jsonify({"status": "error", "message": "failed to list store inventory"}),
            500,
        )


@store_bp.post("/dispense")
def dispense():
    """Dispense one inventory item from a store slot."""
    try:
        payload = request.get_json(silent=True)
        if not isinstance(payload, dict):
            return jsonify({"status": "error", "message": "JSON body is required"}), 400

        item_slot = payload.get("item_slot")
        if item_slot is None or not isinstance(item_slot, str) or not item_slot.strip():
            return jsonify({"status": "error", "message": "item_slot is required"}), 400
        item_slot = item_slot.strip()

        result = dispense_item(item_slot)
        return (
            jsonify(
                {
                    "status": "success",
                    "message": "item dispensed successfully",
                    "item_slot": result["item_slot"],
                    "item": result["item"],
                    "price": result["price"],
                    "remaining_stock": result["remaining_stock"],
                }
            ),
            200,
        )
    except ItemNotFoundError:
        return jsonify({"status": "error", "message": "item not found"}), 404
    except OutOfStockError:
        return jsonify({"status": "error", "message": "item out of stock"}), 409
    except Exception as exc:
        return jsonify({"status": "error", "message": str(exc)}), 500


# --------------------------------------------------------------------------
# Purchase + physical dispense flow (UI). Separate from /dispense above.
# --------------------------------------------------------------------------


def _purchase_error_response(exc: Exception):
    """Map a purchase service error to an HTTP response."""
    if isinstance(exc, PurchaseOutOfStockError):
        return jsonify({"status": "out_of_stock", "message": "item out of stock"}), 409
    if isinstance(exc, InvalidRequestError):
        return jsonify({"status": "error", "message": str(exc)}), 400
    if isinstance(exc, InvalidUserError):
        return jsonify({"status": "error", "message": str(exc)}), 404
    if isinstance(exc, InvalidSlotError):
        return jsonify({"status": "error", "message": str(exc)}), 404
    if isinstance(exc, TransactionNotFoundError):
        return jsonify({"status": "error", "message": str(exc)}), 404
    if isinstance(exc, StoreUnavailableError):
        return jsonify({"status": "error", "message": str(exc)}), 503
    logger.exception("Unhandled store purchase error")
    return jsonify({"status": "error", "message": "store request failed"}), 500


@store_bp.post("/identify")
def identify():
    """Resolve an RFID card UID to a store user.

    Read-only. Unlike POST /api/rfid/scan this writes no gate_log or
    attendance_log entry, so the gate and attendance systems are unaffected.
    """
    try:
        payload = request.get_json(silent=True)
        if not isinstance(payload, dict):
            raise InvalidRequestError("JSON body is required")

        user = identify_by_card(payload.get("card_uid"))
        return (
            jsonify(
                {
                    "status": "ok",
                    "user_id": user["id"],
                    "user_name": user["name"],
                    "role": user["role"],
                }
            ),
            200,
        )
    except Exception as exc:
        return _purchase_error_response(exc)


@store_bp.post("/purchase")
def purchase():
    """Create a purchase transaction and queue its physical dispense command.

    Only user_id, item_slot and idempotency_key are read from the request.
    Item, price, dispenser_slot, stock and role all come from Firebase.
    """
    try:
        payload = request.get_json(silent=True)
        if not isinstance(payload, dict):
            raise InvalidRequestError("JSON body is required")

        result = create_purchase(
            payload.get("user_id"),
            payload.get("item_slot"),
            payload.get("idempotency_key"),
        )
        return jsonify(result), 200
    except Exception as exc:
        return _purchase_error_response(exc)


@store_bp.get("/purchase/<transaction_id>")
def purchase_status(transaction_id: str):
    """Return the current state of one purchase transaction."""
    try:
        return jsonify(get_purchase(transaction_id)), 200
    except Exception as exc:
        return _purchase_error_response(exc)


@store_bp.get("/history")
def history():
    """Return one user's purchase history. user_id is required so a caller can
    never read another user's purchases."""
    try:
        user_id = request.args.get("user_id")
        if user_id is None or not user_id.strip():
            raise InvalidRequestError("user_id is required")

        limit_raw = request.args.get("limit")
        limit = None
        if limit_raw is not None and limit_raw.strip():
            try:
                limit = int(limit_raw)
            except ValueError:
                raise InvalidRequestError("limit must be an integer")

        purchases = list_user_purchases(user_id, limit)
        return (
            jsonify(
                {
                    "status": "ok",
                    "user_id": user_id.strip(),
                    "count": len(purchases),
                    "device_mode": get_device_mode(),
                    "purchases": purchases,
                }
            ),
            200,
        )
    except Exception as exc:
        return _purchase_error_response(exc)


@store_bp.get("/sales")
def sales():
    """Return overall store_sales_log history, including student-less rows."""
    try:
        limit_raw = request.args.get("limit")
        limit = None
        if limit_raw is not None and limit_raw.strip():
            try:
                limit = int(limit_raw)
            except ValueError:
                raise InvalidRequestError("limit must be an integer")

        purchases = list_all_sales(limit)
        return (
            jsonify(
                {
                    "status": "ok",
                    "count": len(purchases),
                    "device_mode": get_device_mode(),
                    "purchases": purchases,
                }
            ),
            200,
        )
    except Exception as exc:
        return _purchase_error_response(exc)
