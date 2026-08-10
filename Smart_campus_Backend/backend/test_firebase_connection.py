"""Temporary read-only Firebase connection test (Phase 5.1)."""

from firebase_config import get_ref


def main() -> None:
    print("Firebase Admin SDK initialized.")

    student = get_ref("students/22AIDS001").get()
    print("students/22AIDS001:")
    print(student)

    slot = get_ref("store_inventory/slot_1").get()
    print("store_inventory/slot_1:")
    print(slot)


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"Firebase connection test failed: {type(exc).__name__}: {exc}")
        raise
