import argparse
import os
import sys
from pathlib import Path

import mysql.connector
import psycopg2
from mysql.connector import MySQLConnection
from psycopg2 import sql
from psycopg2.extras import RealDictCursor

from db import get_db

SCHEMA_FILE = Path(__file__).resolve().parent.parent / "database" / "report_tracking_postgres.sql"

TABLES = [
    "departments",
    "users",
    "reports",
    "report_workflow_routes",
    "report_logs",
]


def parse_args():
    parser = argparse.ArgumentParser(
        description="Migrate legacy MySQL report-tracking data into PostgreSQL."
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Run even if the target PostgreSQL database already contains data.",
    )
    parser.add_argument(
        "--schema-only",
        action="store_true",
        help="Only apply PostgreSQL schema and do not migrate MySQL rows.",
    )
    parser.add_argument(
        "--postgres-url",
        default=os.environ.get("DATABASE_URL") or os.environ.get("POSTGRES_URL"),
        help="PostgreSQL connection URL to use for the target database.",
    )
    parser.add_argument(
        "--mysql-host",
        default=os.environ.get("DB_HOST", "localhost"),
        help="MySQL host for the legacy database.",
    )
    parser.add_argument(
        "--mysql-port",
        type=int,
        default=int(os.environ.get("DB_PORT", 3306)),
        help="MySQL port for the legacy database.",
    )
    parser.add_argument(
        "--mysql-user",
        default=os.environ.get("DB_USER", "root"),
        help="MySQL user for the legacy database.",
    )
    parser.add_argument(
        "--mysql-password",
        default=os.environ.get("DB_PASSWORD", ""),
        help="MySQL password for the legacy database.",
    )
    parser.add_argument(
        "--mysql-database",
        default=os.environ.get("DB_DATABASE", "report_tracking"),
        help="MySQL database name for the legacy data.",
    )
    return parser.parse_args()


def get_mysql_connection(args) -> MySQLConnection:
    return mysql.connector.connect(
        host=args.mysql_host,
        port=args.mysql_port,
        user=args.mysql_user,
        password=args.mysql_password,
        database=args.mysql_database,
    )


def apply_postgres_schema(pg_conn):
    if not SCHEMA_FILE.exists():
        raise FileNotFoundError(f"Schema file not found: {SCHEMA_FILE}")

    with SCHEMA_FILE.open("r", encoding="utf-8") as f:
        sql_text = f.read()

    statements = []
    current = ""
    in_dollar = None
    i = 0
    while i < len(sql_text):
        if in_dollar:
            if sql_text.startswith(in_dollar, i):
                current += in_dollar
                i += len(in_dollar)
                in_dollar = None
                continue
            current += sql_text[i]
            i += 1
            continue

        if sql_text[i] == "$":
            j = i + 1
            while j < len(sql_text) and (sql_text[j].isalnum() or sql_text[j] == "_"):
                j += 1
            if j < len(sql_text) and sql_text[j] == "$":
                tag = sql_text[i : j + 1]
                current += tag
                in_dollar = tag
                i = j + 1
                continue

        if sql_text[i] == ";" and not in_dollar:
            current += ";"
            stmt = current.strip()
            if stmt and not all(
                line.strip().startswith("--") for line in stmt.splitlines() if line.strip()
            ):
                statements.append(stmt)
            current = ""
            i += 1
            continue

        current += sql_text[i]
        i += 1

    if current.strip() and not all(
        line.strip().startswith("--") for line in current.splitlines() if line.strip()
    ):
        statements.append(current.strip())

    with pg_conn.cursor() as cursor:
        for statement in statements:
            cursor.execute(statement)
    pg_conn.commit()


def ensure_empty_target(pg_conn, force: bool):
    with pg_conn.cursor() as cursor:
        for table in TABLES:
            cursor.execute(sql.SQL("SELECT COUNT(*) FROM {};").format(sql.Identifier(table)))
            count = cursor.fetchone()[0]
            if count > 0:
                if not force:
                    raise RuntimeError(
                        f"Target PostgreSQL table '{table}' already contains data ({count} rows). "
                        "Use --force to migrate anyway, but make sure you understand the risk."
                    )
                print(f"⚠️  Table '{table}' already has {count} rows; continuing because --force was set.")


def get_mysql_columns(mysql_cursor, table_name):
    mysql_cursor.execute(f"SHOW COLUMNS FROM {table_name}")
    return [row[0] for row in mysql_cursor.fetchall()]


def select_mysql_rows(mysql_cursor, table_name, expected_fields):
    mysql_cols = get_mysql_columns(mysql_cursor, table_name)
    selected_fields = [field for field in expected_fields if field in mysql_cols]
    if not selected_fields:
        raise RuntimeError(f"No expected fields found in MySQL table {table_name}")

    query = f"SELECT {', '.join(selected_fields)} FROM {table_name}"
    mysql_cursor.execute(query)
    raw_rows = mysql_cursor.fetchall()
    field_index = {name: idx for idx, name in enumerate(selected_fields)}

    result_rows = []
    for row in raw_rows:
        result_rows.append(
            tuple(
                row[field_index[field]] if field in field_index else None
                for field in expected_fields
            )
        )

    missing = set(expected_fields) - set(selected_fields)
    if missing:
        print(f"⚠️  MySQL table {table_name} is missing columns: {', '.join(sorted(missing))}. Using defaults for those fields.")

    return result_rows


def migrate_departments(mysql_cursor, pg_cursor):
    mysql_cursor.execute("SELECT id, name, signature_path FROM departments")
    rows = mysql_cursor.fetchall()
    insert_sql = "INSERT INTO departments (id, name, signature_path) VALUES (%s, %s, %s) ON CONFLICT (id) DO NOTHING"
    pg_cursor.executemany(insert_sql, rows)
    return len(rows)


def migrate_users(mysql_cursor, pg_cursor):
    expected_fields = [
        "id",
        "name",
        "email",
        "google_sub",
        "password",
        "temp_password",
        "role",
        "department_id",
    ]
    rows = select_mysql_rows(mysql_cursor, "users", expected_fields)
    insert_sql = """
        INSERT INTO users (
            id, name, email, google_sub, password, temp_password,
            role, department_id, needs_password_change, created_at, updated_at
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (id) DO NOTHING
    """
    pg_rows = [
        (
            row[0],
            row[1],
            row[2],
            row[3],
            row[4],
            row[5],
            row[6],
            row[7],
            False,
            None,
            None,
        )
        for row in rows
    ]
    pg_cursor.executemany(insert_sql, pg_rows)
    return len(rows)


def migrate_reports(mysql_cursor, pg_cursor):
    expected_fields = [
        "id",
        "title",
        "description",
        "client_id",
        "department_id",
        "requires_physical_pickup",
        "physical_pickup_info",
        "status",
        "current_workflow_step",
        "total_workflow_steps",
        "budget",
        "budget_approved",
        "reassign_reason",
        "created_at",
    ]
    rows = select_mysql_rows(mysql_cursor, "reports", expected_fields)
    insert_sql = """
        INSERT INTO reports (
            id, title, description, client_id, department_id,
            requires_physical_pickup, physical_pickup_info, status,
            current_workflow_step, total_workflow_steps, budget,
            budget_approved, reassign_reason, created_at, updated_at
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (id) DO NOTHING
    """
    pg_rows = [
        (
            row[0],
            row[1],
            row[2],
            row[3],
            row[4],
            bool(row[5]) if row[5] is not None else False,
            row[6],
            row[7],
            row[8],
            row[9],
            row[10],
            bool(row[11]) if row[11] is not None else False,
            row[12],
            row[13],
            row[13],
        )
        for row in rows
    ]
    pg_cursor.executemany(insert_sql, pg_rows)
    return len(rows)


def migrate_workflow_routes(mysql_cursor, pg_cursor):
    expected_fields = [
        "id",
        "report_id",
        "step_number",
        "department_id",
        "assigned_user_id",
        "status",
        "approver_notes",
        "assigned_date",
        "completed_date",
    ]
    rows = select_mysql_rows(mysql_cursor, "report_workflow_routes", expected_fields)
    insert_sql = """
        INSERT INTO report_workflow_routes (
            id, report_id, step_number, department_id,
            assigned_user_id, status, approver_notes,
            assigned_date, completed_date
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (id) DO NOTHING
    """
    pg_cursor.executemany(insert_sql, rows)
    return len(rows)


def migrate_logs(mysql_cursor, pg_cursor):
    expected_fields = [
        "id",
        "report_id",
        "old_department",
        "new_department",
        "updated_by",
        "action",
        "remarks",
        "date_updated",
    ]
    rows = select_mysql_rows(mysql_cursor, "report_logs", expected_fields)
    insert_sql = """
        INSERT INTO report_logs (
            id, report_id, old_department, new_department,
            updated_by, action, remarks, date_updated
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (id) DO NOTHING
    """
    pg_cursor.executemany(insert_sql, rows)
    return len(rows)


def update_postgres_sequences(pg_conn):
    with pg_conn.cursor() as cursor:
        for table in TABLES:
            seq_name = f"{table}_id_seq"
            cursor.execute(
                sql.SQL(
                    "SELECT setval(%s, COALESCE((SELECT MAX(id) FROM {}), 1), true)"
                ).format(sql.Identifier(table)),
                (seq_name,),
            )
    pg_conn.commit()


def main():
    args = parse_args()

    if not SCHEMA_FILE.exists():
        print(f"Schema file not found: {SCHEMA_FILE}")
        sys.exit(1)

    if not args.postgres_url:
        print("❌ PostgreSQL URL is required. Use --postgres-url or set DATABASE_URL/POSTGRES_URL.")
        sys.exit(1)

    os.environ["DATABASE_URL"] = args.postgres_url

    print("🔧 Applying PostgreSQL schema...")
    pg_conn = get_db()
    try:
        apply_postgres_schema(pg_conn)
    except Exception as e:
        print(f"❌ Failed to apply PostgreSQL schema: {e}")
        pg_conn.close()
        sys.exit(1)

    if args.schema_only:
        print("✅ PostgreSQL schema applied. Skipping data migration (--schema-only).")
        pg_conn.close()
        return

    try:
        ensure_empty_target(pg_conn, args.force)
    except RuntimeError as exc:
        print(f"❌ {exc}")
        pg_conn.close()
        sys.exit(1)

    mysql_conn = get_mysql_connection(args)
    mysql_cursor = mysql_conn.cursor()
    pg_cursor = pg_conn.cursor()

    try:
        print("🔁 Migrating departments...")
        dept_count = migrate_departments(mysql_cursor, pg_cursor)
        print(f"   migrated {dept_count} departments")

        print("🔁 Migrating users...")
        user_count = migrate_users(mysql_cursor, pg_cursor)
        print(f"   migrated {user_count} users")

        print("🔁 Migrating reports...")
        report_count = migrate_reports(mysql_cursor, pg_cursor)
        print(f"   migrated {report_count} reports")

        print("🔁 Migrating workflow routes...")
        route_count = migrate_workflow_routes(mysql_cursor, pg_cursor)
        print(f"   migrated {route_count} workflow routes")

        print("🔁 Migrating report logs...")
        log_count = migrate_logs(mysql_cursor, pg_cursor)
        print(f"   migrated {log_count} log records")

        pg_conn.commit()
        update_postgres_sequences(pg_conn)
        print("✅ MySQL -> PostgreSQL data migration complete.")
        print("   Run with --force only if you understand existing target data may be overwritten.")
    except Exception as e:
        pg_conn.rollback()
        print(f"❌ Migration failed: {e}")
        raise
    finally:
        mysql_cursor.close()
        mysql_conn.close()
        pg_cursor.close()
        pg_conn.close()


if __name__ == "__main__":
    main()
