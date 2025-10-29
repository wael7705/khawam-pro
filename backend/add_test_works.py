"""
Add test works to database
Run: python backend/add_test_works.py
"""
import os
from sqlalchemy import create_engine, text
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

def add_test_works():
    try:
        with engine.connect() as conn:
            # Check if images column exists
            check_col = text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name='portfolio_works' AND column_name='images'
            """)
            result = conn.execute(check_col)
            has_images_col = result.fetchone() is not None
            
            # Check existing works
            count_query = text("SELECT COUNT(*) FROM portfolio_works")
            count_result = conn.execute(count_query)
            count = count_result.fetchone()[0]
            print(f"📊 Existing works in database: {count}")
            
            if count > 0:
                print("✅ Works already exist in database")
                return True
            
            # Add test works
            print("\n➕ Adding test works...")
            
            if has_images_col:
                insert_query = text("""
                    INSERT INTO portfolio_works 
                    (title, title_ar, description, description_ar, image_url, category, category_ar, is_featured, is_visible, display_order, images)
                    VALUES 
                    ('Professional Poster Design', 'تصميم بوستر احترافي', 'High quality poster design for events', 'تصميم بوستر عالي الجودة للفعاليات', '/uploads/test1.jpg', 'Design', 'تصميم', true, true, 1, ARRAY[]::TEXT[]),
                    ('Business Banner', 'بانر تجاري', 'Outdoor business banner', 'بانر تجاري للخارج', '/uploads/test2.jpg', 'Printing', 'طباعة', true, true, 2, ARRAY[]::TEXT[]),
                    ('Brand Identity', 'هوية بصرية', 'Complete brand identity design', 'تصميم هوية بصرية كاملة', '/uploads/test3.jpg', 'Branding', 'هوية', false, true, 3, ARRAY[]::TEXT[])
                """)
            else:
                insert_query = text("""
                    INSERT INTO portfolio_works 
                    (title, title_ar, description, description_ar, image_url, category, category_ar, is_featured, is_visible, display_order)
                    VALUES 
                    ('Professional Poster Design', 'تصميم بوستر احترافي', 'High quality poster design for events', 'تصميم بوستر عالي الجودة للفعاليات', '/uploads/test1.jpg', 'Design', 'تصميم', true, true, 1),
                    ('Business Banner', 'بانر تجاري', 'Outdoor business banner', 'بانر تجاري للخارج', '/uploads/test2.jpg', 'Printing', 'طباعة', true, true, 2),
                    ('Brand Identity', 'هوية بصرية', 'Complete brand identity design', 'تصميم هوية بصرية كاملة', '/uploads/test3.jpg', 'Branding', 'هوية', false, true, 3)
                """)
            
            conn.execute(insert_query)
            conn.commit()
            
            print("✅ Successfully added 3 test works!")
            
            # Verify
            verify_query = text("SELECT id, title_ar, is_featured FROM portfolio_works ORDER BY display_order")
            verify_result = conn.execute(verify_query)
            works = verify_result.fetchall()
            
            print("\n📋 Added works:")
            for work in works:
                featured = "⭐" if work.is_featured else ""
                print(f"   {featured} ID: {work.id} - {work.title_ar}")
            
            return True
            
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("\n" + "="*60)
    print("🔄 Adding Test Works to Database")
    print("="*60 + "\n")
    
    if add_test_works():
        print("\n✅ Operation completed successfully!")
    else:
        print("\n❌ Operation failed!")
        exit(1)

