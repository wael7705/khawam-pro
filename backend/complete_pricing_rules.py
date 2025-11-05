"""
إكمال القواعد المالية للطباعة
نظام محاسبي متطور - قاعدة واحدة لكل نوع، وجهين = السعر × 2 تلقائياً
"""
import os
import sys
import json
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("Error: DATABASE_URL not found in environment")
    sys.exit(1)

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)

def complete_pricing_rules():
    """إكمال القواعد المالية للطباعة"""
    db = SessionLocal()
    try:
        print("\nStarting pricing rules completion...")
        
        # قواعد الطباعة المطلوبة
        # ملاحظة: السعر الأساسي = سعر صفحة وجه واحد
        # طباعة وجهين = السعر الأساسي × 2 (يتم حسابها تلقائياً)
        
        pricing_rules = [
            # A4 - أبيض وأسود
            {
                "name_ar": "طباعة A4 - أبيض وأسود",
                "name_en": "A4 Printing - Black & White",
                "description_ar": "طباعة صفحة A4 وجه واحد أبيض وأسود",
                "description_en": "A4 page printing single side black & white",
                "calculation_type": "page",
                "base_price": 50.0,  # سعر صفحة وجه واحد
                "unit": "صفحة",
                "specifications": {
                    "paper_size": "A4",
                    "color": "bw"
                },
                "display_order": 1
            },
            # A4 - ملون عادي
            {
                "name_ar": "طباعة A4 - ملون عادي",
                "name_en": "A4 Printing - Color Standard",
                "description_ar": "طباعة صفحة A4 وجه واحد ملون عادي",
                "description_en": "A4 page printing single side color standard",
                "calculation_type": "page",
                "base_price": 100.0,  # سعر صفحة وجه واحد ملون
                "unit": "صفحة",
                "specifications": {
                    "paper_size": "A4",
                    "color": "color",
                    "print_quality": "standard"
                },
                "display_order": 2
            },
            # A4 - ملون دقة عالية (ليزرية)
            {
                "name_ar": "طباعة A4 - ملون دقة عالية",
                "name_en": "A4 Printing - Color High Quality",
                "description_ar": "طباعة صفحة A4 وجه واحد ملون دقة عالية (ليزرية)",
                "description_en": "A4 page printing single side color high quality (laser)",
                "calculation_type": "page",
                "base_price": 150.0,  # سعر صفحة وجه واحد ملون ليزر
                "unit": "صفحة",
                "specifications": {
                    "paper_size": "A4",
                    "color": "color",
                    "print_quality": "laser"
                },
                "display_order": 3
            },
            # Booklet (A5) - أبيض وأسود
            {
                "name_ar": "طباعة Booklet (A5) - أبيض وأسود",
                "name_en": "Booklet (A5) Printing - Black & White",
                "description_ar": "طباعة صفحة Booklet (A5) وجه واحد أبيض وأسود",
                "description_en": "Booklet (A5) page printing single side black & white",
                "calculation_type": "page",
                "base_price": 40.0,  # سعر صفحة وجه واحد
                "unit": "صفحة",
                "specifications": {
                    "paper_size": "booklet",
                    "color": "bw"
                },
                "display_order": 4
            },
            # Booklet (A5) - ملون عادي
            {
                "name_ar": "طباعة Booklet (A5) - ملون عادي",
                "name_en": "Booklet (A5) Printing - Color Standard",
                "description_ar": "طباعة صفحة Booklet (A5) وجه واحد ملون عادي",
                "description_en": "Booklet (A5) page printing single side color standard",
                "calculation_type": "page",
                "base_price": 80.0,  # سعر صفحة وجه واحد ملون
                "unit": "صفحة",
                "specifications": {
                    "paper_size": "booklet",
                    "color": "color",
                    "print_quality": "standard"
                },
                "display_order": 5
            },
            # Booklet (A5) - ملون دقة عالية
            {
                "name_ar": "طباعة Booklet (A5) - ملون دقة عالية",
                "name_en": "Booklet (A5) Printing - Color High Quality",
                "description_ar": "طباعة صفحة Booklet (A5) وجه واحد ملون دقة عالية (ليزرية)",
                "description_en": "Booklet (A5) page printing single side color high quality (laser)",
                "calculation_type": "page",
                "base_price": 120.0,  # سعر صفحة وجه واحد ملون ليزر
                "unit": "صفحة",
                "specifications": {
                    "paper_size": "booklet",
                    "color": "color",
                    "print_quality": "laser"
                },
                "display_order": 6
            },
            # قواعد الفليكس حسب القياس (متر مربع)
            {
                "name_ar": "طباعة فليكس - خارجي",
                "name_en": "Flex Printing - Outdoor",
                "description_ar": "طباعة فليكس خارجي حسب القياس (متر مربع)",
                "description_en": "Outdoor flex printing by area (square meters)",
                "calculation_type": "area",
                "base_price": 5000.0,  # سعر المتر المربع
                "unit": "متر مربع",
                "specifications": {
                    "material_type": "flex",
                    "location": "outdoor"
                },
                "display_order": 7
            },
            {
                "name_ar": "طباعة فليكس - داخلي",
                "name_en": "Flex Printing - Indoor",
                "description_ar": "طباعة فليكس داخلي حسب القياس (متر مربع)",
                "description_en": "Indoor flex printing by area (square meters)",
                "calculation_type": "area",
                "base_price": 4000.0,  # سعر المتر المربع
                "unit": "متر مربع",
                "specifications": {
                    "material_type": "flex",
                    "location": "indoor"
                },
                "display_order": 8
            },
            {
                "name_ar": "طباعة فليكس - مقاوم للماء",
                "name_en": "Flex Printing - Waterproof",
                "description_ar": "طباعة فليكس مقاوم للماء حسب القياس (متر مربع)",
                "description_en": "Waterproof flex printing by area (square meters)",
                "calculation_type": "area",
                "base_price": 6000.0,  # سعر المتر المربع
                "unit": "متر مربع",
                "specifications": {
                    "material_type": "flex",
                    "location": "outdoor",
                    "waterproof": True
                },
                "display_order": 9
            },
        ]
        
        created_count = 0
        updated_count = 0
        skipped_count = 0
        
        for rule in pricing_rules:
            # التحقق من وجود القاعدة
            existing = db.execute(text("""
                SELECT id, base_price FROM pricing_rules 
                WHERE name_ar = :name_ar AND calculation_type = :calc_type
            """), {
                "name_ar": rule["name_ar"],
                "calc_type": rule["calculation_type"]
            }).fetchone()
            
            if existing:
                rule_id = existing[0]
                existing_price = existing[1]
                
                # تحديث السعر إذا كان مختلفاً
                if float(existing_price) != rule["base_price"]:
                    db.execute(text("""
                        UPDATE pricing_rules 
                        SET base_price = :base_price,
                            specifications = :specifications,
                            unit = :unit,
                            display_order = :display_order,
                            is_active = true
                        WHERE id = :id
                    """), {
                        "id": rule_id,
                        "base_price": rule["base_price"],
                        "specifications": json.dumps(rule["specifications"], ensure_ascii=False),
                        "unit": rule["unit"],
                        "display_order": rule["display_order"]
                    })
                    updated_count += 1
                    print(f"Updated: {rule['name_ar']} (ID: {rule_id}) - Price: {rule['base_price']}")
                else:
                    skipped_count += 1
                    print(f"Skipped: {rule['name_ar']} (already exists)")
            else:
                # إنشاء قاعدة جديدة
                result = db.execute(text("""
                    INSERT INTO pricing_rules 
                    (name_ar, name_en, description_ar, description_en, calculation_type, 
                     base_price, specifications, unit, is_active, display_order)
                    VALUES 
                    (:name_ar, :name_en, :description_ar, :description_en, :calculation_type,
                     :base_price, :specifications, :unit, true, :display_order)
                    RETURNING id
                """), {
                    "name_ar": rule["name_ar"],
                    "name_en": rule["name_en"],
                    "description_ar": rule["description_ar"],
                    "description_en": rule["description_en"],
                    "calculation_type": rule["calculation_type"],
                    "base_price": rule["base_price"],
                    "specifications": json.dumps(rule["specifications"], ensure_ascii=False),
                    "unit": rule["unit"],
                    "display_order": rule["display_order"]
                })
                
                rule_id = result.fetchone()[0]
                created_count += 1
                print(f"Created: {rule['name_ar']} (ID: {rule_id}) - Price: {rule['base_price']}")
        
        db.commit()
        
        print("\n" + "="*60)
        print("Pricing Rules Summary:")
        print(f"   Created: {created_count}")
        print(f"   Updated: {updated_count}")
        print(f"   Skipped: {skipped_count}")
        print(f"   Total: {len(pricing_rules)}")
        print("="*60)
        print("\nImportant Notes:")
        print("   - Base price = single side price")
        print("   - Double side = base price x 2 (calculated automatically)")
        print("   - No need for separate rules for single/double sides")
        print("\nPricing rules completed successfully!")
        
    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    complete_pricing_rules()

