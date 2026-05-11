import os
import sys
import psycopg2
from psycopg2 import Error
from psycopg2.extras import RealDictCursor
from urllib.parse import parse_qsl, unquote, urlparse


def _parse_database_url(database_url):
    parsed = urlparse(database_url)
    if parsed.scheme not in ("postgresql", "postgres", "postgresql+psycopg2"):
        raise ValueError(
            "Unsupported database URL scheme. Use postgresql:// or postgres://"
        )

    host = parsed.hostname or os.environ.get("DB_HOST", "localhost")
    port = parsed.port or int(os.environ.get("DB_PORT", 5432))
    user = unquote(parsed.username) if parsed.username else os.environ.get("DB_USER", "postgres")
    password = unquote(parsed.password) if parsed.password else os.environ.get("DB_PASSWORD", "")
    database = parsed.path.lstrip("/") or os.environ.get("DB_DATABASE", "report_tracking")
    options = dict(parse_qsl(parsed.query)) if parsed.query else {}

    return host, port, user, password, database, options


def get_db():
    """Get database connection with error handling.

    Supports individual DB_* environment variables and common DATABASE_URL formats.
    """
    try:
        database_url = os.environ.get("DATABASE_URL") or os.environ.get("POSTGRES_URL")
        if database_url:
            db_host, db_port, db_user, db_password, db_name, db_options = _parse_database_url(
                database_url
            )
        else:
            db_host = os.environ.get("DB_HOST", "localhost")
            db_port = int(os.environ.get("DB_PORT", 5432))
            db_user = os.environ.get("DB_USER", "postgres")
            db_password = os.environ.get("DB_PASSWORD", "")
            db_name = os.environ.get("DB_DATABASE", "report_tracking")
            db_options = {}

        print(
            f"[DB] Connecting to {db_user}@{db_host}:{db_port}/{db_name}",
            file=sys.stderr,
        )

        connection = psycopg2.connect(
            host=db_host,
            port=db_port,
            user=db_user,
            password=db_password,
            database=db_name,
            **db_options,
        )
        return connection
    except Error as e:
        print(f"[DB] Connection Error: {type(e).__name__}: {e}", file=sys.stderr)
        raise
    except Exception as e:
        print(f"[DB] Unexpected error: {type(e).__name__}: {e}", file=sys.stderr)
        raise


def get_dict_cursor(db_connection):
    """Get a cursor that returns results as dictionaries (compatible with existing code)"""
    return db_connection.cursor(cursor_factory=RealDictCursor)