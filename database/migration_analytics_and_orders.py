"""
Migration script to create analytics and order tracking tables
Run this script to add:
- visitor_tracking table
- page_views table
- order_status_history table
"""

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

load_dotenv()

# Get DATABASE_URL
DATABASE_URL = (
    os.environ.get("DATABASE_URL") or 
    os.environ.get("POSTGRES_URL") or 
    os.environ.get("PGDATABASE") or
    os.getenv("DATABASE_URL", "")
)

if not DATABASE_URL:
    # Try to get from database.py if available
    try:
        import sys
        sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)) + '/../backend')
        from database import engine
        DATABASE_URL = str(engine.url)
        print(f"✅ Using DATABASE_URL from database.py")
    except:
        DATABASE_URL = "postgresql://postgres@localhost:5432/khawam_local"
        print("⚠️ Warning: Using default localhost DATABASE_URL")

# Fix for Railway PostgreSQL connection
if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
elif DATABASE_URL and DATABASE_URL.startswith("postgresql+psycopg2://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql+psycopg2://", "postgresql://", 1)

def run_migration():
    """Run the migration to create new tables"""
    try:
        engine = create_engine(DATABASE_URL, pool_pre_ping=True)
        SessionLocal = sessionmaker(bind=engine)
        db = SessionLocal()
        
        print("🔄 Starting migration...")
        
        # Create visitor_tracking table
        print("📊 Creating visitor_tracking table...")
        db.execute(text("""
            CREATE TABLE IF NOT EXISTS visitor_tracking (
                id SERIAL PRIMARY KEY,
                session_id VARCHAR(255) NOT NULL,
                user_id INTEGER REFERENCES users(id),
                page_path VARCHAR(500) NOT NULL,
                referrer TEXT,
                user_agent TEXT,
                device_type VARCHAR(50),
                browser VARCHAR(100),
                os VARCHAR(100),
                ip_address VARCHAR(45),
                country VARCHAR(100),
                city VARCHAR(100),
                time_on_page INTEGER DEFAULT 0,
                exit_page BOOLEAN DEFAULT FALSE,
                entry_page BOOLEAN DEFAULT FALSE,
                visit_count INTEGER DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """))
        
        # Create indexes for visitor_tracking
        print("📊 Creating indexes for visitor_tracking...")
        db.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_visitor_tracking_session_id 
            ON visitor_tracking(session_id)
        """))
        db.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_visitor_tracking_user_id 
            ON visitor_tracking(user_id)
        """))
        db.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_visitor_tracking_created_at 
            ON visitor_tracking(created_at)
        """))
        
        # Create page_views table
        print("📊 Creating page_views table...")
        db.execute(text("""
            CREATE TABLE IF NOT EXISTS page_views (
                id SERIAL PRIMARY KEY,
                visitor_id INTEGER REFERENCES visitor_tracking(id),
                session_id VARCHAR(255) NOT NULL,
                page_path VARCHAR(500) NOT NULL,
                time_spent INTEGER DEFAULT 0,
                scroll_depth INTEGER DEFAULT 0,
                actions JSONB,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """))
        
        # Create indexes for page_views
        print("📊 Creating indexes for page_views...")
        db.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_page_views_visitor_id 
            ON page_views(visitor_id)
        """))
        db.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_page_views_session_id 
            ON page_views(session_id)
        """))
        db.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_page_views_page_path 
            ON page_views(page_path)
        """))
        db.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_page_views_created_at 
            ON page_views(created_at)
        """))
        
        # Create order_status_history table
        print("📊 Creating order_status_history table...")
        db.execute(text("""
            CREATE TABLE IF NOT EXISTS order_status_history (
                id SERIAL PRIMARY KEY,
                order_id INTEGER NOT NULL REFERENCES orders(id),
                status VARCHAR(20) NOT NULL,
                changed_by INTEGER REFERENCES users(id),
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """))
        
        # Create indexes for order_status_history
        print("📊 Creating indexes for order_status_history...")
        db.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_order_status_history_order_id 
            ON order_status_history(order_id)
        """))
        db.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_order_status_history_created_at 
            ON order_status_history(created_at)
        """))
        
        # Migrate existing orders to order_status_history
        print("📊 Migrating existing orders to order_status_history...")
        db.execute(text("""
            INSERT INTO order_status_history (order_id, status, created_at)
            SELECT id, status, created_at
            FROM orders
            WHERE NOT EXISTS (
                SELECT 1 FROM order_status_history 
                WHERE order_status_history.order_id = orders.id
            )
        """))
        
        db.commit()
        print("✅ Migration completed successfully!")
        
        # Verify tables were created
        print("\n📋 Verifying tables...")
        tables = db.execute(text("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('visitor_tracking', 'page_views', 'order_status_history')
        """)).fetchall()
        
        print(f"✅ Found {len(tables)} tables:")
        for table in tables:
            print(f"   - {table[0]}")
        
        db.close()
        
        print("✅ Migration completed successfully!")
        return True
    except Exception as e:
        print(f"❌ Migration failed: {str(e)}")
        import traceback
        traceback.print_exc()
        try:
            db.rollback()
        except:
            pass
        return False

if __name__ == "__main__":
    run_migration()

