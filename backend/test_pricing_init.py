"""
ملف اختبار لإنشاء جدول pricing_rules والتحقق من عمله
"""
from sqlalchemy import text
from database import engine

def test_pricing_table():
    """اختبار إنشاء جدول pricing_rules"""
    conn = None
    try:
        conn = engine.connect()
        print("✅ تم الاتصال بقاعدة البيانات")
        
        # التحقق من وجود الجدول
        check_table = conn.execute(text("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'pricing_rules'
            )
        """)).fetchone()
        
        if check_table and check_table[0]:
            print("✅ جدول pricing_rules موجود")
            
            # التحقق من الأعمدة
            check_columns = conn.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'pricing_rules'
                ORDER BY column_name
            """)).fetchall()
            
            print(f"✅ عدد الأعمدة: {len(check_columns)}")
            print("📋 الأعمدة الموجودة:")
            for col in check_columns:
                print(f"   - {col[0]}")
        else:
            print("❌ جدول pricing_rules غير موجود")
            print("🔄 جاري إنشاء الجدول...")
            
            conn.execute(text("""
                CREATE TABLE pricing_rules (
                    id SERIAL PRIMARY KEY,
                    name_ar VARCHAR(200) NOT NULL,
                    name_en VARCHAR(200),
                    description_ar TEXT,
                    description_en TEXT,
                    calculation_type VARCHAR(20) NOT NULL,
                    base_price DECIMAL(10, 4) NOT NULL,
                    price_multipliers JSONB,
                    specifications JSONB,
                    unit VARCHAR(50),
                    is_active BOOLEAN DEFAULT true,
                    display_order INTEGER DEFAULT 0,
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW()
                )
            """))
            conn.commit()
            print("✅ تم إنشاء جدول pricing_rules بنجاح")
        
        return True
        
    except Exception as e:
        print(f"❌ خطأ: {e}")
        import traceback
        traceback.print_exc()
        if conn:
            try:
                conn.rollback()
            except:
                pass
        return False
    finally:
        if conn:
            try:
                conn.close()
            except:
                pass

if __name__ == "__main__":
    print("=" * 60)
    print("اختبار إنشاء جدول pricing_rules")
    print("=" * 60)
    print()
    
    success = test_pricing_table()
    
    print()
    print("=" * 60)
    if success:
        print("✅ الاختبار نجح!")
    else:
        print("❌ الاختبار فشل!")
    print("=" * 60)
