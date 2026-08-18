"""Store inventory service."""

from __future__ import annotations

import threading
from datetime import datetime, timezone

from firebase_config import get_ref


class ItemNotFoundError(Exception):
    """Raised when an inventory slot does not exist."""


class OutOfStockError(Exception):
    """Raised when an inventory slot has no remaining stock."""


# Same-process fast path so concurrent /dispense and /purchase requests for one
# slot do not spin on Realtime Database transaction retries. Correctness comes
# from the Firebase transaction itself, not from this lock.
_slot_locks: dict[str, threading.Lock] = {}
_slot_locks_guard = threading.Lock()


def _slot_lock(item_slot: str) -> threading.Lock:
    with _slot_locks_guard:
        lock = _slot_locks.get(item_slot)
        if lock is None:
            lock = threading.Lock()
            _slot_locks[item_slot] = lock
        return lock


def _coerce_stock(value: object) -> int:
    if isinstance(value, bool):
        return 0
    try:
        return int(value)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return 0


def list_inventory() -> list[dict]:
    """Return store_inventory slots (read-only), ordered by slot key."""
    raw = get_ref("store_inventory").get() or {}
    if not isinstance(raw, dict):
        return []

    slots: list[dict] = []
    for slot_key, record in raw.items():
        if not isinstance(record, dict):
            continue
        if not isinstance(slot_key, str) or not slot_key.strip():
            continue

        item_name = record.get("item", "")
        if not isinstance(item_name, str):
            item_name = ""

        stock = _coerce_stock(record.get("stock", 0))

        price = record.get("price", 0)
        if isinstance(price, bool) or not isinstance(price, (int, float)):
            price = 0

        dispenser_slot = record.get("dispenser_slot")
        if isinstance(dispenser_slot, bool) or not isinstance(dispenser_slot, (int, float)):
            dispenser_slot = None
        else:
            dispenser_slot = int(dispenser_slot)

        slots.append(
            {
                "item_slot": slot_key.strip(),
                "item": item_name,
                "price": price,
                "stock": stock,
                "dispenser_slot": dispenser_slot,
            }
        )

    slots.sort(key=lambda s: (s.get("dispenser_slot") is None, s.get("dispenser_slot") or 0, s["item_slot"]))
    return slots


def dispense_item(item_slot: str) -> dict:
    """Dispense one unit from a slot: decrement stock and log the sale.

    Stock is mutated through a Firebase Realtime Database transaction so this
    legacy path cannot race the purchase flow down to a negative value. The
    HTTP response contract is unchanged.
    """
    item_data = get_ref(f"store_inventory/{item_slot}").get()
    if item_data is None or not isinstance(item_data, dict):
        raise ItemNotFoundError("item not found")

    def _update(current: object) -> int:
        stock = _coerce_stock(current)
        if stock <= 0:
            raise OutOfStockError("item out of stock")
        return stock - 1

    with _slot_lock(item_slot):
        try:
            new_stock = int(get_ref(f"store_inventory/{item_slot}/stock").transaction(_update))
        except OutOfStockError:
            raise
        except Exception as exc:
            raise RuntimeError("could not update inventory stock") from exc

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
