"""
إنشاء خدمة طباعة محاضرات مع workflow بخمس مراحل
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

def create_lecture_printing_service():
    """إنشاء خدمة طباعة محاضرات مع workflow"""
    db = SessionLocal()
    try:
        # 1. إنشاء الخدمة
        print("\nCreating lecture printing service...")
        
        # التحقق أولاً من وجود الخدمة
        existing_service = db.execute(text("""
            SELECT id, is_visible, is_active FROM services WHERE name_ar = 'طباعة محاضرات' LIMIT 1
        """)).fetchone()
        
        if existing_service:
            service_id = existing_service[0]
            is_visible = existing_service[1]
            is_active = existing_service[2]
            print(f"Service already exists with ID: {service_id}")
            
            # التأكد من أنها مرئية ونشطة
            if not is_visible or not is_active:
                db.execute(text("""
                    UPDATE services 
                    SET is_visible = true, is_active = true, display_order = 1
                    WHERE id = :id
                """), {"id": service_id})
                db.commit()
                print("Updated: Service is now visible and active")
        else:
            # إنشاء الخدمة الجديدة
            try:
                service_result = db.execute(text("""
                    INSERT INTO services (name_en, name_ar, description_ar, description_en, icon, base_price, is_active, is_visible, display_order)
                    VALUES ('Lecture Printing Service', 'طباعة محاضرات', 'طباعة المحاضرات والملخصات الدراسية', 'Printing lectures and study materials', '📚', 0, true, true, 1)
                    RETURNING id
                """))
                service_row = service_result.fetchone()
                if service_row:
                    service_id = service_row[0]
                    print(f"Success: Service created with ID: {service_id}")
                    db.commit()
                else:
                    print("Error: Failed to create service - no ID returned")
                    db.rollback()
                    return
            except Exception as insert_error:
                # إذا فشل الإدخال (مثلاً duplicate)، حاول الجلب مرة أخرى
                error_msg = str(insert_error).lower()
                if 'duplicate' in error_msg or 'unique' in error_msg:
                    print("Service might already exist, trying to fetch...")
                    db.rollback()
                    existing_service = db.execute(text("""
                        SELECT id FROM services WHERE name_ar = 'طباعة محاضرات' LIMIT 1
                    """)).fetchone()
                    if existing_service:
                        service_id = existing_service[0]
                        print(f"Service found with ID: {service_id}")
                    else:
                        print("Error: Failed to create or find service")
                        return
                else:
                    print(f"Insert error: {insert_error}")
                    db.rollback()
                    return
        
        # 2. إنشاء workflow بخمس مراحل
        print("\nCreating workflow with 5 steps...")
        
        # حذف workflow القديم إذا كان موجوداً
        try:
            db.execute(text("""
                DELETE FROM service_workflows WHERE service_id = :service_id
            """), {"service_id": service_id})
            db.commit()
        except Exception as e:
            print(f"Note: Could not delete old workflow (might not exist): {e}")
            db.rollback()
        
        # المرحلة 1: رفع الملفات وعدد النسخ
        step1_config = json.dumps({
            "accept": "application/pdf,.pdf,.doc,.docx",
            "multiple": True,
            "analyze_pages": True,
            "show_quantity": True
        }, ensure_ascii=False)
        
        db.execute(text("""
            INSERT INTO service_workflows (service_id, step_number, step_type, step_name_ar, step_description_ar, step_config)
            VALUES (:service_id, 1, 'files', 'رفع الملفات وعدد النسخ', 'قم برفع ملفات PDF أو Word للمحاضرات واختر عدد النسخ', 
                   CAST(:step_config AS jsonb))
        """), {"service_id": service_id, "step_config": step1_config})
        
        # المرحلة 2: إعدادات الطباعة
        step2_config = json.dumps({
            "fields": ["paper_size", "print_color", "print_quality", "print_sides"]
        }, ensure_ascii=False)
        
        db.execute(text("""
            INSERT INTO service_workflows (service_id, step_number, step_type, step_name_ar, step_description_ar, step_config)
            VALUES (:service_id, 2, 'print_options', 'إعدادات الطباعة', 'اختر قياس الورقة ونوع الطباعة', 
                   CAST(:step_config AS jsonb))
        """), {"service_id": service_id, "step_config": step2_config})
        
        # المرحلة 3: معلومات العميل والتوصيل
        step3_config = json.dumps({
            "fields": ["whatsapp_optional"],
            "required": True
        }, ensure_ascii=False)
        
        db.execute(text("""
            INSERT INTO service_workflows (service_id, step_number, step_type, step_name_ar, step_description_ar, step_config)
            VALUES (:service_id, 3, 'customer_info', 'معلومات العميل', 'أدخل معلوماتك واختر طريقة الاستلام', 
                   CAST(:step_config AS jsonb))
        """), {"service_id": service_id, "step_config": step3_config})
        
        # المرحلة 4: الفاتورة
        step4_config = json.dumps({}, ensure_ascii=False)
        
        db.execute(text("""
            INSERT INTO service_workflows (service_id, step_number, step_type, step_name_ar, step_description_ar, step_config)
            VALUES (:service_id, 4, 'invoice', 'الفاتورة', 'مراجعة الطلب والتأكيد', 
                   CAST(:step_config AS jsonb))
        """), {"service_id": service_id, "step_config": step4_config})
        
        # المرحلة 5: الملاحظات (اختياري)
        step5_config = json.dumps({
            "required": False
        }, ensure_ascii=False)
        
        db.execute(text("""
            INSERT INTO service_workflows (service_id, step_number, step_type, step_name_ar, step_description_ar, step_config)
            VALUES (:service_id, 5, 'notes', 'ملاحظات', 'أضف أي ملاحظات إضافية (اختياري)', 
                   CAST(:step_config AS jsonb))
        """), {"service_id": service_id, "step_config": step5_config})
        
        db.commit()
        print("Success: Workflow created with 5 steps")
        
        # 3. التحقق من ظهور الخدمة
        print("\nVerifying service visibility...")
        verification = db.execute(text("""
            SELECT id, name_ar, is_visible, is_active, display_order 
            FROM services 
            WHERE name_ar = 'طباعة محاضرات'
        """)).fetchone()
        
        if verification:
            service_id, name_ar, is_visible, is_active, display_order = verification
            print(f"Service found:")
            print(f"   ID: {service_id}")
            print(f"   Name: {name_ar}")
            print(f"   Visible: {is_visible}")
            print(f"   Active: {is_active}")
            print(f"   Display Order: {display_order}")
            
            if not is_visible or not is_active:
                print("\nWarning: Service is not visible or not active!")
                print("   Fixing...")
                db.execute(text("""
                    UPDATE services 
                    SET is_visible = true, is_active = true 
                    WHERE id = :id
                """), {"id": service_id})
                db.commit()
                print("Fixed: Service is now visible and active")
        else:
            print("Error: Service not found after creation!")
        
        print("\n" + "="*60)
        print("Success: Lecture printing service created!")
        print(f"   Service ID: {service_id}")
        print("   Steps:")
        print("   1. Upload files and number of copies")
        print("   2. Print settings")
        print("   3. Customer info and delivery")
        print("   4. Invoice")
        print("   5. Notes")
        print("="*60)
        
    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    create_lecture_printing_service()
