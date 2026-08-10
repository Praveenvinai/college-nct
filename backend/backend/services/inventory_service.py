"""Store inventory service."""

from __future__ import annotations

from datetime import datetime, timezone

from firebase_config import get_ref


class ItemNotFoundError(Exception):
    """Raised when an inventory slot does not exist."""


class OutOfStockError(Exception):
    """Raised when an inventory slot has no remaining stock."""


def dispense_item(item_slot: str) -> dict:
    """Dispense one unit from a slot: decrement stock and log the sale."""
    item_data = get_ref(f"store_inventory/{item_slot}").get()
    if item_data is None or not isinstance(item_data, dict):
        raise ItemNotFoundError("item not found")

    try:
        stock = int(item_data.get("stock", 0))
    except (TypeError, ValueError):
        stock = 0

    if stock <= 0:
        raise OutOfStockError("item out of stock")

    new_stock = stock - 1
    get_ref(f"store_inventory/{item_slot}/stock").set(new_stock)

    item_name = item_data.get("item", "")
    price = item_data.get("price", 0)
    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    get_ref("store_sales_log").push(
        {
            "item_slot": item_slot,
            "item": item_name,
            "price": price,
            "timestamp": timestamp,
            "source": "smart_store",
        }
    )

    return {
        "item_slot": item_slot,
        "item": item_name,
        "price": price,
        "remaining_stock": new_stock,
    }
