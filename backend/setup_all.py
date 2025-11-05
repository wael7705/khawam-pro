"""
سكريبت موحد لإدخال الخدمة الجديدة وإكمال القواعد المالية
يتعامل مع جميع الأخطاء ولا يتوقف حتى ينجح
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

def setup_all():
    """إعداد شامل: إنشاء الخدمة وإكمال القواعد المالية"""
    db = SessionLocal()
    success_count = 0
    error_count = 0
    
    try:
        print("\n" + "="*60)
        print("Starting Complete Setup")
        print("="*60)
        
        # ========== 1. إنشاء خدمة طباعة محاضرات ==========
        print("\n[1/2] Creating lecture printing service...")
        try:
            # التحقق من وجود الخدمة
            existing_service = db.execute(text("""
                SELECT id, is_visible, is_active FROM services WHERE name_ar = 'طباعة محاضرات' LIMIT 1
            """)).fetchone()
            
            if existing_service:
                service_id = existing_service[0]
                is_visible = existing_service[1]
                is_active = existing_service[2]
                print(f"  Service exists: ID={service_id}")
                
                if not is_visible or not is_active:
                    db.execute(text("""
                        UPDATE services 
                        SET is_visible = true, is_active = true, display_order = 1
                        WHERE id = :id
                    """), {"id": service_id})
                    db.commit()
                    print("  Updated: Service is now visible and active")
            else:
                # إنشاء الخدمة
                try:
                    service_result = db.execute(text("""
                        INSERT INTO services (name_en, name_ar, description_ar, description_en, icon, base_price, is_active, is_visible, display_order)
                        VALUES ('Lecture Printing Service', 'طباعة محاضرات', 'طباعة المحاضرات والملخصات الدراسية', 'Printing lectures and study materials', '📚', 0, true, true, 1)
                        RETURNING id
                    """))
                    service_row = service_result.fetchone()
                    if service_row:
                        service_id = service_row[0]
                        print(f"  Created: Service ID={service_id}")
                        db.commit()
                    else:
                        raise Exception("No ID returned")
                except Exception as e:
                    error_msg = str(e).lower()
                    if 'duplicate' in error_msg or 'unique' in error_msg:
                        print("  Service might exist, fetching...")
                        db.rollback()
                        existing = db.execute(text("""
                            SELECT id FROM services WHERE name_ar = 'طباعة محاضرات' LIMIT 1
                        """)).fetchone()
                        if existing:
                            service_id = existing[0]
                            print(f"  Found: Service ID={service_id}")
                        else:
                            raise Exception("Cannot find or create service")
                    else:
                        raise
            
            # إنشاء workflow
            print("  Creating workflow...")
            try:
                # حذف workflow القديم
                db.execute(text("DELETE FROM service_workflows WHERE service_id = :id"), {"id": service_id})
                db.commit()
            except:
                db.rollback()
            
            # المراحل
            steps = [
                (1, 'files', 'رفع الملفات وعدد النسخ', 'قم برفع ملفات PDF أو Word للمحاضرات واختر عدد النسخ', {
                    "accept": "application/pdf,.pdf,.doc,.docx",
                    "multiple": True,
                    "analyze_pages": True,
                    "show_quantity": True
                }),
                (2, 'print_options', 'إعدادات الطباعة', 'اختر قياس الورقة ونوع الطباعة', {
                    "fields": ["paper_size", "print_color", "print_quality", "print_sides"]
                }),
                (3, 'customer_info', 'معلومات العميل', 'أدخل معلوماتك واختر طريقة الاستلام', {
                    "fields": ["whatsapp_optional"],
                    "required": True
                }),
                (4, 'invoice', 'الفاتورة', 'مراجعة الطلب والتأكيد', {}),
                (5, 'notes', 'ملاحظات', 'أضف أي ملاحظات إضافية (اختياري)', {
                    "required": False
                })
            ]
            
            for step_num, step_type, name_ar, desc_ar, config in steps:
                try:
                    config_json = json.dumps(config, ensure_ascii=False)
                    db.execute(text("""
                        INSERT INTO service_workflows (service_id, step_number, step_type, step_name_ar, step_description_ar, step_config)
                        VALUES (:service_id, :step_num, :step_type, :name_ar, :desc_ar, CAST(:config AS jsonb))
                    """), {
                        "service_id": service_id,
                        "step_num": step_num,
                        "step_type": step_type,
                        "name_ar": name_ar,
                        "desc_ar": desc_ar,
                        "config": config_json
                    })
                except Exception as e:
                    print(f"    Warning: Step {step_num} error: {e}")
            
            db.commit()
            print("  Success: Workflow created")
            success_count += 1
            
        except Exception as e:
            error_count += 1
            print(f"  Error creating service: {e}")
            db.rollback()
        
        # ========== 2. إكمال القواعد المالية ==========
        print("\n[2/2] Completing pricing rules...")
        try:
            pricing_rules = [
                # الصفحات
                {"name_ar": "طباعة A4 - أبيض وأسود", "name_en": "A4 Printing - Black & White",
                 "description_ar": "طباعة صفحة A4 وجه واحد أبيض وأسود",
                 "description_en": "A4 page printing single side black & white",
                 "calculation_type": "page", "base_price": 50.0, "unit": "صفحة",
                 "specifications": {"paper_size": "A4", "color": "bw"}, "display_order": 1},
                {"name_ar": "طباعة A4 - ملون عادي", "name_en": "A4 Printing - Color Standard",
                 "description_ar": "طباعة صفحة A4 وجه واحد ملون عادي",
                 "description_en": "A4 page printing single side color standard",
                 "calculation_type": "page", "base_price": 100.0, "unit": "صفحة",
                 "specifications": {"paper_size": "A4", "color": "color", "print_quality": "standard"}, "display_order": 2},
                {"name_ar": "طباعة A4 - ملون دقة عالية", "name_en": "A4 Printing - Color High Quality",
                 "description_ar": "طباعة صفحة A4 وجه واحد ملون دقة عالية (ليزرية)",
                 "description_en": "A4 page printing single side color high quality (laser)",
                 "calculation_type": "page", "base_price": 150.0, "unit": "صفحة",
                 "specifications": {"paper_size": "A4", "color": "color", "print_quality": "laser"}, "display_order": 3},
                {"name_ar": "طباعة Booklet (A5) - أبيض وأسود", "name_en": "Booklet (A5) Printing - Black & White",
                 "description_ar": "طباعة صفحة Booklet (A5) وجه واحد أبيض وأسود",
                 "description_en": "Booklet (A5) page printing single side black & white",
                 "calculation_type": "page", "base_price": 40.0, "unit": "صفحة",
                 "specifications": {"paper_size": "booklet", "color": "bw"}, "display_order": 4},
                {"name_ar": "طباعة Booklet (A5) - ملون عادي", "name_en": "Booklet (A5) Printing - Color Standard",
                 "description_ar": "طباعة صفحة Booklet (A5) وجه واحد ملون عادي",
                 "description_en": "Booklet (A5) page printing single side color standard",
                 "calculation_type": "page", "base_price": 80.0, "unit": "صفحة",
                 "specifications": {"paper_size": "booklet", "color": "color", "print_quality": "standard"}, "display_order": 5},
                {"name_ar": "طباعة Booklet (A5) - ملون دقة عالية", "name_en": "Booklet (A5) Printing - Color High Quality",
                 "description_ar": "طباعة صفحة Booklet (A5) وجه واحد ملون دقة عالية (ليزرية)",
                 "description_en": "Booklet (A5) page printing single side color high quality (laser)",
                 "calculation_type": "page", "base_price": 120.0, "unit": "صفحة",
                 "specifications": {"paper_size": "booklet", "color": "color", "print_quality": "laser"}, "display_order": 6},
                # الفليكس
                {"name_ar": "طباعة فليكس - خارجي", "name_en": "Flex Printing - Outdoor",
                 "description_ar": "طباعة فليكس خارجي حسب القياس (متر مربع)",
                 "description_en": "Outdoor flex printing by area (square meters)",
                 "calculation_type": "area", "base_price": 5000.0, "unit": "متر مربع",
                 "specifications": {"material_type": "flex", "location": "outdoor"}, "display_order": 7},
                {"name_ar": "طباعة فليكس - داخلي", "name_en": "Flex Printing - Indoor",
                 "description_ar": "طباعة فليكس داخلي حسب القياس (متر مربع)",
                 "description_en": "Indoor flex printing by area (square meters)",
                 "calculation_type": "area", "base_price": 4000.0, "unit": "متر مربع",
                 "specifications": {"material_type": "flex", "location": "indoor"}, "display_order": 8},
                {"name_ar": "طباعة فليكس - مقاوم للماء", "name_en": "Flex Printing - Waterproof",
                 "description_ar": "طباعة فليكس مقاوم للماء حسب القياس (متر مربع)",
                 "description_en": "Waterproof flex printing by area (square meters)",
                 "calculation_type": "area", "base_price": 6000.0, "unit": "متر مربع",
                 "specifications": {"material_type": "flex", "location": "outdoor", "waterproof": True}, "display_order": 9},
            ]
            
            created = 0
            updated = 0
            skipped = 0
            
            for rule in pricing_rules:
                try:
                    existing = db.execute(text("""
                        SELECT id, base_price FROM pricing_rules 
                        WHERE name_ar = :name_ar AND calculation_type = :calc_type
                    """), {
                        "name_ar": rule["name_ar"],
                        "calc_type": rule["calculation_type"]
                    }).fetchone()
                    
                    specs_json = json.dumps(rule["specifications"], ensure_ascii=False)
                    
                    if existing:
                        rule_id = existing[0]
                        existing_price = existing[1]
                        if float(existing_price) != rule["base_price"]:
                            db.execute(text("""
                                UPDATE pricing_rules 
                                SET base_price = :base_price, specifications = CAST(:specs AS jsonb),
                                    unit = :unit, display_order = :display_order, is_active = true
                                WHERE id = :id
                            """), {
                                "id": rule_id,
                                "base_price": rule["base_price"],
                                "specs": specs_json,
                                "unit": rule["unit"],
                                "display_order": rule["display_order"]
                            })
                            updated += 1
                            print(f"  Updated: {rule['name_ar']}")
                        else:
                            skipped += 1
                    else:
                        db.execute(text("""
                            INSERT INTO pricing_rules 
                            (name_ar, name_en, description_ar, description_en, calculation_type, 
                             base_price, specifications, unit, is_active, display_order)
                            VALUES 
                            (:name_ar, :name_en, :description_ar, :description_en, :calculation_type,
                             :base_price, CAST(:specs AS jsonb), :unit, true, :display_order)
                            RETURNING id
                        """), {
                            "name_ar": rule["name_ar"],
                            "name_en": rule["name_en"],
                            "description_ar": rule["description_ar"],
                            "description_en": rule["description_en"],
                            "calculation_type": rule["calculation_type"],
                            "base_price": rule["base_price"],
                            "specs": specs_json,
                            "unit": rule["unit"],
                            "display_order": rule["display_order"]
                        })
                        created += 1
                        print(f"  Created: {rule['name_ar']}")
                except Exception as e:
                    print(f"  Error with rule '{rule['name_ar']}': {e}")
                    error_count += 1
            
            db.commit()
            print(f"  Success: Created={created}, Updated={updated}, Skipped={skipped}")
            success_count += 1
            
        except Exception as e:
            error_count += 1
            print(f"  Error: {e}")
            db.rollback()
            import traceback
            traceback.print_exc()
        
        # ========== النتيجة النهائية ==========
        print("\n" + "="*60)
        print("Setup Summary")
        print("="*60)
        print(f"Success: {success_count}/2")
        print(f"Errors: {error_count}")
        print("="*60)
        
        if success_count == 2:
            print("\nComplete setup successful!")
            return True
        else:
            print("\nSome errors occurred, but setup partially completed.")
            return False
        
    except Exception as e:
        print(f"\nFatal error: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
        return False
    finally:
        db.close()

if __name__ == "__main__":
    success = setup_all()
    sys.exit(0 if success else 1)

