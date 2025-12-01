"""
سكريبت لإضافة البيانات الأولية للأسعار المطلوبة
"""
from sqlalchemy import text
from database import engine
import json

# البيانات الأولية للأسعار
INITIAL_PRICING_RULES = [
    # أبيض وأسود A4
    {
        "name_ar": "طباعة أبيض وأسود A4",
        "name_en": "Black & White A4 Printing",
        "calculation_type": "page",
        "paper_sizes": ["A4"],
        "print_type": "bw",
        "base_price": 500.0,
        "unit": "صفحة",
        "is_active": True,
        "display_order": 1
    },
    # أبيض وأسود A5
    {
        "name_ar": "طباعة أبيض وأسود A5",
        "name_en": "Black & White A5 Printing",
        "calculation_type": "page",
        "paper_sizes": ["A5"],
        "print_type": "bw",
        "base_price": 250.0,
        "unit": "صفحة",
        "is_active": True,
        "display_order": 2
    },
    # ملون A4 دقة عادية
    {
        "name_ar": "طباعة ملون A4 دقة عادية",
        "name_en": "Color A4 Printing Standard Quality",
        "calculation_type": "page",
        "paper_sizes": ["A4"],
        "print_type": "color",
        "quality_type": "standard",
        "base_price": 2000.0,
        "unit": "صفحة",
        "is_active": True,
        "display_order": 3
    },
    # ملون دقة عالية (ليزر)
    {
        "name_ar": "طباعة ملون دقة عالية (ليزر)",
        "name_en": "Color Printing High Quality (Laser)",
        "calculation_type": "page",
        "paper_sizes": ["A1", "A2", "A3", "A4", "A5"],
        "print_type": "color",
        "quality_type": "laser",
        "base_price": 2500.0,
        "unit": "صفحة",
        "is_active": True,
        "display_order": 4
    },
]

def init_advanced_pricing_data():
    """إضافة البيانات الأولية للأسعار"""
    conn = None
    try:
        conn = engine.connect()
        
        # التحقق من وجود الجدول
        result = conn.execute(text("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'pricing_rules'
            )
        """))
        
        if not result.fetchone()[0]:
            print("❌ جدول pricing_rules غير موجود")
            return
        
        # إضافة القواعد
        for rule in INITIAL_PRICING_RULES:
            # التحقق من وجود القاعدة
            check_result = conn.execute(text("""
                SELECT id FROM pricing_rules 
                WHERE name_ar = :name_ar 
                AND calculation_type = :calculation_type
            """), {
                "name_ar": rule["name_ar"],
                "calculation_type": rule["calculation_type"]
            })
            
            if check_result.fetchone():
                print(f"⏭️  قاعدة السعر موجودة بالفعل: {rule['name_ar']}")
                continue
            
            # إضافة القاعدة
            specifications = {
                "paper_sizes": rule.get("paper_sizes", []),
                "paper_type": rule.get("paper_type"),
                "print_type": rule.get("print_type"),
                "quality_type": rule.get("quality_type"),
            }
            
            conn.execute(text("""
                INSERT INTO pricing_rules 
                (name_ar, name_en, calculation_type, base_price, specifications, unit, is_active, display_order)
                VALUES 
                (:name_ar, :name_en, :calculation_type, :base_price, :specifications, :unit, :is_active, :display_order)
            """), {
                "name_ar": rule["name_ar"],
                "name_en": rule.get("name_en"),
                "calculation_type": rule["calculation_type"],
                "base_price": rule["base_price"],
                "specifications": json.dumps(specifications),
                "unit": rule.get("unit", "صفحة"),
                "is_active": rule.get("is_active", True),
                "display_order": rule.get("display_order", 0)
            })
            
            print(f"✅ تم إضافة قاعدة السعر: {rule['name_ar']}")
        
        conn.commit()
        print(f"✅ تم إضافة {len(INITIAL_PRICING_RULES)} قاعدة سعر بنجاح")
        
    except Exception as e:
        if conn:
            conn.rollback()
        print(f"❌ خطأ في إضافة البيانات الأولية: {e}")
        import traceback
        traceback.print_exc()
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    init_advanced_pricing_data()

