"""Smart store routes."""

from __future__ import annotations

from flask import Blueprint, jsonify, request

from services.inventory_service import (
    ItemNotFoundError,
    OutOfStockError,
    dispense_item,
)

store_bp = Blueprint("store", __name__)


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
