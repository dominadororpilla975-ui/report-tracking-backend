import os
import mysql.connector
from pathlib import Path
import sys

def run_client_notification_migration():
    try:
        connection = mysql.connector.connect(
            host=os.environ.get("DB_HOST", "localhost"),
            port=int(os.environ.get("DB_PORT", 3306)),
            user=os.environ.get("DB_USER", "root"),
            password=os.environ.get("DB_PASSWORD", ""),
            database=os.environ.get("DB_DATABASE", "report_tracking")
        )
        
        cursor = connection.cursor()
        
        # Run the client notification migration SQL
        with open('migration_add_client_notification.sql', 'r') as f:
            sql = f.read()
        
        cursor.execute(sql, multi=True)
        
        # Process multi-statement results
        for result in cursor:
            if result.with_rows:
                print("✓ Migration executed, rows affected:", result.rowcount)
        
        connection.commit()
        cursor.close()
        connection.close()
        
        print("\n✅ Client notification migration completed successfully!")
        
    except Exception as e:
        print(f"❌ Migration Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    run_client_notification_migration()

