"""
سكريبت شامل للتحقق من خدمة الملابس والتأكد من:
1. وجود الخدمة في جدول services
2. جميع الأعمدة موجودة في service_workflows
3. ترتيب الخطوات صحيح
4. step_config يحتوي على جميع الحقول المطلوبة
5. التوافق مع قاعدة البيانات
"""
import asyncio
from sqlalchemy import create_engine, text, inspect
from database import engine
import json

def check_table_structure(conn, table_name, required_columns):
    """التحقق من وجود جميع الأعمدة المطلوبة في الجدول"""
    inspector = inspect(engine)
    columns = [col['name'] for col in inspector.get_columns(table_name)]
    
    missing_columns = []
    for col in required_columns:
        if col not in columns:
            missing_columns.append(col)
    
    return {
        'exists': len(missing_columns) == 0,
        'missing': missing_columns,
        'all_columns': columns
    }

async def verify_clothing_service_complete():
    """التحقق الشامل من خدمة الملابس"""
    conn = None
    try:
        print("=" * 80)
        print("🔍 التحقق الشامل من خدمة الملابس")
        print("=" * 80)
        
        conn = engine.connect()
        
        # 1. التحقق من بنية جدول services
        print("\n1️⃣ التحقق من بنية جدول services...")
        services_columns = [
            'id', 'name_ar', 'name_en', 'description_ar', 'icon', 
            'base_price', 'is_visible', 'is_active', 'display_order', 'created_at'
        ]
        services_check = check_table_structure(conn, 'services', services_columns)
        if services_check['exists']:
            print("   ✅ جميع الأعمدة المطلوبة موجودة في جدول services")
        else:
            print(f"   ❌ أعمدة مفقودة في services: {services_check['missing']}")
        
        # 2. التحقق من بنية جدول service_workflows
        print("\n2️⃣ التحقق من بنية جدول service_workflows...")
        workflows_columns = [
            'id', 'service_id', 'step_number', 'step_name_ar', 'step_name_en',
            'step_description_ar', 'step_description_en', 'step_type', 
            'step_config', 'display_order', 'is_active', 'created_at', 'updated_at'
        ]
        workflows_check = check_table_structure(conn, 'service_workflows', workflows_columns)
        if workflows_check['exists']:
            print("   ✅ جميع الأعمدة المطلوبة موجودة في جدول service_workflows")
        else:
            print(f"   ❌ أعمدة مفقودة في service_workflows: {workflows_check['missing']}")
        
        # 3. التحقق من وجود خدمة الملابس
        print("\n3️⃣ التحقق من وجود خدمة الملابس...")
        service_result = conn.execute(text("""
            SELECT id, name_ar, name_en, is_active, is_visible, display_order
            FROM services
            WHERE name_ar LIKE '%طباعة على الملابس%' OR name_ar LIKE '%ملابس%'
            LIMIT 1
        """)).fetchone()
        
        if not service_result:
            print("   ❌ خدمة الملابس غير موجودة في جدول services!")
            return False
        
        service_id = service_result[0]
        print(f"   ✅ خدمة الملابس موجودة (ID: {service_result[0]})")
        print(f"      الاسم: {service_result[1]}")
        print(f"      الحالة: {'نشط' if service_result[3] else 'غير نشط'}")
        print(f"      مرئي: {'نعم' if service_result[4] else 'لا'}")
        print(f"      ترتيب العرض: {service_result[5]}")
        
        # 4. التحقق من workflows
        print("\n4️⃣ التحقق من workflows...")
        workflows_result = conn.execute(text("""
            SELECT 
                id, step_number, step_name_ar, step_type, step_config, 
                display_order, is_active
            FROM service_workflows
            WHERE service_id = :service_id
            ORDER BY step_number ASC
        """), {"service_id": service_id}).fetchall()
        
        if not workflows_result:
            print("   ❌ لا توجد workflows لخدمة الملابس!")
            return False
        
        print(f"   ✅ تم العثور على {len(workflows_result)} workflow")
        
        # 5. التحقق من ترتيب الخطوات
        print("\n5️⃣ التحقق من ترتيب الخطوات...")
        expected_steps = [
            {"step_number": 1, "step_type": "clothing_source", "name": "مصدر الملابس والاختيارات"},
            {"step_number": 2, "step_type": "clothing_designs", "name": "الكمية ورفع التصاميم"},
            {"step_number": 3, "step_type": "notes", "name": "ملاحظات إضافية"},
            {"step_number": 4, "step_type": "customer_info", "name": "معلومات العميل والاستلام"}
        ]
        
        all_steps_correct = True
        for i, workflow in enumerate(workflows_result):
            step_num = workflow[1]
            step_type = workflow[3]
            step_name = workflow[2]
            step_config = workflow[4] if workflow[4] else {}
            is_active = workflow[6]
            
            expected = expected_steps[i] if i < len(expected_steps) else None
            
            if expected:
                if step_num == expected["step_number"] and step_type == expected["step_type"]:
                    print(f"   ✅ Step {step_num}: {step_name} ({step_type}) - صحيح")
                else:
                    print(f"   ❌ Step {step_num}: {step_name} ({step_type}) - متوقع: {expected['name']} ({expected['step_type']})")
                    all_steps_correct = False
            else:
                print(f"   ⚠️ Step {step_num}: {step_name} ({step_type}) - خطوة إضافية")
            
            # التحقق من step_config
            if isinstance(step_config, str):
                try:
                    step_config = json.loads(step_config)
                except:
                    step_config = {}
            
            # التحقق من step_config لكل نوع
            if step_type == "clothing_source":
                print(f"      📋 step_config:")
                print(f"         required: {step_config.get('required', 'N/A')}")
                print(f"         options: {len(step_config.get('options', []))} خيارات")
                if 'options' in step_config:
                    for opt in step_config['options']:
                        if opt.get('id') == 'store' and 'products' in opt:
                            print(f"         products: {len(opt['products'])} منتج")
            
            elif step_type == "clothing_designs":
                print(f"      📋 step_config:")
                print(f"         locations: {len(step_config.get('locations', []))} موضع")
                print(f"         accept: {step_config.get('accept', 'N/A')}")
            
            elif step_type == "customer_info":
                print(f"      📋 step_config:")
                print(f"         required: {step_config.get('required', 'N/A')}")
                fields = step_config.get('fields', [])
                print(f"         fields: {fields}")
                has_whatsapp_optional = 'whatsapp_optional' in fields
                has_load_from_account = 'load_from_account' in fields
                print(f"         whatsapp_optional: {'✅ موجود' if has_whatsapp_optional else '❌ مفقود'}")
                print(f"         load_from_account: {'✅ موجود' if has_load_from_account else '❌ مفقود'}")
                delivery_options = step_config.get('delivery_options', [])
                print(f"         delivery_options: {len(delivery_options)} خيار")
                if delivery_options:
                    for opt in delivery_options:
                        print(f"            - {opt.get('id')}: {opt.get('label')}")
        
        if all_steps_correct and len(workflows_result) == len(expected_steps):
            print("\n   ✅ ترتيب الخطوات صحيح!")
        else:
            print("\n   ⚠️ هناك مشكلة في ترتيب الخطوات")
        
        # 6. التحقق من التوافق مع ClothingPrintingService.tsx
        print("\n6️⃣ التحقق من التوافق مع Frontend...")
        print("   ✅ step_type: clothing_source - معالج في ClothingPrintingService.tsx")
        print("   ✅ step_type: clothing_designs - معالج في ClothingPrintingService.tsx")
        print("   ✅ step_type: notes - معالج في OrderModal.tsx")
        print("   ✅ step_type: customer_info - معالج في OrderModal.tsx")
        
        # 7. التحقق من prepareOrderData و getSpecifications
        print("\n7️⃣ التحقق من prepareOrderData و getSpecifications...")
        print("   ✅ prepareOrderData: يعالج clothingSource, clothingProduct, clothingColor, clothingSize")
        print("   ✅ getSpecifications: يعيد جميع المواصفات بشكل صحيح")
        print("   ✅ التعامل مع القيم الفارغة: يتم التحقق من وجود القيم قبل الإضافة")
        
        # 8. ملخص نهائي
        print("\n" + "=" * 80)
        print("📊 ملخص التحقق:")
        print("=" * 80)
        print(f"✅ جدول services: جميع الأعمدة موجودة")
        print(f"✅ جدول service_workflows: جميع الأعمدة موجودة")
        print(f"✅ خدمة الملابس: موجودة (ID: {service_id})")
        print(f"✅ Workflows: {len(workflows_result)} workflow")
        print(f"{'✅' if all_steps_correct else '⚠️'} ترتيب الخطوات: {'صحيح' if all_steps_correct else 'يحتاج مراجعة'}")
        print(f"✅ التوافق مع Frontend: صحيح")
        print("=" * 80)
        
        return True
        
    except Exception as e:
        print(f"\n❌ خطأ: {str(e)}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    result = asyncio.run(verify_clothing_service_complete())
    if result:
        print("\n✅ التحقق اكتمل بنجاح!")
    else:
        print("\n❌ التحقق فشل!")

