"""Smart Store Step 3 hardening tests (in-memory Firebase mock).

Covers inventory, legacy dispense, purchase, idempotency, concurrency,
device poll/ack/result, TTL, malformed queue recovery, wrong-device rejection,
role history, and verifies store code does not write gate/attendance/identity
or classroom nodes.
"""

from __future__ import annotations

import copy
import os
import sys
import threading
import unittest
from pathlib import Path
from unittest import mock

# Allow `python test_store_hardening.py` from backend/backend.
BACKEND_DIR = Path(__file__).resolve().parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))


class FakeRef:
    """Minimal Firebase Realtime Database reference for unit tests."""

    def __init__(self, db: "FakeDB", path: str) -> None:
        self._db = db
        self._path = path.strip("/")

    def get(self):
        return self._db.get_value(self._path)

    def set(self, value) -> None:
        self._db.set_value(self._path, value)
        self._db.record_write(self._path)

    def delete(self) -> None:
        self._db.delete_value(self._path)
        self._db.record_write(self._path)

    def push(self, value) -> None:
        key = self._db.next_push_key()
        child = f"{self._path}/{key}" if self._path else key
        self._db.set_value(child, value)
        self._db.record_write(child)

    def transaction(self, update_fn):
        with self._db.lock:
            current = self._db.get_value(self._path)
            updated = update_fn(current)
            self._db.set_value(self._path, updated)
            self._db.record_write(self._path)
            return updated


class FakeDB:
    def __init__(self) -> None:
        self.root: dict = {}
        self.lock = threading.RLock()
        self.writes: list[str] = []
        self._push_i = 0

    def next_push_key(self) -> str:
        self._push_i += 1
        return f"push_{self._push_i:04d}"

    def record_write(self, path: str) -> None:
        root = path.split("/", 1)[0] if path else ""
        if root:
            self.writes.append(root)

    def get_value(self, path: str):
        if not path:
            return copy.deepcopy(self.root)
        node = self.root
        for part in path.split("/"):
            if not isinstance(node, dict) or part not in node:
                return None
            node = node[part]
        # Firebase Admin returns deserialized copies, not live references.
        return copy.deepcopy(node)

    def set_value(self, path: str, value) -> None:
        if not path:
            if not isinstance(value, dict):
                raise TypeError("root must be a dict")
            self.root = value
            return
        parts = path.split("/")
        node = self.root
        for part in parts[:-1]:
            child = node.get(part)
            if not isinstance(child, dict):
                child = {}
                node[part] = child
            node = child
        node[parts[-1]] = value

    def delete_value(self, path: str) -> None:
        if not path:
            self.root = {}
            return
        parts = path.split("/")
        node = self.root
        for part in parts[:-1]:
            if not isinstance(node, dict) or part not in node:
                return
            node = node[part]
        if isinstance(node, dict):
            node.pop(parts[-1], None)


def _seed_store(db: FakeDB) -> None:
    db.root = {
        "students": {
            "stu_1": {"name": "Ada Student", "rfid_uid": "CARD-STU"},
        },
        "staff": {
            "staff_1": {"name": "Bob Staff", "rfid_uid": "CARD-STAFF"},
        },
        "visitor": {
            "vis_1": {"name": "Vera Visitor", "rfid_uid": "CARD-VIS"},
        },
        "store_inventory": {
            "slot_1": {
                "item": "Gel Pen",
                "price": 10,
                "stock": 5,
                "dispenser_slot": 1,
            },
            "slot_2": {
                "item": "Pencil",
                "price": 5,
                "stock": 2,
                "dispenser_slot": 2,
            },
            "slot_3": {
                "item": "Color Pencil",
                "price": 15,
                "stock": 1,
                "dispenser_slot": 3,
            },
        },
        "store_sales_log": {},
        "store_dispense_queue": {},
        "store_purchase_keys": {},
        "gate_log": {"keep": True},
        "attendance_log": {"keep": True},
        "classroom_notes": {"unit1": {"extracted_text": "hello"}},
    }


class StoreHardeningTests(unittest.TestCase):
    def setUp(self) -> None:
        self.db = FakeDB()
        _seed_store(self.db)
        self.get_ref_patch = mock.patch(
            "firebase_config.get_ref",
            side_effect=lambda path: FakeRef(self.db, path),
        )
        self.get_ref_patch.start()

        # Services import get_ref at module level — patch those symbols too.
        self.patches = [
            mock.patch(
                "services.inventory_service.get_ref",
                side_effect=lambda path: FakeRef(self.db, path),
            ),
            mock.patch(
                "services.store_purchase_service.get_ref",
                side_effect=lambda path: FakeRef(self.db, path),
            ),
            mock.patch(
                "services.attendance_service.get_ref",
                side_effect=lambda path: FakeRef(self.db, path),
            ),
        ]
        for p in self.patches:
            p.start()

        # Hardware mode for device-flow tests unless a case opts into simulation.
        os.environ["STORE_DEVICE_MODE"] = "hardware"
        os.environ["STORE_COMMAND_TTL_SECONDS"] = "90"

        # Fresh imports after patches are live are unnecessary; reload helpers.
        import services.inventory_service as inv
        import services.store_purchase_service as purchase

        self.inv = inv
        self.purchase = purchase

        # Reset process-local locks between tests.
        inv._slot_locks.clear()
        purchase._slot_locks.clear()

        self.writes_before = list(self.db.writes)

    def tearDown(self) -> None:
        for p in self.patches:
            p.stop()
        self.get_ref_patch.stop()
        os.environ.pop("STORE_DEVICE_MODE", None)
        os.environ.pop("STORE_COMMAND_TTL_SECONDS", None)

    def _stock(self, slot: str) -> int:
        return int(self.db.get_value(f"store_inventory/{slot}/stock"))

    def _forbidden_roots_written(self) -> set[str]:
        forbidden = {
            "gate_log",
            "attendance_log",
            "students",
            "staff",
            "visitor",
            "classroom_notes",
        }
        after = self.db.writes[len(self.writes_before) :]
        return {root for root in after if root in forbidden}

    # --- A. Inventory -------------------------------------------------------

    def test_A_list_inventory(self) -> None:
        slots = self.inv.list_inventory()
        self.assertEqual(len(slots), 3)
        self.assertEqual({s["item_slot"] for s in slots}, {"slot_1", "slot_2", "slot_3"})
        self.assertEqual(self._forbidden_roots_written(), set())

    # --- B. Legacy dispense -------------------------------------------------

    def test_B_legacy_dispense_decrements_once(self) -> None:
        before = self._stock("slot_1")
        result = self.inv.dispense_item("slot_1")
        self.assertEqual(result["item_slot"], "slot_1")
        self.assertEqual(result["remaining_stock"], before - 1)
        self.assertEqual(self._stock("slot_1"), before - 1)
        sales = self.db.get_value("store_sales_log") or {}
        self.assertTrue(any(r.get("source") == "smart_store" for r in sales.values()))
        self.assertEqual(self._forbidden_roots_written(), set())

    def test_B_legacy_dispense_never_negative(self) -> None:
        self.db.set_value("store_inventory/slot_3/stock", 0)
        with self.assertRaises(self.inv.OutOfStockError):
            self.inv.dispense_item("slot_3")
        self.assertEqual(self._stock("slot_3"), 0)

    # --- C / D / L purchase + idempotency + roles ---------------------------

    def test_C_D_purchase_and_idempotency(self) -> None:
        before = self._stock("slot_1")
        first = self.purchase.create_purchase("stu_1", "slot_1", "key-alpha")
        self.assertEqual(first["status"], "pending")
        self.assertEqual(self._stock("slot_1"), before - 1)
        txn = first["transaction_id"]

        second = self.purchase.create_purchase("stu_1", "slot_1", "key-alpha")
        self.assertTrue(second.get("duplicate"))
        self.assertEqual(second["transaction_id"], txn)
        self.assertEqual(self._stock("slot_1"), before - 1)

        ledger = self.db.get_value(f"store_sales_log/{txn}")
        self.assertEqual(ledger["user_id"], "stu_1")
        self.assertEqual(ledger["role"], "student")
        self.assertEqual(ledger["item_slot"], "slot_1")
        self.assertEqual(ledger["dispenser_slot"], 1)
        self.assertEqual(self._forbidden_roots_written(), set())

    def test_L_staff_and_visitor_purchase_history(self) -> None:
        staff_buy = self.purchase.create_purchase("staff_1", "slot_2", "key-staff")
        vis_buy = self.purchase.create_purchase("vis_1", "slot_2", "key-vis")
        self.assertEqual(staff_buy["status"], "pending")
        self.assertEqual(vis_buy["status"], "pending")

        staff_hist = self.purchase.list_user_purchases("staff_1")
        vis_hist = self.purchase.list_user_purchases("vis_1")
        stu_hist = self.purchase.list_user_purchases("stu_1")

        self.assertEqual(len(staff_hist), 1)
        self.assertEqual(staff_hist[0]["role"], "staff")
        self.assertEqual(len(vis_hist), 1)
        self.assertEqual(vis_hist[0]["role"], "visitor")
        self.assertEqual(len(stu_hist), 0)

        identified = self.purchase.identify_by_card("CARD-VIS")
        self.assertEqual(identified["id"], "vis_1")
        self.assertEqual(identified["role"], "visitor")
        self.assertEqual(self._forbidden_roots_written(), set())

    # --- E. Concurrent stock safety -----------------------------------------

    def test_E_concurrent_purchases_never_negative(self) -> None:
        self.db.set_value("store_inventory/slot_3/stock", 1)
        results: list[object] = []
        errors: list[BaseException] = []

        def worker(key: str) -> None:
            try:
                results.append(self.purchase.create_purchase("stu_1", "slot_3", key))
            except BaseException as exc:  # noqa: BLE001 - collect for assert
                errors.append(exc)

        t1 = threading.Thread(target=worker, args=("key-c1",))
        t2 = threading.Thread(target=worker, args=("key-c2",))
        t1.start()
        t2.start()
        t1.join()
        t2.join()

        successes = [r for r in results if isinstance(r, dict) and not r.get("duplicate")]
        self.assertEqual(len(successes), 1)
        self.assertEqual(len(errors), 1)
        self.assertIsInstance(errors[0], self.purchase.OutOfStockError)
        self.assertEqual(self._stock("slot_3"), 0)
        self.assertGreaterEqual(self._stock("slot_3"), 0)

    def test_E_concurrent_legacy_dispense_never_negative(self) -> None:
        self.db.set_value("store_inventory/slot_3/stock", 1)
        results: list[object] = []
        errors: list[BaseException] = []

        def worker() -> None:
            try:
                results.append(self.inv.dispense_item("slot_3"))
            except BaseException as exc:  # noqa: BLE001
                errors.append(exc)

        threads = [threading.Thread(target=worker) for _ in range(4)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        self.assertEqual(len(results), 1)
        self.assertEqual(len(errors), 3)
        self.assertEqual(self._stock("slot_3"), 0)

    # --- F / G / J / K device flow ------------------------------------------

    def test_F_K_normal_device_success(self) -> None:
        before = self._stock("slot_1")
        created = self.purchase.create_purchase("stu_1", "slot_1", "key-ok")
        txn = created["transaction_id"]

        commands = self.purchase.list_device_commands("esp32-a")
        self.assertEqual(len(commands), 1)
        self.assertEqual(commands[0]["transaction_id"], txn)

        acked = self.purchase.ack_command(txn, "esp32-a")
        self.assertEqual(acked["status"], "dispensing")

        done = self.purchase.report_result(txn, "esp32-a", True)
        self.assertEqual(done["status"], "completed")
        self.assertEqual(self._stock("slot_1"), before - 1)
        self.assertIsNone(self.db.get_value(f"store_dispense_queue/{txn}"))
        self.assertEqual(self._forbidden_roots_written(), set())

    def test_G_device_failure_restores_stock(self) -> None:
        before = self._stock("slot_1")
        created = self.purchase.create_purchase("stu_1", "slot_1", "key-fail")
        txn = created["transaction_id"]
        self.purchase.ack_command(txn, "esp32-a")
        failed = self.purchase.report_result(txn, "esp32-a", False, "jam")
        self.assertEqual(failed["status"], "failed")
        self.assertEqual(failed["failure_reason"], "jam")
        self.assertEqual(self._stock("slot_1"), before)
        ledger = self.db.get_value(f"store_sales_log/{txn}")
        self.assertTrue(ledger.get("stock_released") is True)

    def test_J_wrong_device_result_rejected(self) -> None:
        before = self._stock("slot_1")
        created = self.purchase.create_purchase("stu_1", "slot_1", "key-wrong")
        txn = created["transaction_id"]
        self.purchase.ack_command(txn, "esp32-a")

        with self.assertRaises(self.purchase.DeviceUnauthorizedError):
            self.purchase.report_result(txn, "esp32-b", True)

        # Still dispensing / reserved — stock not restored or double-taken.
        self.assertEqual(self._stock("slot_1"), before - 1)
        self.assertEqual(
            self.db.get_value(f"store_sales_log/{txn}/status"), "dispensing"
        )

        # Unacked result also rejected.
        created2 = self.purchase.create_purchase("stu_1", "slot_1", "key-unacked")
        txn2 = created2["transaction_id"]
        with self.assertRaises(self.purchase.InvalidTransitionError):
            self.purchase.report_result(txn2, "esp32-a", True)

    # --- H. TTL expiry ------------------------------------------------------

    def test_H_ttl_expiry_restores_stock(self) -> None:
        before = self._stock("slot_1")
        created = self.purchase.create_purchase("stu_1", "slot_1", "key-ttl")
        txn = created["transaction_id"]
        # Force expiry in the past.
        self.db.set_value(f"store_dispense_queue/{txn}/expires_at_epoch", 1)

        swept = self.purchase.sweep_expired_commands()
        self.assertEqual(swept, 1)
        ledger = self.db.get_value(f"store_sales_log/{txn}")
        self.assertEqual(ledger["status"], "failed")
        self.assertIn("expired", ledger["failure_reason"])
        self.assertEqual(self._stock("slot_1"), before)
        self.assertIsNone(self.db.get_value(f"store_dispense_queue/{txn}"))

    # --- I. Malformed queue -------------------------------------------------

    def test_I_malformed_queue_restores_stock(self) -> None:
        before = self._stock("slot_1")
        created = self.purchase.create_purchase("stu_1", "slot_1", "key-malformed")
        txn = created["transaction_id"]
        self.db.set_value(f"store_dispense_queue/{txn}/expires_at_epoch", 0)
        # Also wipe item_slot to force ledger fallback.
        self.db.set_value(f"store_dispense_queue/{txn}/item_slot", "")

        swept = self.purchase.sweep_expired_commands()
        self.assertEqual(swept, 1)
        ledger = self.db.get_value(f"store_sales_log/{txn}")
        self.assertEqual(ledger["status"], "failed")
        self.assertIn("invalid or missing expiry", ledger["failure_reason"])
        self.assertTrue(ledger.get("stock_released") is True)
        self.assertEqual(self._stock("slot_1"), before)
        self.assertIsNone(self.db.get_value(f"store_dispense_queue/{txn}"))

        # Second sweep must not double-credit.
        swept2 = self.purchase.sweep_expired_commands()
        self.assertEqual(swept2, 0)
        self.assertEqual(self._stock("slot_1"), before)

    def test_I_malformed_missing_epoch_restores_stock(self) -> None:
        before = self._stock("slot_2")
        created = self.purchase.create_purchase("staff_1", "slot_2", "key-missing-epoch")
        txn = created["transaction_id"]
        queue = copy.deepcopy(self.db.get_value(f"store_dispense_queue/{txn}"))
        queue.pop("expires_at_epoch", None)
        self.db.set_value(f"store_dispense_queue/{txn}", queue)

        self.purchase.sweep_expired_commands()
        self.assertEqual(
            self.db.get_value(f"store_sales_log/{txn}/status"), "failed"
        )
        self.assertEqual(self._stock("slot_2"), before)

    # --- M. Untouched modules / nodes --------------------------------------

    def test_M_no_writes_to_unrelated_nodes(self) -> None:
        self.purchase.identify_by_card("CARD-STU")
        created = self.purchase.create_purchase("stu_1", "slot_1", "key-safe")
        txn = created["transaction_id"]
        self.purchase.ack_command(txn, "esp32-a")
        self.purchase.report_result(txn, "esp32-a", True)
        self.inv.dispense_item("slot_2")
        self.inv.list_inventory()

        self.assertEqual(self._forbidden_roots_written(), set())
        self.assertEqual(self.db.get_value("gate_log"), {"keep": True})
        self.assertEqual(self.db.get_value("attendance_log"), {"keep": True})
        self.assertEqual(
            self.db.get_value("classroom_notes/unit1/extracted_text"), "hello"
        )
        self.assertEqual(self.db.get_value("students/stu_1/name"), "Ada Student")
        self.assertEqual(self.db.get_value("staff/staff_1/name"), "Bob Staff")
        self.assertEqual(self.db.get_value("visitor/vis_1/name"), "Vera Visitor")

    # --- N. Manual button dispense ------------------------------------------

    def test_N_manual_dispense_completed_no_user(self) -> None:
        before = self._stock("slot_2")
        result = self.purchase.manual_device_dispense("esp32_store_01", 2)

        self.assertEqual(result["status"], "completed")
        self.assertEqual(result["item"], "Pencil")
        self.assertEqual(result["item_slot"], "slot_2")
        self.assertEqual(result["price"], 5)
        self.assertEqual(result["remaining_stock"], before - 1)
        self.assertEqual(result["purchase_method"], "manual_button")
        self.assertTrue(str(result["transaction_id"]).startswith("txn_"))
        self.assertEqual(self._stock("slot_2"), before - 1)

        ledger = self.db.get_value(f"store_sales_log/{result['transaction_id']}")
        self.assertEqual(ledger["status"], "completed")
        self.assertEqual(ledger["purchase_method"], "manual_button")
        self.assertEqual(ledger["source"], "smart_store_manual")
        self.assertIsNone(ledger.get("user_id"))
        self.assertEqual(ledger.get("user_name"), "")
        self.assertIsNone(ledger.get("role"))
        self.assertEqual(ledger["device_id"], "esp32_store_01")
        self.assertEqual(ledger["dispenser_slot"], 2)
        self.assertIsNone(self.db.get_value(f"store_dispense_queue/{result['transaction_id']}"))
        self.assertEqual(self._forbidden_roots_written(), set())

    def test_N_manual_dispense_uses_live_dispenser_slot_mapping(self) -> None:
        # Prove we do not assume slot_1 == dispenser 1.
        self.db.set_value("store_inventory/slot_1/dispenser_slot", 3)
        self.db.set_value("store_inventory/slot_3/dispenser_slot", 1)
        before_slot_1 = self._stock("slot_1")
        before_slot_3 = self._stock("slot_3")

        result = self.purchase.manual_device_dispense("esp32_store_01", 1)
        self.assertEqual(result["item_slot"], "slot_3")
        self.assertEqual(result["item"], "Color Pencil")
        self.assertEqual(self._stock("slot_3"), before_slot_3 - 1)
        self.assertEqual(self._stock("slot_1"), before_slot_1)

    def test_N_manual_dispense_rejects_bad_device_and_slot(self) -> None:
        before = self._stock("slot_1")
        with self.assertRaises(self.purchase.InvalidRequestError):
            self.purchase.manual_device_dispense("esp32-a", 1)
        with self.assertRaises(self.purchase.InvalidRequestError):
            self.purchase.manual_device_dispense("esp32_store_01", 4)
        with self.assertRaises(self.purchase.InvalidRequestError):
            self.purchase.manual_device_dispense("esp32_store_01", "1")
        self.assertEqual(self._stock("slot_1"), before)

    def test_N_manual_dispense_never_negative(self) -> None:
        self.db.set_value("store_inventory/slot_3/stock", 0)
        with self.assertRaises(self.purchase.OutOfStockError):
            self.purchase.manual_device_dispense("esp32_store_01", 3)
        self.assertEqual(self._stock("slot_3"), 0)

    def test_N_list_all_sales_includes_manual_and_user_rows(self) -> None:
        manual = self.purchase.manual_device_dispense("esp32_store_01", 2)
        created = self.purchase.create_purchase("stu_1", "slot_1", "key-overall")
        sales = self.purchase.list_all_sales()
        ids = {row["transaction_id"] for row in sales}
        self.assertIn(manual["transaction_id"], ids)
        self.assertIn(created["transaction_id"], ids)
        user_hist = self.purchase.list_user_purchases("stu_1")
        self.assertEqual(len(user_hist), 1)
        self.assertEqual(user_hist[0]["transaction_id"], created["transaction_id"])

    def test_device_result_http_mapping(self) -> None:
        from flask import Flask

        from routes.store_device import _error_response

        tiny = Flask(__name__)
        with tiny.app_context():
            _body, status = _error_response(
                self.purchase.DeviceUnauthorizedError("nope")
            )
            self.assertEqual(status, 403)
            _body, status = _error_response(
                self.purchase.InvalidTransitionError("not acked")
            )
            self.assertEqual(status, 409)
            _body, status = _error_response(
                self.purchase.OutOfStockError("item out of stock")
            )
            self.assertEqual(status, 409)
            _body, status = _error_response(
                self.purchase.InvalidSlotError("dispenser slot is not mapped to inventory")
            )
            self.assertEqual(status, 404)


if __name__ == "__main__":
    unittest.main(verbosity=2)
