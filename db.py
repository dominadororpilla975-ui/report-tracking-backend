import os
import sys
import mysql.connector
from mysql.connector import Error

def get_db():
    """Get database connection with error handling.
    
    Returns:
        mysql.connector.MySQLConnection or None if connection fails
        
    Raises:
        Exception: If database configuration is missing
    """
    try:
        db_host = os.environ.get("DB_HOST", "localhost")
        db_port = int(os.environ.get("DB_PORT", 3306))
        db_user = os.environ.get("DB_USER", "root")
        db_password = os.environ.get("DB_PASSWORD", "")
        db_name = os.environ.get("DB_DATABASE", "report_tracking")
        
        print(f"[DB] Connecting to {db_user}@{db_host}:{db_port}/{db_name}", file=sys.stderr)
        
        connection = mysql.connector.connect(
            host=db_host,
            port=db_port,
            user=db_user,
            password=db_password,
            database=db_name
        )
        return connection
    except Error as e:
        print(f"[DB] Connection Error: {type(e).__name__}: {e}", file=sys.stderr)
        raise
    except Exception as e:
        print(f"[DB] Unexpected error: {type(e).__name__}: {e}", file=sys.stderr)
        raise