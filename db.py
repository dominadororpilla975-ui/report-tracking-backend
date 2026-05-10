import os
import sys
import mysql.connector
from mysql.connector import Error
from urllib.parse import urlparse, unquote

def _parse_database_url(database_url):
    parsed = urlparse(database_url)
    if parsed.scheme not in ("mysql", "mysql+mysqlconnector", "mysql+pymysql", "mariadb"):
        raise ValueError(
            "Unsupported database URL scheme. Use mysql:// or mysql+mysqlconnector://"
        )

    host = parsed.hostname or os.environ.get("DB_HOST", "localhost")
    port = parsed.port or int(os.environ.get("DB_PORT", 3306))
    user = unquote(parsed.username) if parsed.username else os.environ.get("DB_USER", "root")
    password = unquote(parsed.password) if parsed.password else os.environ.get("DB_PASSWORD", "")
    database = parsed.path.lstrip("/") or os.environ.get("DB_DATABASE", "report_tracking")

    return host, port, user, password, database


def get_db():
    """Get database connection with error handling.

    Supports individual DB_* environment variables and common DATABASE_URL formats.
    """
    try:
        database_url = os.environ.get("DATABASE_URL") or os.environ.get("MYSQL_URL")
        if database_url:
            db_host, db_port, db_user, db_password, db_name = _parse_database_url(
                database_url
            )
        else:
            db_host = os.environ.get("DB_HOST", "localhost")
            db_port = int(os.environ.get("DB_PORT", 3306))
            db_user = os.environ.get("DB_USER", "root")
            db_password = os.environ.get("DB_PASSWORD", "")
            db_name = os.environ.get("DB_DATABASE", "report_tracking")

        print(
            f"[DB] Connecting to {db_user}@{db_host}:{db_port}/{db_name}",
            file=sys.stderr,
        )

        connection = mysql.connector.connect(
            host=db_host,
            port=db_port,
            user=db_user,
            password=db_password,
            database=db_name,
        )
        return connection
    except Error as e:
        print(f"[DB] Connection Error: {type(e).__name__}: {e}", file=sys.stderr)
        raise
    except Exception as e:
        print(f"[DB] Unexpected error: {type(e).__name__}: {e}", file=sys.stderr)
        raise