"""
إنشاء خدمة طباعة المحاضرات مع workflow كامل
"""
from sqlalchemy import text
from database import engine

def create_lecture_printing_service():
    """إنشاء خدمة طباعة المحاضرات و workflow"""
    conn = engine.connect()
    
    try:
        # 1. إنشاء الخدمة
        print("📝 إنشاء خدمة طباعة المحاضرات...")
        
        # التحقق من وجود الخدمة
        existing = conn.execute(text("""
            SELECT id FROM services WHERE name_ar = 'طباعة المحاضرات'
        """)).fetchone()
        
        if existing:
            service_id = existing[0]
            print(f"✅ الخدمة موجودة بالفعل (ID: {service_id})")
        else:
            # إنشاء الخدمة
            result = conn.execute(text("""
                INSERT INTO services (name_ar, name_en, description_ar, description_en, 
                                     icon, base_price, is_active, is_visible, display_order)
                VALUES ('طباعة المحاضرات', 'Lecture Printing', 
                       'خدمة طباعة المحاضرات والملفات التعليمية', 
                       'Lecture and educational files printing service',
                       '📄', 0, true, true, 1)
                RETURNING id
            """))
            service_id = result.fetchone()[0]
            conn.commit()
            print(f"✅ تم إنشاء الخدمة (ID: {service_id})")
        
        # 2. حذف workflow القديم إن وجد
        conn.execute(text("""
            DELETE FROM service_workflows WHERE service_id = :service_id
        """), {"service_id": service_id})
        conn.commit()
        print("🗑️ تم حذف workflow القديم إن وجد")
        
        # 3. إنشاء workflow steps
        import json
        
        workflow_steps = [
            {
                "step_number": 1,
                "step_name_ar": "الكمية ورفع الملفات",
                "step_name_en": "Quantity and Files Upload",
                "step_description_ar": "أدخل الكمية وارفع ملفات المحاضرة. سيتم تحليل عدد الصفحات تلقائياً",
                "step_type": "files",
                "step_config": {
                    "required": True,
                    "accept": "application/pdf,.pdf",
                    "multiple": True,
                    "analyze_pages": True,
                    "show_quantity": True
                }
            },
            {
                "step_number": 2,
                "step_name_ar": "خيارات الطباعة",
                "step_name_en": "Print Options",
                "step_description_ar": "اختر نوع الطباعة وجودتها وقياس الورق",
                "step_type": "print_options",
                "step_config": {
                    "required": True,
                    "paper_sizes": ["A4", "A5"],
                    "print_types": ["bw", "color"],
                    "quality_options": {
                        "color": ["standard", "laser"]
                    }
                }
            },
            {
                "step_number": 3,
                "step_name_ar": "عدد الوجوه",
                "step_name_en": "Print Sides",
                "step_description_ar": "اختر إذا كنت تريد طباعة وجه واحد أم وجهين",
                "step_type": "print_sides",
                "step_config": {
                    "required": True,
                    "options": ["single", "double"]
                }
            },
            {
                "step_number": 4,
                "step_name_ar": "معلومات التواصل",
                "step_name_en": "Contact Information",
                "step_type": "customer_info",
                "step_config": {
                    "required": True,
                    "fields": ["name", "phone", "whatsapp_optional"]
                }
            },
            {
                "step_number": 5,
                "step_name_ar": "طريقة الاستلام",
                "step_name_en": "Delivery Method",
                "step_type": "delivery",
                "step_config": {
                    "required": True,
                    "options": ["self", "delivery"],
                    "require_location": True
                }
            },
            {
                "step_number": 6,
                "step_name_ar": "الفاتورة والتأكيد",
                "step_name_en": "Invoice and Confirmation",
                "step_type": "invoice",
                "step_config": {
                    "show_summary": True,
                    "show_total": True
                }
            }
        ]
        
        for step in workflow_steps:
            conn.execute(text("""
                INSERT INTO service_workflows 
                (service_id, step_number, step_name_ar, step_name_en, step_description_ar, 
                 step_description_en, step_type, step_config, display_order, is_active)
                VALUES 
                (:service_id, :step_number, :step_name_ar, :step_name_en, :step_description_ar,
                 :step_description_en, :step_type, :step_config::jsonb, :display_order, :is_active)
            """), {
                "service_id": service_id,
                "step_number": step["step_number"],
                "step_name_ar": step["step_name_ar"],
                "step_name_en": step["step_name_en"],
                "step_description_ar": step.get("step_description_ar"),
                "step_description_en": step.get("step_description_en"),
                "step_type": step["step_type"],
                "step_config": json.dumps(step["step_config"]),
                "display_order": step["step_number"],
                "is_active": True
            })
        
        conn.commit()
        print(f"✅ تم إنشاء {len(workflow_steps)} مرحلة workflow")
        print(f"✅ خدمة طباعة المحاضرات جاهزة (Service ID: {service_id})")
        
        return service_id
        
    except Exception as e:
        conn.rollback()
        print(f"❌ خطأ: {e}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    create_lecture_printing_service()

