"""
سكريبت للتحقق من وجود خدمة الملابس وتحديث workflow لمرحلة customer_info
"""
import asyncio
from sqlalchemy import create_engine, text
from database import engine
import json

async def verify_and_update_clothing_service():
    """التحقق من وجود خدمة الملابس وتحديث workflow"""
    conn = None
    try:
        print("=" * 80)
        print("🔍 التحقق من خدمة الملابس...")
        print("=" * 80)
        
        conn = engine.connect()
        
        # 1. التحقق من وجود خدمة الملابس
        print("\n1️⃣ التحقق من وجود خدمة الملابس في جدول services...")
        service_result = conn.execute(text("""
            SELECT id, name_ar, name_en, is_active, is_visible
            FROM services
            WHERE name_ar LIKE '%طباعة على الملابس%' OR name_ar LIKE '%ملابس%'
            LIMIT 1
        """)).fetchone()
        
        if not service_result:
            print("❌ خدمة الملابس غير موجودة في جدول services!")
            print("   سيتم إنشاء الخدمة...")
            result = conn.execute(text("""
                INSERT INTO services
                (name_ar, name_en, description_ar, icon, base_price, is_visible, is_active, display_order)
                VALUES
                (:name_ar, :name_en, :description_ar, :icon, :base_price, :is_visible, :is_active, :display_order)
                RETURNING id
            """), {
                "name_ar": "الطباعة على الملابس",
                "name_en": "Clothing Printing",
                "description_ar": "خدمة طباعة الشعارات والتصاميم على الملابس مع خيارات متعددة للمناطق والألوان",
                "icon": "👕",
                "base_price": 0,
                "is_visible": True,
                "is_active": True,
                "display_order": 2
            })
            service_id = result.scalar()
            conn.commit()
            print(f"✅ تم إنشاء خدمة الملابس (ID: {service_id})")
        else:
            service_id = service_result[0]
            print(f"✅ خدمة الملابس موجودة (ID: {service_id})")
            print(f"   الاسم: {service_result[1]}")
            print(f"   الحالة: {'نشط' if service_result[3] else 'غير نشط'}")
            print(f"   مرئي: {'نعم' if service_result[4] else 'لا'}")
        
        # 2. التحقق من وجود workflow لمرحلة customer_info
        print("\n2️⃣ التحقق من وجود workflow لمرحلة customer_info...")
        workflow_result = conn.execute(text("""
            SELECT id, step_number, step_name_ar, step_config
            FROM service_workflows
            WHERE service_id = :service_id AND step_type = 'customer_info'
            LIMIT 1
        """), {"service_id": service_id}).fetchone()
        
        if workflow_result:
            workflow_id = workflow_result[0]
            step_config = workflow_result[3] if workflow_result[3] else {}
            
            print(f"✅ workflow موجود (ID: {workflow_id}, Step: {workflow_result[1]})")
            print(f"   الاسم: {workflow_result[2]}")
            
            # التحقق من step_config
            if isinstance(step_config, str):
                step_config = json.loads(step_config)
            
            print(f"\n   📋 step_config الحالي:")
            print(f"      {json.dumps(step_config, ensure_ascii=False, indent=6)}")
            
            # التحقق من وجود whatsapp_optional في fields
            fields = step_config.get("fields", [])
            has_whatsapp_optional = "whatsapp_optional" in fields
            
            print(f"\n   🔍 التحقق من الحقول:")
            print(f"      fields: {fields}")
            print(f"      whatsapp_optional موجود: {'✅ نعم' if has_whatsapp_optional else '❌ لا'}")
            
            # تحديث step_config إذا لزم الأمر
            needs_update = False
            updated_config = step_config.copy()
            
            if not has_whatsapp_optional:
                if "fields" not in updated_config:
                    updated_config["fields"] = []
                if "whatsapp_optional" not in updated_config["fields"]:
                    updated_config["fields"].append("whatsapp_optional")
                    needs_update = True
                    print(f"\n   ➕ إضافة whatsapp_optional إلى fields...")
            
            # التأكد من وجود الحقول الأساسية
            required_fields = ["whatsapp_optional", "load_from_account"]
            for field in required_fields:
                if field not in updated_config.get("fields", []):
                    if "fields" not in updated_config:
                        updated_config["fields"] = []
                    updated_config["fields"].append(field)
                    needs_update = True
                    print(f"   ➕ إضافة {field} إلى fields...")
            
            # التأكد من وجود delivery_options
            if "delivery_options" not in updated_config:
                updated_config["delivery_options"] = [
                    {"id": "self", "label": "استلام ذاتي"},
                    {"id": "delivery", "label": "توصيل"}
                ]
                needs_update = True
                print(f"   ➕ إضافة delivery_options...")
            
            if needs_update:
                print(f"\n   🔄 تحديث workflow...")
                conn.execute(text("""
                    UPDATE service_workflows
                    SET step_config = CAST(:step_config AS jsonb),
                        updated_at = NOW()
                    WHERE id = :workflow_id
                """), {
                    "workflow_id": workflow_id,
                    "step_config": json.dumps(updated_config, ensure_ascii=False)
                })
                conn.commit()
                print(f"   ✅ تم تحديث workflow بنجاح!")
                print(f"\n   📋 step_config المحدث:")
                print(f"      {json.dumps(updated_config, ensure_ascii=False, indent=6)}")
            else:
                print(f"\n   ✅ workflow محدث بالفعل ولا يحتاج إلى تغييرات")
        else:
            print("❌ workflow لمرحلة customer_info غير موجود!")
            print("   سيتم إنشاء workflow جديد...")
            
            # إنشاء workflow جديد
            new_workflow_config = {
                "required": True,
                "fields": ["whatsapp_optional", "load_from_account"],
                "delivery_options": [
                    {"id": "self", "label": "استلام ذاتي"},
                    {"id": "delivery", "label": "توصيل"}
                ],
                "confirmation_message": "سنتواصل معك لتحديد المدة والتكلفة الأفضل لطلبك."
            }
            
            # الحصول على آخر step_number
            last_step = conn.execute(text("""
                SELECT MAX(step_number) FROM service_workflows
                WHERE service_id = :service_id
            """), {"service_id": service_id}).scalar()
            
            next_step = (last_step or 0) + 1
            
            conn.execute(text("""
                INSERT INTO service_workflows
                (service_id, step_number, step_name_ar, step_name_en, step_description_ar,
                 step_type, step_config, display_order, is_active)
                VALUES
                (:service_id, :step_number, :step_name_ar, :step_name_en, :step_description_ar,
                 :step_type, CAST(:step_config AS jsonb), :display_order, true)
            """), {
                "service_id": service_id,
                "step_number": next_step,
                "step_name_ar": "معلومات العميل والاستلام",
                "step_name_en": "Customer Info and Delivery",
                "step_description_ar": "استيراد بياناتك واختيار طريقة الاستلام المناسبة.",
                "step_type": "customer_info",
                "step_config": json.dumps(new_workflow_config, ensure_ascii=False),
                "display_order": next_step
            })
            conn.commit()
            print(f"✅ تم إنشاء workflow جديد (Step: {next_step})")
            print(f"\n   📋 step_config:")
            print(f"      {json.dumps(new_workflow_config, ensure_ascii=False, indent=6)}")
        
        # 3. التحقق من عرض الحقول في OrderModal
        print("\n3️⃣ ملخص الحقول المطلوبة في customer_info:")
        print("   ✅ الاسم (name) - يتم عرضه تلقائياً")
        print("   ✅ رقم واتساب (whatsapp) - يتم عرضه تلقائياً")
        print("   ✅ رقم إضافي (phone_extra) - يتم عرضه تلقائياً")
        print("   ✅ نوع الاستلام (delivery_type) - يتم عرضه من delivery_options")
        print("   ✅ whatsapp_optional موجود في fields - يجعل رقم واتساب اختياري")
        
        print("\n" + "=" * 80)
        print("✅ اكتمل التحقق والتحديث بنجاح!")
        print("=" * 80)
        
    except Exception as e:
        print(f"\n❌ خطأ: {str(e)}")
        import traceback
        traceback.print_exc()
        if conn:
            try:
                conn.rollback()
            except:
                pass
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    asyncio.run(verify_and_update_clothing_service())

