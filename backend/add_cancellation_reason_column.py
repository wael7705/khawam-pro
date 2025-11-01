"""
Script to add cancellation_reason column to orders table
"""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import engine
from sqlalchemy import text

def add_cancellation_reason_column():
    """Add cancellation_reason column to orders table if it doesn't exist"""
    try:
        with engine.connect() as conn:
            # Check if column exists
            check_query = text("""
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'orders' AND column_name = 'cancellation_reason'
            """)
            result = conn.execute(check_query).fetchone()
            
            if result:
                print("✓ Column 'cancellation_reason' already exists")
                return
            
            # Add column
            alter_query = text("""
                ALTER TABLE orders ADD COLUMN cancellation_reason TEXT
            """)
            conn.execute(alter_query)
            conn.commit()
            print("✓ Successfully added 'cancellation_reason' column to orders table")
            
    except Exception as e:
        print(f"✗ Error adding column: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    print("Adding cancellation_reason column to orders table...")
    add_cancellation_reason_column()
    print("Done!")

