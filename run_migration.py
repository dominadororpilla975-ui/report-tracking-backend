"""
Run this script to add budget columns to the reports table
"""
import os
import mysql.connector

def run_migration():
    try:
        # Connect to MySQL
        connection = mysql.connector.connect(
            host=os.environ.get("DB_HOST", "localhost"),
            port=int(os.environ.get("DB_PORT", 3306)),
            user=os.environ.get("DB_USER", "root"),
            password=os.environ.get("DB_PASSWORD", ""),
            database=os.environ.get("DB_DATABASE", "report_tracking")
        )
        
        cursor = connection.cursor()
        
        # Add budget column
        cursor.execute("ALTER TABLE reports ADD COLUMN budget DECIMAL(15,2) DEFAULT 0")
        print("✓ Added 'budget' column")
        
        # Add budget_approved column
        cursor.execute("ALTER TABLE reports ADD COLUMN budget_approved TINYINT(1) DEFAULT 0")
        print("✓ Added 'budget_approved' column")
        
        # Add reassign_reason column
        cursor.execute("ALTER TABLE reports ADD COLUMN reassign_reason VARCHAR(255) NULL")
        print("✓ Added 'reassign_reason' column")
        
        connection.commit()
        cursor.close()
        connection.close()
        
        print("\n✅ Migration completed successfully!")
        
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    run_migration()

