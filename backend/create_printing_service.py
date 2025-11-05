"""
إنشاء خدمة طباعة جديدة مع workflow بخمس مراحل
"""
import os
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("❌ DATABASE_URL not found in environment")
    sys.exit(1)

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)

def create_printing_service():
    """إنشاء خدمة طباعة مع workflow"""
    db = SessionLocal()
    try:
        # 1. إنشاء الخدمة
        print("\nCreating printing service...")
        service_result = db.execute(text("""
            INSERT INTO services (name_en, name_ar, description_ar, description_en, icon, base_price, is_active, is_visible, display_order)
            VALUES ('Printing Service', 'خدمة الطباعة', 'طباعة الملفات والوثائق', 'Printing files and documents', '🖨️', 0, true, true, 0)
            ON CONFLICT DO NOTHING
            RETURNING id
        """))
        
        service_row = service_result.fetchone()
        if service_row:
            service_id = service_row[0]
            print(f"Success: Service created with ID: {service_id}")
        else:
            # جلب الخدمة الموجودة
            existing_service = db.execute(text("""
                SELECT id FROM services WHERE name_ar = 'خدمة الطباعة' LIMIT 1
            """)).fetchone()
            if existing_service:
                service_id = existing_service[0]
                print(f"Service already exists with ID: {service_id}")
            else:
                print("Error: Failed to create service")
                db.rollback()
                return
        
        db.commit()
        
        # 2. إنشاء workflow بخمس مراحل
        print("\nCreating workflow with 5 steps...")
        
        # حذف workflow القديم إذا كان موجوداً
        db.execute(text("""
            DELETE FROM service_workflows WHERE service_id = :service_id
        """), {"service_id": service_id})
        
        # المرحلة 1: رفع الملفات وعدد النسخ
        db.execute(text("""
            INSERT INTO service_workflows (service_id, step_number, step_type, step_name_ar, step_description_ar, step_config)
            VALUES (:service_id, 1, 'files', 'رفع الملفات وعدد النسخ', 'قم برفع ملفات PDF أو Word واختر عدد النسخ', 
                   '{"accept": "application/pdf,.pdf,.doc,.docx", "multiple": true, "analyze_pages": true, "show_quantity": true}'::jsonb)
        """), {"service_id": service_id})
        
        # المرحلة 2: إعدادات الطباعة
        db.execute(text("""
            INSERT INTO service_workflows (service_id, step_number, step_type, step_name_ar, step_description_ar, step_config)
            VALUES (:service_id, 2, 'print_options', 'إعدادات الطباعة', 'اختر قياس الورقة ونوع الطباعة', 
                   '{"fields": ["paper_size", "print_color", "print_quality", "print_sides"]}'::jsonb)
        """), {"service_id": service_id})
        
        # المرحلة 3: معلومات العميل والتوصيل
        db.execute(text("""
            INSERT INTO service_workflows (service_id, step_number, step_type, step_name_ar, step_description_ar, step_config)
            VALUES (:service_id, 3, 'customer_info', 'معلومات العميل', 'أدخل معلوماتك واختر طريقة الاستلام', 
                   '{"fields": ["whatsapp_optional"], "required": true}'::jsonb)
        """), {"service_id": service_id})
        
        # المرحلة 4: الفاتورة
        db.execute(text("""
            INSERT INTO service_workflows (service_id, step_number, step_type, step_name_ar, step_description_ar, step_config)
            VALUES (:service_id, 4, 'invoice', 'الفاتورة', 'مراجعة الطلب والتأكيد', '{}'::jsonb)
        """), {"service_id": service_id})
        
        # المرحلة 5: الملاحظات (اختياري)
        db.execute(text("""
            INSERT INTO service_workflows (service_id, step_number, step_type, step_name_ar, step_description_ar, step_config)
            VALUES (:service_id, 5, 'notes', 'ملاحظات', 'أضف أي ملاحظات إضافية (اختياري)', '{"required": false}'::jsonb)
        """), {"service_id": service_id})
        
        db.commit()
        print("Success: Workflow created with 5 steps")
        
        print("\nSuccess: Printing service created!")
        print(f"   Service ID: {service_id}")
        print("   Steps:")
        print("   1. Upload files and number of copies")
        print("   2. Print settings")
        print("   3. Customer info and delivery")
        print("   4. Invoice")
        print("   5. Notes")
        
    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    create_printing_service()

