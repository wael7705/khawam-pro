"""
Ensure portfolio_works has required columns for images.
Run: python backend/fix_database_migration.py
"""
import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.environ.get("DATABASE_URL", "")
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

if not DATABASE_URL:
    print("DATABASE_URL not set")
    raise SystemExit(1)

engine = create_engine(DATABASE_URL, pool_pre_ping=True)

def ensure_columns():
    with engine.connect() as conn:
        # Add image_url column if not exists
        conn.execute(text(
            """
            DO $$
            BEGIN
              IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name='portfolio_works' AND column_name='image_url'
              ) THEN
                ALTER TABLE portfolio_works ADD COLUMN image_url TEXT DEFAULT '';
              END IF;
            END $$;
            """
        ))
        # Add images column if not exists
        conn.execute(text(
            """
            DO $$
            BEGIN
              IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name='portfolio_works' AND column_name='images'
              ) THEN
                ALTER TABLE portfolio_works ADD COLUMN images TEXT[] DEFAULT ARRAY[]::TEXT[];
              END IF;
            END $$;
            """
        ))
        # Normalize existing paths
        conn.execute(text(
            """
            UPDATE portfolio_works 
            SET image_url = '/' || regexp_replace(image_url, '\\', '/', 'g')
            WHERE image_url IS NOT NULL AND image_url <> '' AND LEFT(image_url,1) <> '/' AND position('http' in image_url) = 0;
            """
        ))
        conn.commit()
    print("✅ Columns ensured: image_url (TEXT), images (TEXT[]) in portfolio_works")

if __name__ == "__main__":
    ensure_columns()


