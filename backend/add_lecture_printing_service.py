"""
سكريبت لإضافة خدمة طباعة المحاضرات مع مراحلها إلى قاعدة البيانات
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal, engine
from sqlalchemy import text
from models import Service, ServiceWorkflow
import json

def add_lecture_printing_service():
    """إضافة خدمة طباعة المحاضرات مع مراحلها"""
    db = SessionLocal()
    
    try:
        # 1. التحقق من وجود الخدمة
        existing_service = db.execute(
            text("SELECT id FROM services WHERE name_ar LIKE '%طباعة محاضرات%' OR name_ar LIKE '%محاضرات%'")
        ).fetchone()
        
        service_id = None
        
        if existing_service:
            service_id = existing_service[0]
            print(f"✅ الخدمة موجودة بالفعل (ID: {service_id})")
            # تحديث الخدمة
            db.execute(
                text("""
                    UPDATE services 
                    SET name_ar = :name_ar,
                        name_en = :name_en,
                        description_ar = :description_ar,
                        icon = :icon,
                        base_price = :base_price,
                        is_visible = :is_visible,
                        is_active = :is_active,
                        display_order = :display_order
                    WHERE id = :id
                """),
                {
                    "id": service_id,
                    "name_ar": "طباعة محاضرات",
                    "name_en": "Lecture Printing",
                    "description_ar": "خدمة طباعة المحاضرات مع خيارات متعددة للقياس والجودة",
                    "icon": "📚",
                    "base_price": 100.0,
                    "is_visible": True,
                    "is_active": True,
                    "display_order": 1
                }
            )
            db.commit()
            print("✅ تم تحديث الخدمة")
        else:
            # إنشاء الخدمة الجديدة
            result = db.execute(
                text("""
                    INSERT INTO services 
                    (name_ar, name_en, description_ar, icon, base_price, is_visible, is_active, display_order)
                    VALUES 
                    (:name_ar, :name_en, :description_ar, :icon, :base_price, :is_visible, :is_active, :display_order)
                    RETURNING id
                """),
                {
                    "name_ar": "طباعة محاضرات",
                    "name_en": "Lecture Printing",
                    "description_ar": "خدمة طباعة المحاضرات مع خيارات متعددة للقياس والجودة",
                    "icon": "📚",
                    "base_price": 100.0,
                    "is_visible": True,
                    "is_active": True,
                    "display_order": 1
                }
            )
            service_id = result.scalar()
            db.commit()
            print(f"✅ تم إنشاء الخدمة (ID: {service_id})")
        
        # 2. حذف المراحل القديمة لهذه الخدمة
        db.execute(
            text("DELETE FROM service_workflows WHERE service_id = :service_id"),
            {"service_id": service_id}
        )
        db.commit()
        print("✅ تم حذف المراحل القديمة")
        
        # 3. إضافة المراحل الجديدة
        
        # المرحلة 1: رفع الملفات وعدد النسخ
        workflow1_config = {
            "required": True,
            "multiple": True,
            "accept": "application/pdf,.pdf,.doc,.docx",
            "analyze_pages": True,
            "show_quantity": True
        }
        
        db.execute(
            text("""
                INSERT INTO service_workflows 
                (service_id, step_number, step_name_ar, step_name_en, step_description_ar, 
                 step_type, step_config, display_order, is_active)
                VALUES 
                (:service_id, :step_number, :step_name_ar, :step_name_en, :step_description_ar,
                 :step_type, :step_config::jsonb, :display_order, :is_active)
            """),
            {
                "service_id": service_id,
                "step_number": 1,
                "step_name_ar": "رفع الملفات وعدد النسخ",
                "step_name_en": "Upload Files and Quantity",
                "step_description_ar": "قم برفع ملفات المحاضرات (PDF أو Word) وحدد عدد النسخ المطلوبة",
                "step_type": "files",
                "step_config": json.dumps(workflow1_config),
                "display_order": 1,
                "is_active": True
            }
        )
        print("✅ تم إضافة المرحلة 1: رفع الملفات وعدد النسخ")
        
        # المرحلة 2: إعدادات الطباعة
        workflow2_config = {
            "required": True,
            "paper_sizes": ["A4", "B5"],
            "paper_size": "A4",
            "quality_options": {
                "color": {
                    "standard": "طباعة عادية",
                    "laser": "دقة عالية (ليزرية)"
                }
            }
        }
        
        db.execute(
            text("""
                INSERT INTO service_workflows 
                (service_id, step_number, step_name_ar, step_name_en, step_description_ar, 
                 step_type, step_config, display_order, is_active)
                VALUES 
                (:service_id, :step_number, :step_name_ar, :step_name_en, :step_description_ar,
                 :step_type, :step_config::jsonb, :display_order, :is_active)
            """),
            {
                "service_id": service_id,
                "step_number": 2,
                "step_name_ar": "إعدادات الطباعة",
                "step_name_en": "Print Settings",
                "step_description_ar": "اختر قياس الورق، نوع الطباعة، الجودة، وعدد الوجوه",
                "step_type": "print_options",
                "step_config": json.dumps(workflow2_config),
                "display_order": 2,
                "is_active": True
            }
        )
        print("✅ تم إضافة المرحلة 2: إعدادات الطباعة")
        
        # المرحلة 3: معلومات العميل ونوع الاستلام
        workflow3_config = {
            "required": True,
            "fields": ["whatsapp_optional"]
        }
        
        db.execute(
            text("""
                INSERT INTO service_workflows 
                (service_id, step_number, step_name_ar, step_name_en, step_description_ar, 
                 step_type, step_config, display_order, is_active)
                VALUES 
                (:service_id, :step_number, :step_name_ar, :step_name_en, :step_description_ar,
                 :step_type, :step_config::jsonb, :display_order, :is_active)
            """),
            {
                "service_id": service_id,
                "step_number": 3,
                "step_name_ar": "معلومات العميل والاستلام",
                "step_name_en": "Customer Info and Delivery",
                "step_description_ar": "أدخل معلوماتك واختر نوع الاستلام",
                "step_type": "customer_info",
                "step_config": json.dumps(workflow3_config),
                "display_order": 3,
                "is_active": True
            }
        )
        print("✅ تم إضافة المرحلة 3: معلومات العميل والاستلام")
        
        # المرحلة 4: الفاتورة (الملخص)
        workflow4_config = {
            "required": True
        }
        
        db.execute(
            text("""
                INSERT INTO service_workflows 
                (service_id, step_number, step_name_ar, step_name_en, step_description_ar, 
                 step_type, step_config, display_order, is_active)
                VALUES 
                (:service_id, :step_number, :step_name_ar, :step_name_en, :step_description_ar,
                 :step_type, :step_config::jsonb, :display_order, :is_active)
            """),
            {
                "service_id": service_id,
                "step_number": 4,
                "step_name_ar": "الفاتورة والملخص",
                "step_name_en": "Invoice and Summary",
                "step_description_ar": "راجع تفاصيل طلبك وأكد الإرسال",
                "step_type": "invoice",
                "step_config": json.dumps(workflow4_config),
                "display_order": 4,
                "is_active": True
            }
        )
        print("✅ تم إضافة المرحلة 4: الفاتورة والملخص")
        
        db.commit()
        print("\n✅ تم إكمال إضافة خدمة طباعة المحاضرات بنجاح!")
        print(f"   Service ID: {service_id}")
        print(f"   عدد المراحل: 4")
        
        return service_id
        
    except Exception as e:
        db.rollback()
        print(f"❌ خطأ: {e}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    print("🚀 بدء إضافة خدمة طباعة المحاضرات...\n")
    add_lecture_printing_service()
    print("\n✨ انتهى!")

