"""
إضافة بيانات تجريبية مباشرة عبر SQL
"""
from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

load_dotenv()

# الحصول على DATABASE_URL من Railway
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    print("❌ لم يتم العثور على DATABASE_URL")
    exit(1)

# إصلاح للـ Railway PostgreSQL connection
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

print(f"📊 الاتصال بقاعدة البيانات: {DATABASE_URL[:50]}...")

# إنشاء connection مباشر
engine = create_engine(DATABASE_URL)

def add_sample_data():
    """إضافة بيانات تجريبية"""
    
    with engine.connect() as conn:
        try:
            # إضافة فئات المنتجات
            conn.execute(text("""
                INSERT INTO product_categories (name_ar, name_en, description_ar) 
                VALUES ('تصميم الجرافيكي', 'Graphic Design', 'تصميمات جرافيكية احترافية')
                ON CONFLICT DO NOTHING;
            """))
            
            conn.execute(text("""
                INSERT INTO product_categories (name_ar, name_en, description_ar) 
                VALUES ('ملصقات', 'Posters', 'تصميم وطباعة الملصقات')
                ON CONFLICT DO NOTHING;
            """))
            
            conn.execute(text("""
                INSERT INTO product_categories (name_ar, name_en, description_ar) 
                VALUES ('الكروت الشخصية', 'Business Cards', 'تصميم وطباعة الكروت الشخصية')
                ON CONFLICT DO NOTHING;
            """))
            
            conn.commit()
            
            # جلب فئات المنتجات
            result = conn.execute(text("SELECT id, name_ar FROM product_categories"))
            categories = result.fetchall()
            print(f"✅ فئات المنتجات: {len(categories)}")
            
            # إضافة منتجات
            if categories:
                category_id = categories[0][0]
                
                conn.execute(text("""
                    INSERT INTO products (name_ar, name_en, description_ar, category_id, price, base_price, is_featured, is_active, is_visible) 
                    VALUES ('تصميم شعار احترافي', 'Professional Logo Design', 'تصميم شعار احترافي مع 3 عروض مختلفة', :cat_id, 150.00, 100.00, true, true, true)
                    ON CONFLICT DO NOTHING;
                """), {"cat_id": category_id})
                
                if len(categories) >= 2:
                    category_id2 = categories[1][0]
                    conn.execute(text("""
                        INSERT INTO products (name_ar, name_en, description_ar, category_id, price, base_price, is_featured, is_active, is_visible) 
                        VALUES ('ملصق دعائي', 'Promotional Poster', 'تصميم وطباعة ملصق دعائي عالي الجودة', :cat_id, 80.00, 60.00, true, true, true)
                        ON CONFLICT DO NOTHING;
                    """), {"cat_id": category_id2})
                
                if len(categories) >= 3:
                    category_id3 = categories[2][0]
                    conn.execute(text("""
                        INSERT INTO products (name_ar, name_en, description_ar, category_id, price, base_price, is_featured, is_active, is_visible) 
                        VALUES ('كروت شخصية فاخرة', 'Premium Business Cards', 'كروت شخصية فاخرة مع طباعة متميزة', :cat_id, 120.00, 90.00, true, true, true)
                        ON CONFLICT DO NOTHING;
                    """), {"cat_id": category_id3})
            
            conn.commit()
            
            # إضافة خدمات
            conn.execute(text("""
                INSERT INTO services (name_ar, name_en, description_ar, icon, base_price, is_active, is_visible, display_order) 
                VALUES ('تصميم الجرافيكي', 'Graphic Design', 'خدمات التصميم الجرافيكي الاحترافية', 'design', 100.00, true, true, 1)
                ON CONFLICT DO NOTHING;
            """))
            
            conn.execute(text("""
                INSERT INTO services (name_ar, name_en, description_ar, icon, base_price, is_active, is_visible, display_order) 
                VALUES ('طباعة فاخرة', 'Premium Printing', 'خدمات الطباعة الفاخرة عالية الجودة', 'print', 50.00, true, true, 2)
                ON CONFLICT DO NOTHING;
            """))
            
            conn.execute(text("""
                INSERT INTO services (name_ar, name_en, description_ar, icon, base_price, is_active, is_visible, display_order) 
                VALUES ('استشارات التصميم', 'Design Consultation', 'استشارات احترافية في التصميم والهوية البصرية', 'consultation', 75.00, true, true, 3)
                ON CONFLICT DO NOTHING;
            """))
            
            conn.commit()
            
            # إضافة أعمال
            conn.execute(text("""
                INSERT INTO portfolio_works (title_ar, title_en, description_ar, category_ar, category_en, image_url, is_featured, is_active, is_visible) 
                VALUES ('تصميم هوية بصرية لشركة تقنية', 'Tech Company Brand Identity', 'تصميم هوية بصرية شاملة لشركة تقنية ناشئة', 'هوية بصرية', 'Brand Identity', 'https://via.placeholder.com/400x300', true, true, true)
                ON CONFLICT DO NOTHING;
            """))
            
            conn.execute(text("""
                INSERT INTO portfolio_works (title_ar, title_en, description_ar, category_ar, category_en, image_url, is_featured, is_active, is_visible) 
                VALUES ('تصميم موقع إلكتروني', 'Website Design', 'تصميم موقع إلكتروني متجاوب وحديث', 'تصميم مواقع', 'Web Design', 'https://via.placeholder.com/400x300', true, true, true)
                ON CONFLICT DO NOTHING;
            """))
            
            conn.execute(text("""
                INSERT INTO portfolio_works (title_ar, title_en, description_ar, category_ar, category_en, image_url, is_featured, is_active, is_visible) 
                VALUES ('تصميم مواد تسويقية', 'Marketing Materials', 'تصميم مواد تسويقية متنوعة للشركات', 'مواد تسويقية', 'Marketing Materials', 'https://via.placeholder.com/400x300', true, true, true)
                ON CONFLICT DO NOTHING;
            """))
            
            conn.commit()
            
            # التحقق من البيانات
            products_result = conn.execute(text("SELECT COUNT(*) FROM products"))
            products_count = products_result.scalar()
            
            services_result = conn.execute(text("SELECT COUNT(*) FROM services"))
            services_count = services_result.scalar()
            
            works_result = conn.execute(text("SELECT COUNT(*) FROM portfolio_works"))
            works_count = works_result.scalar()
            
            print(f"✅ تم إضافة البيانات بنجاح!")
            print(f"📦 المنتجات: {products_count}")
            print(f"🔧 الخدمات: {services_count}")
            print(f"🎨 الأعمال: {works_count}")
            
        except Exception as e:
            print(f"❌ خطأ: {e}")
            conn.rollback()

if __name__ == "__main__":
    add_sample_data()

