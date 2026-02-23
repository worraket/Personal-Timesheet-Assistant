#!/usr/bin/env python3
"""
=============================================================
  PersonalTimesheetAssistant - Standalone Database Migration Tool
=============================================================
  Run this script to bring your timesheet.db up to date with
  the latest application schema.

  Usage:
      python migrate_database.py
      python migrate_database.py --db path/to/timesheet.db
      python migrate_database.py --check-only

  Options:
      --db PATH       Path to the SQLite database file (default: ./timesheet.db)
      --check-only    Only report what migrations are needed, don't apply them
=============================================================
"""

import sqlite3
import shutil
import sys
import os
import argparse
from datetime import datetime

# ─────────────────────────────────────────────────────────────
#  EXPECTED SCHEMA (source of truth — mirrors database.py)
# ─────────────────────────────────────────────────────────────

EXPECTED_SCHEMA = {
    "matters": [
        {"name": "id",              "type": "INTEGER", "notnull": True,  "default": None},
        {"name": "name",            "type": "VARCHAR", "notnull": False, "default": None},
        {"name": "external_id",     "type": "VARCHAR", "notnull": False, "default": None},
        {"name": "description",     "type": "TEXT",    "notnull": False, "default": None},
        {"name": "client_name",     "type": "TEXT",    "notnull": False, "default": None},
        {"name": "client_email",    "type": "TEXT",    "notnull": False, "default": None},
        {"name": "status_flag",     "type": "TEXT",    "notnull": False, "default": "'yellow'"},
        {"name": "is_closed",       "type": "BOOLEAN", "notnull": False, "default": "0"},
        {"name": "source_email_id", "type": "VARCHAR", "notnull": False, "default": None},
        {"name": "created_at",      "type": "DATETIME","notnull": False, "default": None},
    ],
    "time_logs": [
        {"name": "id",               "type": "INTEGER", "notnull": True,  "default": None},
        {"name": "matter_id",        "type": "INTEGER", "notnull": False, "default": None},
        {"name": "duration_minutes", "type": "INTEGER", "notnull": False, "default": None},
        {"name": "description",      "type": "TEXT",    "notnull": False, "default": None},
        {"name": "log_date",         "type": "DATETIME","notnull": False, "default": None},
        {"name": "created_at",       "type": "DATETIME","notnull": False, "default": None},
        {"name": "units",            "type": "INTEGER", "notnull": False, "default": "0"},
    ],
    "user_settings": [
        {"name": "id",    "type": "INTEGER", "notnull": True,  "default": None},
        {"name": "key",   "type": "VARCHAR", "notnull": False, "default": None},
        {"name": "value", "type": "VARCHAR", "notnull": False, "default": None},
    ],
}

# ─────────────────────────────────────────────────────────────
#  MIGRATION STEPS (ordered, idempotent)
# ─────────────────────────────────────────────────────────────

MIGRATIONS = [
    {
        "id": "001",
        "description": "Add client_name column to matters",
        "table": "matters",
        "column": "client_name",
        "sql": "ALTER TABLE matters ADD COLUMN client_name TEXT",
    },
    {
        "id": "002",
        "description": "Add status_flag column to matters (pending/completed/urgent)",
        "table": "matters",
        "column": "status_flag",
        "sql": "ALTER TABLE matters ADD COLUMN status_flag TEXT DEFAULT 'yellow'",
    },
    {
        "id": "003",
        "description": "Add is_closed column to matters (archive flag)",
        "table": "matters",
        "column": "is_closed",
        "sql": "ALTER TABLE matters ADD COLUMN is_closed BOOLEAN DEFAULT 0",
    },
    {
        "id": "004",
        "description": "Add client_email column to matters",
        "table": "matters",
        "column": "client_email",
        "sql": "ALTER TABLE matters ADD COLUMN client_email TEXT",
    },
    {
        "id": "005",
        "description": "Add units column to time_logs (6-minute billing units)",
        "table": "time_logs",
        "column": "units",
        "sql": "ALTER TABLE time_logs ADD COLUMN units INTEGER DEFAULT 0",
    },
    {
        "id": "006",
        "description": "Create user_settings table if missing (deprecated, kept for compatibility)",
        "table": "user_settings",
        "column": None,  # Table-level migration
        "sql": """CREATE TABLE IF NOT EXISTS user_settings (
            id INTEGER PRIMARY KEY,
            key VARCHAR UNIQUE,
            value VARCHAR
        )""",
    },
]

# ─────────────────────────────────────────────────────────────
#  HELPERS
# ─────────────────────────────────────────────────────────────

def get_existing_tables(cursor):
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
    return {row[0] for row in cursor.fetchall()}

def get_existing_columns(cursor, table_name):
    cursor.execute(f"PRAGMA table_info({table_name})")
    return {row[1] for row in cursor.fetchall()}

def print_banner():
    print("=" * 60)
    print("  PersonalTimesheetAssistant — Database Migration Tool")
    print("=" * 60)
    print(f"  Run at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()

def print_section(title):
    print(f"\n{'=' * 60}")
    print(f"  {title}")
    print(f"{'=' * 60}")

# ─────────────────────────────────────────────────────────────
#  SCHEMA CHECK
# ─────────────────────────────────────────────────────────────

def check_schema(cursor):
    """Returns a list of pending migrations (those that need to be applied)."""
    existing_tables = get_existing_tables(cursor)
    pending = []

    for migration in MIGRATIONS:
        table = migration["table"]
        column = migration["column"]

        if table not in existing_tables:
            # Entire table is missing — mark as pending
            if column is None:
                pending.append(migration)
            else:
                # Table doesn't exist at all; the column migration is moot
                # (will be handled when the app creates the table via SQLAlchemy)
                pending.append(migration)
            continue

        if column is not None:
            existing_cols = get_existing_columns(cursor, table)
            if column not in existing_cols:
                pending.append(migration)
        # Table-level CREATE IF NOT EXISTS migrations are always safe to re-run

    return pending

# ─────────────────────────────────────────────────────────────
#  REPORT
# ─────────────────────────────────────────────────────────────

def report_current_schema(cursor):
    print_section("Current Database Schema")
    existing_tables = get_existing_tables(cursor)

    if not existing_tables:
        print("  [!] No tables found in the database.")
        return

    for table in sorted(existing_tables):
        cursor.execute(f"PRAGMA table_info({table})")
        cols = cursor.fetchall()
        cursor.execute(f"SELECT COUNT(*) FROM [{table}]")
        row_count = cursor.fetchone()[0]
        print(f"\n  [TABLE] {table}  ({row_count} rows)")
        for c in cols:
            print(f"     - {c[1]:<22} {c[2]:<12} default={c[4]}")

def report_pending(pending):
    print_section("Migration Check Results")
    if not pending:
        print("  [OK] Database is fully up to date. No migrations needed.")
    else:
        print(f"  [!!] {len(pending)} migration(s) required:\n")
        for m in pending:
            print(f"  [{m['id']}] {m['description']}")

# ─────────────────────────────────────────────────────────────
#  BACKUP
# ─────────────────────────────────────────────────────────────

def backup_database(db_path):
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = f"{db_path}.backup_{timestamp}"
    shutil.copy2(db_path, backup_path)
    return backup_path

# ─────────────────────────────────────────────────────────────
#  APPLY MIGRATIONS
# ─────────────────────────────────────────────────────────────

def apply_migrations(conn, cursor, pending):
    print_section("Applying Migrations")
    applied = 0
    failed = 0

    for migration in pending:
        mid = migration["id"]
        desc = migration["description"]
        sql = migration["sql"]

        try:
            print(f"  [{mid}] {desc} ...", end=" ")
            cursor.execute(sql)
            conn.commit()
            print("DONE")
            applied += 1
        except sqlite3.OperationalError as e:
            err_str = str(e)
            if "duplicate column name" in err_str or "already exists" in err_str:
                print(f"SKIPPED (already applied)")
                applied += 1
            else:
                print(f"FAILED: {err_str}")
                failed += 1
        except Exception as e:
            print(f"FAILED: {e}")
            failed += 1

    return applied, failed

# ─────────────────────────────────────────────────────────────
#  MAIN
# ─────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="PersonalTimesheetAssistant — Database Migration Tool",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument(
        "--db",
        default="timesheet.db",
        help="Path to the SQLite database file (default: ./timesheet.db)",
    )
    parser.add_argument(
        "--check-only",
        action="store_true",
        help="Only report what migrations are needed, don't apply them",
    )
    args = parser.parse_args()

    db_path = args.db
    check_only = args.check_only

    print_banner()

    # ── Locate database ──────────────────────────────────────
    if not os.path.exists(db_path):
        print(f"  [ERROR] Database not found at: {db_path}")
        print(f"     Make sure the path is correct and the app has been run at least once.")
        sys.exit(1)

    abs_path = os.path.abspath(db_path)
    print(f"  Database: {abs_path}")
    size_kb = os.path.getsize(abs_path) / 1024
    print(f"  Size:     {size_kb:.1f} KB")

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        # ── Show current schema ──────────────────────────────
        report_current_schema(cursor)

        # -- Check pending migrations -------------------------
        pending = check_schema(cursor)
        report_pending(pending)

        if check_only or not pending:
            if not pending:
                print("\n  [OK] Nothing to do. Your database is fully compatible!")
            else:
                print("\n  [INFO] Check-only mode: no changes were made.")
            return

        # -- Confirm before applying --------------------------
        print()
        answer = input("  Apply migrations now? [Y/n]: ").strip().lower()
        if answer not in ("", "y", "yes"):
            return

        # ── Backup first ─────────────────────────────────────
        print_section("Backing Up Database")
        backup_path = backup_database(db_path)
        print(f"  [OK] Backup saved to: {backup_path}")

        # ── Apply ────────────────────────────────────────────
        applied, failed = apply_migrations(conn, cursor, pending)

        # ── Summary ──────────────────────────────────────────
        print_section("Migration Summary")
        print(f"  Applied:  {applied}")
        print(f"  Failed:   {failed}")

        if failed == 0:
            print("\n  [SUCCESS] All migrations applied successfully!")
            print("     Your database is now fully up to date.")
        else:
            print(f"\n  [WARNING] {failed} migration(s) failed. Please review the errors above.")
            print(f"     Your original database was backed up to: {backup_path}")

    finally:
        conn.close()

    # ── Final schema after migration ─────────────────────────
    if not check_only:
        print_section("Updated Database Schema")
        conn2 = sqlite3.connect(db_path)
        cursor2 = conn2.cursor()
        report_current_schema(cursor2)
        conn2.close()

    print("\n" + "=" * 60 + "\n")


if __name__ == "__main__":
    main()
