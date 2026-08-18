"""Smart store purchase + physical dispense transaction service.

This service owns the NEW UI purchase flow and the button-first
device report path:

    POST /api/store/purchase
    GET  /api/store/purchase/<transaction_id>
    GET  /api/store/history
    GET  /api/store/sales
    POST /api/store/identify
    GET  /api/store/device/commands
    POST /api/store/device/ack
    POST /api/store/device/result
    POST /api/store/device/manual-dispense

It deliberately does NOT touch ``inventory_service.dispense_item()`` or the
existing ``POST /api/store/dispense`` route, which remain the manual/legacy
dispense path.

Firebase nodes
--------------
``store_inventory``        Existing. Read live; only ``{slot}/stock`` is mutated,
                          and only through a Realtime Database transaction so
                          stock can never go below zero.
``store_sales_log``        Existing. Reused as the transaction ledger. New
                          records carry user/status fields; legacy records
                          (no ``status``) are normalised as completed on read.
``store_dispense_queue``   New. Holds ONLY active hardware commands, keyed by
                          transaction_id. Entries are removed when a
                          transaction reaches a terminal state, so the node the
                          ESP32 polls every couple of seconds stays tiny.
``store_purchase_keys``    New. Tiny idempotency index mapping
                          idempotency_key -> transaction_id. Required because
                          queue entries are deleted on completion (so the queue
                          cannot answer "was this key already used?") and
                          scanning the ledger would be a read-then-write race.
                          It stores no purchase data.

Device modes
------------
``STORE_DEVICE_MODE=hardware``   (default) A purchase stays ``pending`` until a
                                 real device reports a result. Nothing is ever
                                 auto-completed.
``STORE_DEVICE_MODE=simulation`` Development only. The device result is
                                 simulated immediately and every affected
                                 record is tagged ``simulated: true`` with
                                 ``device_id: "simulator"``.

Simulation is never implicit: an unset or unrecognised value falls back to
hardware mode.
"""

from __future__ import annotations

import logging
import os
import threading
import uuid
from datetime import datetime, timedelta, timezone

from firebase_config import get_ref

# Card UID -> person lookups already used by the RFID gate. Imported read-only;
# attendance_service is not modified by this module.
from services.attendance_service import (
    find_staff_by_rfid,
    find_student_by_rfid,
    find_visitor_by_rfid,
)

logger = logging.getLogger(__name__)

# --- Transaction states -----------------------------------------------------

STATUS_PENDING = "pending"
STATUS_DISPENSING = "dispensing"
STATUS_COMPLETED = "completed"
STATUS_FAILED = "failed"

TERMINAL_STATUSES = (STATUS_COMPLETED, STATUS_FAILED)
ACTIVE_STATUSES = (STATUS_PENDING, STATUS_DISPENSING)

# --- Device modes -----------------------------------------------------------

DEVICE_MODE_HARDWARE = "hardware"
DEVICE_MODE_SIMULATION = "simulation"
DEFAULT_DEVICE_MODE = DEVICE_MODE_HARDWARE
SIMULATED_DEVICE_ID = "simulator"

# --- Firebase paths ---------------------------------------------------------

INVENTORY_PATH = "store_inventory"
LEDGER_PATH = "store_sales_log"
QUEUE_PATH = "store_dispense_queue"
KEYS_PATH = "store_purchase_keys"

PURCHASE_SOURCE = "smart_store_purchase"
MANUAL_PURCHASE_SOURCE = "smart_store_manual"
PURCHASE_METHOD_MANUAL_BUTTON = "manual_button"
ALLOWED_STORE_DEVICE_ID = "esp32_store_01"
ALLOWED_DISPENSER_SLOTS = (1, 2, 3)

_TIMESTAMP_FORMAT = "%Y-%m-%dT%H:%M:%SZ"
_DEFAULT_COMMAND_TTL_SECONDS = 90
_MAX_HISTORY_LIMIT = 200
_DEFAULT_HISTORY_LIMIT = 50

# Firebase keys may not contain these characters, and neither may any value we
# interpolate into a reference path.
_FORBIDDEN_KEY_CHARS = ("/", ".", "#", "$", "[", "]")
_MAX_KEY_LENGTH = 128

# Same-process fast path so concurrent requests for one slot do not spin on
# Realtime Database transaction retries. Mirrors the lock style already used in
# attendance_service. Correctness never depends on this lock.
_slot_locks: dict[str, threading.Lock] = {}
_slot_locks_guard = threading.Lock()


# --- Errors -----------------------------------------------------------------


class PurchaseError(Exception):
    """Base class for store purchase failures."""


class InvalidUserError(PurchaseError):
    """Raised when a user_id/card_uid cannot be resolved in Firebase."""


class InvalidSlotError(PurchaseError):
    """Raised when an item_slot is missing or not physically dispensable."""


class OutOfStockError(PurchaseError):
    """Raised when a slot has no stock left to reserve."""


class InvalidRequestError(PurchaseError):
    """Raised when request fields are missing or malformed."""


class TransactionNotFoundError(PurchaseError):
    """Raised when a transaction_id does not exist in the ledger."""


class CommandNotFoundError(PurchaseError):
    """Raised when a device command is absent or no longer active."""


class InvalidTransitionError(PurchaseError):
    """Raised when a state transition is not legal from the current state."""


class DeviceUnauthorizedError(PurchaseError):
    """Raised when a device reports a result it is not allowed to finalize."""


class StoreUnavailableError(PurchaseError):
    """Raised when Firebase cannot be reached or a transaction keeps aborting."""


class _AlreadyFinal(Exception):
    """Internal: transaction already reached a terminal state."""

    def __init__(self, record: dict) -> None:
        super().__init__("transaction already final")
        self.record = record


class _AlreadyClaimed(Exception):
    """Internal: idempotency key was already used."""

    def __init__(self, value: dict | None) -> None:
        super().__init__("idempotency key already claimed")
        self.value = value


class _AlreadyReleased(Exception):
    """Internal: reserved stock was already released for this transaction."""


# --- Helpers ----------------------------------------------------------------


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _iso(moment: datetime) -> str:
    return moment.strftime(_TIMESTAMP_FORMAT)


def _epoch(moment: datetime) -> int:
    return int(moment.timestamp())


def get_device_mode() -> str:
    """Return the configured device mode, defaulting to the safe hardware mode."""
    raw = os.getenv("STORE_DEVICE_MODE", "").strip().lower()
    if raw == DEVICE_MODE_SIMULATION:
        return DEVICE_MODE_SIMULATION
    if raw and raw != DEVICE_MODE_HARDWARE:
        logger.warning(
            "Unrecognised STORE_DEVICE_MODE=%r; falling back to %s mode",
            raw,
            DEVICE_MODE_HARDWARE,
        )
    return DEVICE_MODE_HARDWARE


def is_simulation_mode() -> bool:
    """Return True only when simulation mode is explicitly configured."""
    return get_device_mode() == DEVICE_MODE_SIMULATION


def _command_ttl_seconds() -> int:
    raw = os.getenv("STORE_COMMAND_TTL_SECONDS", "").strip()
    if not raw:
        return _DEFAULT_COMMAND_TTL_SECONDS
    try:
        ttl = int(raw)
    except ValueError:
        logger.warning("Invalid STORE_COMMAND_TTL_SECONDS=%r; using default", raw)
        return _DEFAULT_COMMAND_TTL_SECONDS
    return ttl if ttl > 0 else _DEFAULT_COMMAND_TTL_SECONDS


def _clean_key(value: object, field: str) -> str:
    """Validate a value that will be interpolated into a Firebase path."""
    if not isinstance(value, str):
        raise InvalidRequestError(f"{field} is required")
    cleaned = value.strip()
    if not cleaned:
        raise InvalidRequestError(f"{field} is required")
    if len(cleaned) > _MAX_KEY_LENGTH:
        raise InvalidRequestError(f"{field} is too long")
    for char in _FORBIDDEN_KEY_CHARS:
        if char in cleaned:
            raise InvalidRequestError(f"{field} contains invalid characters")
    return cleaned


def _slot_lock(item_slot: str) -> threading.Lock:
    with _slot_locks_guard:
        lock = _slot_locks.get(item_slot)
        if lock is None:
            lock = threading.Lock()
            _slot_locks[item_slot] = lock
        return lock


def _coerce_int(value: object, default: int = 0) -> int:
    if isinstance(value, bool):
        return default
    try:
        return int(value)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return default


def _coerce_price(value: object) -> int | float:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return 0
    return value


# --- User identification ----------------------------------------------------

# Resolution order matches the existing RFID gate behaviour.
_ROLE_NODES = (("students", "student"), ("staff", "staff"), ("visitor", "visitor"))


def resolve_user(user_id: object) -> dict:
    """Resolve a user_id to {id, name, role} using Firebase as the only source.

    A role supplied by the client is never used; it is always derived here.
    """
    cleaned = _clean_key(user_id, "user_id")

    for node, role in _ROLE_NODES:
        try:
            record = get_ref(f"{node}/{cleaned}").get()
        except Exception as exc:
            raise StoreUnavailableError("user directory unavailable") from exc
        if isinstance(record, dict):
            name = record.get("name")
            return {
                "id": cleaned,
                "name": name if isinstance(name, str) else "",
                "role": role,
            }

    raise InvalidUserError("user not found")


def identify_by_card(card_uid: object) -> dict:
    """Resolve an RFID card UID to {id, name, role}.

    Read-only: unlike POST /api/rfid/scan this writes no gate_log or
    attendance_log entry, so the gate and attendance systems are untouched.
    """
    if not isinstance(card_uid, str) or not card_uid.strip():
        raise InvalidRequestError("card_uid is required")
    cleaned = card_uid.strip()

    finders = (
        (find_student_by_rfid, "student"),
        (find_staff_by_rfid, "staff"),
        (find_visitor_by_rfid, "visitor"),
    )

    for finder, role in finders:
        try:
            found = finder(cleaned)
        except Exception as exc:
            raise StoreUnavailableError("user directory unavailable") from exc
        if found is None:
            continue
        person_id, person = found
        name = person.get("name") if isinstance(person, dict) else ""
        return {
            "id": person_id,
            "name": name if isinstance(name, str) else "",
            "role": role,
        }

    raise InvalidUserError("invalid RFID card")


# --- Live inventory ---------------------------------------------------------


def _read_slot(item_slot: str) -> dict:
    """Read one live inventory slot. Item, price and dispenser_slot always come
    from Firebase, never from the client and never from a hardcoded table."""
    try:
        record = get_ref(f"{INVENTORY_PATH}/{item_slot}").get()
    except Exception as exc:
        raise StoreUnavailableError("inventory unavailable") from exc

    if not isinstance(record, dict):
        raise InvalidSlotError("item not found")

    item_name = record.get("item")
    dispenser_slot = record.get("dispenser_slot")
    if isinstance(dispenser_slot, bool) or not isinstance(dispenser_slot, (int, float)):
        raise InvalidSlotError("item slot is not mapped to a physical dispenser")

    return {
        "item_slot": item_slot,
        "item": item_name if isinstance(item_name, str) else "",
        "price": _coerce_price(record.get("price")),
        "stock": _coerce_int(record.get("stock")),
        "dispenser_slot": int(dispenser_slot),
    }


def _find_slot_by_dispenser(dispenser_slot: int) -> dict:
    """Resolve a physical dispenser number to a live inventory slot.

    Mapping always comes from the ``store_inventory.dispenser_slot`` field —
    never from a hardcoded ``slot_N == N`` table.
    """
    try:
        raw = get_ref(INVENTORY_PATH).get() or {}
    except Exception as exc:
        raise StoreUnavailableError("inventory unavailable") from exc
    if not isinstance(raw, dict):
        raise InvalidSlotError("dispenser slot is not mapped to inventory")

    matches: list[str] = []
    for item_slot, record in raw.items():
        if not isinstance(item_slot, str) or not item_slot.strip():
            continue
        if not isinstance(record, dict):
            continue
        mapped = record.get("dispenser_slot")
        if isinstance(mapped, bool) or not isinstance(mapped, (int, float)):
            continue
        if int(mapped) == dispenser_slot:
            matches.append(item_slot.strip())

    if not matches:
        raise InvalidSlotError("dispenser slot is not mapped to inventory")
    matches.sort()
    return _read_slot(matches[0])


# --- Stock reservation ------------------------------------------------------


def _reserve_stock(item_slot: str) -> int:
    """Atomically decrement stock by one. Returns the remaining stock.

    Raises OutOfStockError without writing when stock is not a positive number,
    so 0 can never become -1.
    """

    def _update(current: object) -> int:
        stock = current if isinstance(current, int) and not isinstance(current, bool) else None
        if stock is None:
            stock = _coerce_int(current, default=0)
        if stock <= 0:
            raise OutOfStockError("item out of stock")
        return stock - 1

    with _slot_lock(item_slot):
        try:
            return int(get_ref(f"{INVENTORY_PATH}/{item_slot}/stock").transaction(_update))
        except OutOfStockError:
            raise
        except Exception as exc:
            raise StoreUnavailableError("could not reserve stock") from exc


def _release_stock(transaction_id: str, item_slot: str) -> bool:
    """Give one reserved unit back to a slot, at most once per transaction.

    The ``stock_released`` flag on the ledger record is claimed through a
    transaction first, so a retrying device or the expiry sweeper can never
    double-credit stock. If the increment then fails the flag is reset so the
    sweeper can retry.
    """

    def _claim(current: object) -> bool:
        if current is True:
            raise _AlreadyReleased()
        return True

    flag_ref = get_ref(f"{LEDGER_PATH}/{transaction_id}/stock_released")
    try:
        flag_ref.transaction(_claim)
    except _AlreadyReleased:
        return False
    except Exception as exc:
        raise StoreUnavailableError("could not release stock") from exc

    def _increment(current: object) -> int:
        return _coerce_int(current, default=0) + 1

    with _slot_lock(item_slot):
        try:
            get_ref(f"{INVENTORY_PATH}/{item_slot}/stock").transaction(_increment)
        except Exception:
            logger.exception(
                "Failed to release reserved stock for %s (%s); flag reset for retry",
                transaction_id,
                item_slot,
            )
            try:
                flag_ref.set(False)
            except Exception:
                logger.exception("Failed to reset stock_released for %s", transaction_id)
            raise StoreUnavailableError("could not release stock")

    return True


# --- Ledger -----------------------------------------------------------------


def _normalise_ledger_record(key: str, record: dict) -> dict:
    """Normalise a ledger entry, tolerating legacy /dispense records that have
    no user or status fields."""
    status = record.get("status")
    if status not in (STATUS_PENDING, STATUS_DISPENSING, STATUS_COMPLETED, STATUS_FAILED):
        status = STATUS_COMPLETED

    dispenser_slot = record.get("dispenser_slot")
    if isinstance(dispenser_slot, bool) or not isinstance(dispenser_slot, (int, float)):
        dispenser_slot = None
    else:
        dispenser_slot = int(dispenser_slot)

    timestamp = record.get("requested_at") or record.get("timestamp") or ""
    user_id = record.get("user_id")
    user_name = record.get("user_name")
    role = record.get("role")

    return {
        "transaction_id": record.get("transaction_id") or key,
        "user_id": user_id if isinstance(user_id, str) else None,
        "user_name": user_name if isinstance(user_name, str) else "",
        "role": role if isinstance(role, str) else None,
        "item_slot": record.get("item_slot") if isinstance(record.get("item_slot"), str) else "",
        "item": record.get("item") if isinstance(record.get("item"), str) else "",
        "price": _coerce_price(record.get("price")),
        "dispenser_slot": dispenser_slot,
        "status": status,
        "requested_at": timestamp if isinstance(timestamp, str) else "",
        "completed_at": record.get("completed_at") if isinstance(record.get("completed_at"), str) else None,
        "device_id": record.get("device_id") if isinstance(record.get("device_id"), str) else None,
        "idempotency_key": record.get("idempotency_key") if isinstance(record.get("idempotency_key"), str) else None,
        "timestamp": timestamp if isinstance(timestamp, str) else "",
        "failure_reason": record.get("failure_reason") if isinstance(record.get("failure_reason"), str) else None,
        "simulated": record.get("simulated") is True,
        "source": record.get("source") if isinstance(record.get("source"), str) else None,
        "purchase_method": (
            record.get("purchase_method")
            if isinstance(record.get("purchase_method"), str)
            else None
        ),
    }


def _read_ledger(transaction_id: str) -> dict:
    try:
        record = get_ref(f"{LEDGER_PATH}/{transaction_id}").get()
    except Exception as exc:
        raise StoreUnavailableError("purchase ledger unavailable") from exc
    if not isinstance(record, dict):
        raise TransactionNotFoundError("transaction not found")
    return _normalise_ledger_record(transaction_id, record)


def _transition_ledger(
    transaction_id: str,
    allowed_from: tuple[str, ...],
    new_status: str,
    extra: dict | None = None,
) -> dict:
    """Move a transaction to a new state atomically.

    Raises _AlreadyFinal when the transaction is already completed/failed, which
    makes terminal transitions (and therefore stock release) exactly-once.
    """

    def _update(current: object) -> dict:
        if not isinstance(current, dict):
            raise TransactionNotFoundError("transaction not found")
        status = current.get("status")
        if status in TERMINAL_STATUSES:
            raise _AlreadyFinal(_normalise_ledger_record(transaction_id, current))
        if allowed_from and status not in allowed_from:
            raise InvalidTransitionError(
                f"cannot move transaction from {status!r} to {new_status!r}"
            )
        updated = dict(current)
        updated["status"] = new_status
        if extra:
            updated.update(extra)
        return updated

    try:
        result = get_ref(f"{LEDGER_PATH}/{transaction_id}").transaction(_update)
    except (_AlreadyFinal, TransactionNotFoundError, InvalidTransitionError):
        raise
    except Exception as exc:
        raise StoreUnavailableError("could not update transaction") from exc

    return _normalise_ledger_record(transaction_id, result if isinstance(result, dict) else {})


# --- Dispense queue ---------------------------------------------------------


def _queue_command(
    transaction_id: str,
    item_slot: str,
    dispenser_slot: int,
    created: datetime,
) -> dict:
    expires = created + timedelta(seconds=_command_ttl_seconds())
    command = {
        "transaction_id": transaction_id,
        "item_slot": item_slot,
        "dispenser_slot": dispenser_slot,
        "device_id": "",
        "created_at": _iso(created),
        "created_at_epoch": _epoch(created),
        "expires_at": _iso(expires),
        "expires_at_epoch": _epoch(expires),
        "status": STATUS_PENDING,
    }
    try:
        get_ref(f"{QUEUE_PATH}/{transaction_id}").set(command)
    except Exception as exc:
        raise StoreUnavailableError("could not queue dispense command") from exc
    return command


def _close_command(transaction_id: str) -> None:
    """Remove a command from the queue so only active work remains there."""
    try:
        get_ref(f"{QUEUE_PATH}/{transaction_id}").delete()
    except Exception:
        logger.exception("Failed to remove dispense command %s", transaction_id)


def _read_queue() -> dict:
    try:
        raw = get_ref(QUEUE_PATH).get() or {}
    except Exception as exc:
        raise StoreUnavailableError("dispense queue unavailable") from exc
    # Snapshot so expiry recovery can delete queue nodes while iterating.
    return dict(raw) if isinstance(raw, dict) else {}


# --- Terminal transitions ---------------------------------------------------


def _complete_transaction(
    transaction_id: str,
    device_id: str,
    simulated: bool = False,
) -> dict:
    """Mark a transaction completed. Reserved stock stays consumed."""
    extra = {
        "completed_at": _iso(_now()),
        "device_id": device_id,
        "failure_reason": None,
    }
    if simulated:
        extra["simulated"] = True

    try:
        record = _transition_ledger(
            transaction_id, ACTIVE_STATUSES, STATUS_COMPLETED, extra
        )
    except _AlreadyFinal as final:
        _close_command(transaction_id)
        return final.record

    _close_command(transaction_id)
    return record


def _fail_transaction(
    transaction_id: str,
    item_slot: str,
    device_id: str,
    reason: str,
    simulated: bool = False,
) -> dict:
    """Mark a transaction failed and give the reserved unit back to stock."""
    extra = {
        "completed_at": _iso(_now()),
        "device_id": device_id,
        "failure_reason": reason,
    }
    if simulated:
        extra["simulated"] = True

    try:
        record = _transition_ledger(
            transaction_id, ACTIVE_STATUSES, STATUS_FAILED, extra
        )
    except _AlreadyFinal as final:
        _close_command(transaction_id)
        return final.record

    if item_slot:
        try:
            _release_stock(transaction_id, item_slot)
        except StoreUnavailableError:
            logger.exception(
                "Transaction %s failed but stock release did not complete", transaction_id
            )

    _close_command(transaction_id)
    return _read_ledger(transaction_id)


# --- Expiry sweep -----------------------------------------------------------


def _resolve_queue_item_slot(transaction_id: str, command: dict) -> str:
    """Prefer the queue's item_slot; fall back to the ledger when malformed."""
    item_slot = command.get("item_slot")
    if isinstance(item_slot, str) and item_slot.strip():
        return item_slot.strip()
    try:
        ledger = _read_ledger(transaction_id)
    except TransactionNotFoundError:
        return ""
    fallback = ledger.get("item_slot")
    return fallback if isinstance(fallback, str) else ""


def sweep_expired_commands() -> int:
    """Fail commands whose deadline passed and restore their reserved stock.

    This is the recovery path for an ESP32 that never answers, a device that
    dies mid-dispense, or a Firebase outage that interrupted a purchase. It runs
    lazily from the purchase, status and device endpoints so no background
    scheduler is needed.

    Missing, zero, or otherwise invalid ``expires_at_epoch`` values are treated
    as recoverable failures: the ledger is marked failed and reserved stock is
    restored exactly once. Queue entries are never deleted while leaving an
    active ledger reservation behind.
    """
    try:
        queue = _read_queue()
    except StoreUnavailableError:
        return 0

    now_epoch = _epoch(_now())
    swept = 0

    for transaction_id, command in queue.items():
        if not isinstance(command, dict) or not isinstance(transaction_id, str):
            continue

        expires_at_epoch = _coerce_int(command.get("expires_at_epoch"), default=0)
        if expires_at_epoch > now_epoch:
            continue

        if expires_at_epoch <= 0:
            reason = "dispense command has invalid or missing expiry; recovered"
        else:
            reason = "dispense command expired before the device confirmed it"

        item_slot = _resolve_queue_item_slot(transaction_id, command)
        device_id = command.get("device_id")
        try:
            _fail_transaction(
                transaction_id,
                item_slot,
                device_id if isinstance(device_id, str) and device_id else "expired",
                reason,
            )
            swept += 1
        except TransactionNotFoundError:
            _close_command(transaction_id)
        except PurchaseError:
            logger.exception("Failed to sweep expired command %s", transaction_id)

    return swept


# --- Purchase ---------------------------------------------------------------


def _claim_idempotency_key(idempotency_key: str, transaction_id: str, created: datetime) -> None:
    """Atomically claim an idempotency key. Raises _AlreadyClaimed if taken."""

    def _update(current: object) -> dict:
        if current is not None:
            raise _AlreadyClaimed(current if isinstance(current, dict) else None)
        return {"transaction_id": transaction_id, "created_at": _iso(created)}

    try:
        get_ref(f"{KEYS_PATH}/{idempotency_key}").transaction(_update)
    except _AlreadyClaimed:
        raise
    except Exception as exc:
        raise StoreUnavailableError("could not register purchase request") from exc


def _release_idempotency_key(idempotency_key: str) -> None:
    """Free a key claimed for a purchase that never became a transaction."""
    try:
        get_ref(f"{KEYS_PATH}/{idempotency_key}").delete()
    except Exception:
        logger.exception("Failed to release idempotency key %s", idempotency_key)


def create_purchase(
    user_id: object,
    item_slot: object,
    idempotency_key: object,
) -> dict:
    """Create a purchase transaction and queue its physical dispense command.

    Ordering guarantees:
      * the ledger record and queue command are written before any device can
        see the command, so a dispense can never happen unrecorded;
      * stock is reserved atomically before the transaction exists, so stock
        never goes negative and two users cannot take the last unit;
      * a repeated idempotency_key returns the existing transaction instead of
        dispensing twice.
    """
    slot_key = _clean_key(item_slot, "item_slot")
    key = _clean_key(idempotency_key, "idempotency_key")
    user = resolve_user(user_id)

    # Reconcile anything the hardware abandoned before taking new stock.
    sweep_expired_commands()

    slot = _read_slot(slot_key)

    created = _now()
    transaction_id = f"txn_{uuid.uuid4().hex}"

    try:
        _claim_idempotency_key(key, transaction_id, created)
    except _AlreadyClaimed as claimed:
        existing_id = None
        if claimed.value:
            candidate = claimed.value.get("transaction_id")
            if isinstance(candidate, str):
                existing_id = candidate
        if existing_id:
            try:
                record = _read_ledger(existing_id)
                return {"duplicate": True, **_purchase_response(record, slot)}
            except TransactionNotFoundError:
                # Claimed moments ago by a concurrent request that has not
                # written the ledger row yet. The client polls for status.
                pass
        return {
            "duplicate": True,
            "status": STATUS_PENDING,
            "transaction_id": existing_id or "",
            "item": slot["item"],
            "item_slot": slot["item_slot"],
            "price": slot["price"],
            "dispenser_slot": slot["dispenser_slot"],
            "remaining_stock": slot["stock"],
        }

    # Reserve first: if this aborts, no transaction and no command exist.
    try:
        remaining_stock = _reserve_stock(slot_key)
    except PurchaseError:
        _release_idempotency_key(key)
        raise

    simulated = is_simulation_mode()
    record = {
        "transaction_id": transaction_id,
        "user_id": user["id"],
        "user_name": user["name"],
        "role": user["role"],
        "item_slot": slot["item_slot"],
        "item": slot["item"],
        "price": slot["price"],
        "dispenser_slot": slot["dispenser_slot"],
        "status": STATUS_PENDING,
        "requested_at": _iso(created),
        "completed_at": None,
        "device_id": SIMULATED_DEVICE_ID if simulated else "",
        "idempotency_key": key,
        "stock_released": False,
        "failure_reason": None,
        "simulated": simulated,
        # Kept so legacy readers of store_sales_log still see a timestamp.
        "timestamp": _iso(created),
        "source": PURCHASE_SOURCE,
    }

    try:
        get_ref(f"{LEDGER_PATH}/{transaction_id}").set(record)
    except Exception as exc:
        _rollback_reservation(slot_key, key)
        raise StoreUnavailableError("could not record purchase") from exc

    try:
        _queue_command(transaction_id, slot["item_slot"], slot["dispenser_slot"], created)
    except StoreUnavailableError:
        _fail_transaction(
            transaction_id,
            slot["item_slot"],
            "",
            "could not queue the dispense command",
        )
        raise

    if simulated:
        # Development shortcut only. Never reached in hardware mode.
        logger.warning(
            "STORE_DEVICE_MODE=simulation: simulating device completion for %s",
            transaction_id,
        )
        final = _simulate_device_cycle(transaction_id)
        return _purchase_response(final, slot, remaining_stock)

    return _purchase_response(_read_ledger(transaction_id), slot, remaining_stock)


def _rollback_reservation(item_slot: str, idempotency_key: str) -> None:
    """Undo a reservation made for a transaction that was never written."""
    def _increment(current: object) -> int:
        return _coerce_int(current, default=0) + 1

    with _slot_lock(item_slot):
        try:
            get_ref(f"{INVENTORY_PATH}/{item_slot}/stock").transaction(_increment)
        except Exception:
            logger.exception("Failed to roll back reservation for %s", item_slot)
    _release_idempotency_key(idempotency_key)


def _purchase_response(
    record: dict,
    slot: dict,
    remaining_stock: int | None = None,
) -> dict:
    if remaining_stock is None:
        try:
            remaining_stock = _read_slot(record.get("item_slot") or slot["item_slot"])["stock"]
        except PurchaseError:
            remaining_stock = slot["stock"]

    return {
        "status": record.get("status", STATUS_PENDING),
        "transaction_id": record.get("transaction_id", ""),
        "item": record.get("item") or slot["item"],
        "item_slot": record.get("item_slot") or slot["item_slot"],
        "price": record.get("price", slot["price"]),
        "dispenser_slot": record.get("dispenser_slot") if record.get("dispenser_slot") is not None else slot["dispenser_slot"],
        "remaining_stock": remaining_stock,
        "device_mode": get_device_mode(),
        "simulated": record.get("simulated") is True,
    }


def _simulate_device_cycle(transaction_id: str) -> dict:
    """Run the device handshake locally: ack, then a successful result."""
    try:
        _transition_ledger(
            transaction_id,
            (STATUS_PENDING,),
            STATUS_DISPENSING,
            {"device_id": SIMULATED_DEVICE_ID, "simulated": True},
        )
    except (_AlreadyFinal, InvalidTransitionError, TransactionNotFoundError):
        pass
    return _complete_transaction(transaction_id, SIMULATED_DEVICE_ID, simulated=True)


def get_purchase(transaction_id: object) -> dict:
    """Return the current state of one transaction."""
    cleaned = _clean_key(transaction_id, "transaction_id")
    sweep_expired_commands()
    record = _read_ledger(cleaned)
    record["device_mode"] = get_device_mode()
    record["awaiting_device"] = record["status"] in ACTIVE_STATUSES
    return record


def list_user_purchases(user_id: object, limit: int | None = None) -> list[dict]:
    """Return one user's purchase history, newest first.

    Records belonging to other users, and legacy /dispense records that carry no
    user_id, are never returned.
    """
    cleaned = _clean_key(user_id, "user_id")

    effective_limit = _DEFAULT_HISTORY_LIMIT if limit is None else limit
    if effective_limit <= 0:
        effective_limit = _DEFAULT_HISTORY_LIMIT
    effective_limit = min(effective_limit, _MAX_HISTORY_LIMIT)

    try:
        raw = get_ref(LEDGER_PATH).get() or {}
    except Exception as exc:
        raise StoreUnavailableError("purchase history unavailable") from exc
    if not isinstance(raw, dict):
        return []

    purchases: list[dict] = []
    for key, record in raw.items():
        if not isinstance(record, dict) or not isinstance(key, str):
            continue
        if record.get("user_id") != cleaned:
            continue
        purchases.append(_normalise_ledger_record(key, record))

    purchases.sort(key=lambda entry: entry.get("requested_at") or "", reverse=True)
    return purchases[:effective_limit]


def list_all_sales(limit: int | None = None) -> list[dict]:
    """Return overall store_sales_log history, newest first.

    Includes student-less manual-button records and legacy /dispense rows.
    """
    effective_limit = _DEFAULT_HISTORY_LIMIT if limit is None else limit
    if effective_limit <= 0:
        effective_limit = _DEFAULT_HISTORY_LIMIT
    effective_limit = min(effective_limit, _MAX_HISTORY_LIMIT)

    try:
        raw = get_ref(LEDGER_PATH).get() or {}
    except Exception as exc:
        raise StoreUnavailableError("purchase history unavailable") from exc
    if not isinstance(raw, dict):
        return []

    purchases: list[dict] = []
    for key, record in raw.items():
        if not isinstance(record, dict) or not isinstance(key, str):
            continue
        purchases.append(_normalise_ledger_record(key, record))

    purchases.sort(key=lambda entry: entry.get("requested_at") or "", reverse=True)
    return purchases[:effective_limit]


def manual_device_dispense(device_id: object, dispenser_slot: object) -> dict:
    """Record a completed button-first dispense. No user, no queue.

    The device has already physically dispensed. This only decrements stock and
    writes ``store_sales_log``. A reporting failure on the device must not
    reverse the servo motion.
    """
    cleaned_device = _clean_key(device_id, "device_id")
    if cleaned_device != ALLOWED_STORE_DEVICE_ID:
        raise InvalidRequestError("device_id is not recognised")

    if isinstance(dispenser_slot, bool) or not isinstance(dispenser_slot, (int, float)):
        raise InvalidRequestError("dispenser_slot must be 1, 2, or 3")
    slot_number = int(dispenser_slot)
    if slot_number not in ALLOWED_DISPENSER_SLOTS:
        raise InvalidRequestError("dispenser_slot must be 1, 2, or 3")

    slot = _find_slot_by_dispenser(slot_number)
    remaining_stock = _reserve_stock(slot["item_slot"])

    created = _now()
    timestamp = _iso(created)
    transaction_id = f"txn_{uuid.uuid4().hex}"

    record = {
        "transaction_id": transaction_id,
        "user_id": None,
        "user_name": "",
        "role": None,
        "item_slot": slot["item_slot"],
        "item": slot["item"],
        "price": slot["price"],
        "dispenser_slot": slot["dispenser_slot"],
        "status": STATUS_COMPLETED,
        "requested_at": timestamp,
        "completed_at": timestamp,
        "device_id": cleaned_device,
        "purchase_method": PURCHASE_METHOD_MANUAL_BUTTON,
        "stock_released": False,
        "failure_reason": None,
        "simulated": False,
        "timestamp": timestamp,
        "source": MANUAL_PURCHASE_SOURCE,
    }

    try:
        get_ref(f"{LEDGER_PATH}/{transaction_id}").set(record)
    except Exception as exc:
        def _increment(current: object) -> int:
            return _coerce_int(current, default=0) + 1

        with _slot_lock(slot["item_slot"]):
            try:
                get_ref(f"{INVENTORY_PATH}/{slot['item_slot']}/stock").transaction(_increment)
            except Exception:
                logger.exception(
                    "Failed to roll back stock after ledger write failure for %s",
                    slot["item_slot"],
                )
        raise StoreUnavailableError("could not record purchase") from exc

    return {
        "status": STATUS_COMPLETED,
        "transaction_id": transaction_id,
        "item": slot["item"],
        "item_slot": slot["item_slot"],
        "price": slot["price"],
        "remaining_stock": remaining_stock,
        "purchase_method": PURCHASE_METHOD_MANUAL_BUTTON,
    }


# --- Device endpoints (hardware phase) --------------------------------------


def list_device_commands(device_id: object = None) -> list[dict]:
    """Return dispense commands still waiting for a device.

    Read-only: polling never changes state, so a lost response cannot drop a
    command. A device claims work with ack_command().
    """
    cleaned_device = ""
    if device_id is not None and isinstance(device_id, str) and device_id.strip():
        cleaned_device = device_id.strip()

    sweep_expired_commands()
    queue = _read_queue()

    commands: list[dict] = []
    for transaction_id, command in queue.items():
        if not isinstance(command, dict) or not isinstance(transaction_id, str):
            continue
        if command.get("status") != STATUS_PENDING:
            continue
        owner = command.get("device_id")
        if isinstance(owner, str) and owner and cleaned_device and owner != cleaned_device:
            continue
        commands.append(
            {
                "transaction_id": transaction_id,
                "item_slot": command.get("item_slot", ""),
                "dispenser_slot": command.get("dispenser_slot"),
                "created_at": command.get("created_at", ""),
                "expires_at": command.get("expires_at", ""),
                "status": command.get("status", STATUS_PENDING),
            }
        )

    commands.sort(key=lambda entry: entry.get("created_at") or "")
    return commands


def ack_command(transaction_id: object, device_id: object) -> dict:
    """Claim a queued command for one device.

    The queue node transition is atomic, so if two devices poll the same command
    only one can take it.
    """
    cleaned_id = _clean_key(transaction_id, "transaction_id")
    cleaned_device = _clean_key(device_id, "device_id")

    def _update(current: object) -> dict:
        if not isinstance(current, dict):
            raise CommandNotFoundError("dispense command not found")
        if current.get("status") != STATUS_PENDING:
            raise CommandNotFoundError("dispense command is no longer available")
        updated = dict(current)
        updated["status"] = STATUS_DISPENSING
        updated["device_id"] = cleaned_device
        updated["acked_at"] = _iso(_now())
        return updated

    try:
        get_ref(f"{QUEUE_PATH}/{cleaned_id}").transaction(_update)
    except CommandNotFoundError:
        raise
    except Exception as exc:
        raise StoreUnavailableError("could not acknowledge command") from exc

    record = _transition_ledger(
        cleaned_id,
        (STATUS_PENDING,),
        STATUS_DISPENSING,
        {"device_id": cleaned_device},
    )
    return record


def _assert_result_authorized(transaction_id: str, device_id: str, record: dict) -> None:
    """Ensure only the acknowledging device can finalize an active transaction.

    Terminal transactions are left alone so a lost HTTP retry stays idempotent.
    Active transactions require a queue command in ``dispensing`` whose
    ``device_id`` matches the caller.
    """
    if record.get("status") in TERMINAL_STATUSES:
        return

    try:
        command = get_ref(f"{QUEUE_PATH}/{transaction_id}").get()
    except Exception as exc:
        raise StoreUnavailableError("dispense queue unavailable") from exc

    if not isinstance(command, dict):
        raise CommandNotFoundError("dispense command not found")

    if command.get("status") != STATUS_DISPENSING:
        raise InvalidTransitionError(
            "command must be acknowledged before reporting a result"
        )

    owner = command.get("device_id")
    if not isinstance(owner, str) or not owner.strip():
        raise InvalidTransitionError(
            "command must be acknowledged before reporting a result"
        )
    if owner.strip() != device_id:
        raise DeviceUnauthorizedError(
            "device_id does not match the device that acknowledged this command"
        )


def report_result(
    transaction_id: object,
    device_id: object,
    success: object,
    message: object = None,
) -> dict:
    """Record the device outcome for a command.

    On failure the reserved unit is returned to stock. Repeat calls are safe:
    the terminal transition happens at most once. A device may only finalize a
    command it previously acknowledged.
    """
    cleaned_id = _clean_key(transaction_id, "transaction_id")
    cleaned_device = _clean_key(device_id, "device_id")
    if not isinstance(success, bool):
        raise InvalidRequestError("success must be a boolean")

    record = _read_ledger(cleaned_id)
    _assert_result_authorized(cleaned_id, cleaned_device, record)

    if record.get("status") in TERMINAL_STATUSES:
        return record

    item_slot = record.get("item_slot") or ""

    if success:
        return _complete_transaction(cleaned_id, cleaned_device)

    reason = "device reported a dispense failure"
    if isinstance(message, str) and message.strip():
        reason = message.strip()[:300]
    return _fail_transaction(cleaned_id, item_slot, cleaned_device, reason)
