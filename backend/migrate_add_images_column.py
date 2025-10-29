"""
Migration script to add images column to portfolio_works table
Run this on Railway Console: python backend/migrate_add_images_column.py
"""
import os
from sqlalchemy import create_engine, text
from sqlalchemy.exc import OperationalError
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.environ.get("DATABASE_URL")

if not DATABASE_URL:
    DATABASE_URL = os.getenv("DATABASE_URL", "")
    if not DATABASE_URL:
        print("❌ Error: DATABASE_URL not found!")
        exit(1)

if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

print(f"📊 Connecting to database...")
engine = create_engine(DATABASE_URL, pool_pre_ping=True)

def migrate():
    try:
        with engine.connect() as conn:
            # Check if column exists
            check_query = text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name='portfolio_works' AND column_name='images'
            """)
            result = conn.execute(check_query)
            exists = result.fetchone() is not None
            
            if exists:
                print("✅ Column 'images' already exists in portfolio_works table")
                return True
            
            # Add the column
            print("📝 Adding 'images' column to portfolio_works table...")
            alter_query = text("""
                ALTER TABLE portfolio_works 
                ADD COLUMN images TEXT[] DEFAULT ARRAY[]::TEXT[];
            """)
            conn.execute(alter_query)
            conn.commit()
            
            print("✅ Successfully added 'images' column to portfolio_works table")
            
            # Update existing records to have empty array
            update_query = text("""
                UPDATE portfolio_works 
                SET images = ARRAY[]::TEXT[] 
                WHERE images IS NULL;
            """)
            conn.execute(update_query)
            conn.commit()
            
            print("✅ Updated existing records with empty arrays")
            return True
            
    except OperationalError as e:
        print(f"❌ Database error: {e}")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("\n" + "="*60)
    print("🔄 Migration: Add images column to portfolio_works")
    print("="*60 + "\n")
    
    if migrate():
        print("\n✅ Migration completed successfully!")
    else:
        print("\n❌ Migration failed!")
        exit(1)

