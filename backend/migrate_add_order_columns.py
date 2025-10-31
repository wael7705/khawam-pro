"""
Migration script to add new columns to orders table
"""
import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(DATABASE_URL)

def migrate():
    """Add new columns to orders table if they don't exist"""
    with engine.connect() as conn:
        try:
            # Check and add columns one by one
            columns_to_add = [
                ("customer_name", "VARCHAR(100)"),
                ("customer_phone", "VARCHAR(20)"),
                ("customer_whatsapp", "VARCHAR(20)"),
                ("shop_name", "VARCHAR(200)"),
                ("delivery_type", "VARCHAR(20) DEFAULT 'self'"),
                ("staff_notes", "TEXT"),
            ]
            
            for column_name, column_type in columns_to_add:
                try:
                    # Check if column exists
                    check_query = text(f"""
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name='orders' AND column_name='{column_name}'
                    """)
                    result = conn.execute(check_query).fetchone()
                    
                    if not result:
                        # Column doesn't exist, add it
                        alter_query = text(f"ALTER TABLE orders ADD COLUMN {column_name} {column_type}")
                        conn.execute(alter_query)
                        conn.commit()
                        print(f"✅ Added column: {column_name}")
                    else:
                        print(f"ℹ️ Column {column_name} already exists")
                except Exception as e:
                    print(f"⚠️ Error adding column {column_name}: {e}")
                    conn.rollback()
            
            print("\n✅ Migration completed successfully!")
            
        except Exception as e:
            print(f"❌ Migration failed: {e}")
            import traceback
            traceback.print_exc()
            conn.rollback()

if __name__ == "__main__":
    migrate()

