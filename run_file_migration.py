import os
import mysql.connector
from pathlib import Path

def run_migration():
    try:
        connection = mysql.connector.connect(
            host=os.environ.get("DB_HOST", "localhost"),
            port=int(os.environ.get("DB_PORT", 3306)),
            user=os.environ.get("DB_USER", "root"),
            password=os.environ.get("DB_PASSWORD", ""),
            database=os.environ.get("DB_DATABASE", "report_tracking")
        )
        
        cursor = connection.cursor()
        
        # Add attachment_path column
        cursor.execute("ALTER TABLE reports ADD COLUMN IF NOT EXISTS attachment_path VARCHAR(500) NULL DEFAULT NULL AFTER budget;")
        print("✓ Added 'attachment_path' column")
        
        connection.commit()
        cursor.close()
        connection.close()
        
        print("\n✅ File attachment migration completed!")
        
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    run_migration()
