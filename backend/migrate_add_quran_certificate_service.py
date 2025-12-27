"""
Migration script to add Quran Certificate Printing service
Run this script to add:
- Service: طباعة إجازة حفظ القرآن الكريم
- Workflow steps: files, dimensions, card_type, notes, customer_info
"""

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import os
import json
from dotenv import load_dotenv

load_dotenv()

# Get DATABASE_URL
DATABASE_URL = (
    os.environ.get("DATABASE_URL") or 
    os.environ.get("POSTGRES_URL") or 
    os.environ.get("PGDATABASE") or
    os.getenv("DATABASE_URL", "")
)

if not DATABASE_URL:
    # Try to get from database.py if available
    try:
        import sys
        sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
        from database import engine
        DATABASE_URL = str(engine.url)
        print(f"✅ Using DATABASE_URL from database.py")
    except:
        DATABASE_URL = "postgresql://postgres@localhost:5432/khawam_local"
        print("⚠️ Warning: Using default localhost DATABASE_URL")

# Fix for Railway PostgreSQL connection
if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
elif DATABASE_URL and DATABASE_URL.startswith("postgresql+psycopg2://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql+psycopg2://", "postgresql://", 1)

def run_migration():
    """Run the migration to add Quran Certificate service"""
    try:
        engine = create_engine(DATABASE_URL, pool_pre_ping=True)
        SessionLocal = sessionmaker(bind=engine)
        db = SessionLocal()
        
        print("🔄 Starting Quran Certificate service migration...")
        print(f"📊 Database URL: {DATABASE_URL[:50]}...")
        
        # التحقق من وجود الخدمة
        existing_service = db.execute(text("""
            SELECT id, name_ar FROM services 
            WHERE name_ar LIKE '%إجازة%' OR name_ar LIKE '%قرآن%' OR name_ar LIKE '%حفظ%'
            LIMIT 1
        """)).fetchone()
        
        if existing_service:
            service_id = existing_service[0]
            print(f"✅ خدمة طباعة إجازة حفظ القرآن الكريم موجودة (ID: {service_id}) - إعادة بناء المراحل")
            # حذف المراحل القديمة وإعادة إنشائها
            db.execute(text("DELETE FROM service_workflows WHERE service_id = :service_id"), {"service_id": service_id})
            db.commit()
        else:
            # إنشاء الخدمة الجديدة
            result = db.execute(text("""
                INSERT INTO services 
                (name_ar, name_en, description_ar, icon, base_price, is_visible, is_active, display_order)
                VALUES 
                (:name_ar, :name_en, :description_ar, :icon, :base_price, :is_visible, :is_active, :display_order)
                RETURNING id
            """), {
                "name_ar": "طباعة إجازة حفظ القرآن الكريم",
                "name_en": "Quran Certificate Printing",
                "description_ar": "خدمة طباعة إجازات حفظ القرآن الكريم بقياسات مخصصة وأنواع كرتون مختلفة",
                "icon": "📜",
                "base_price": 0.0,
                "is_visible": True,
                "is_active": True,
                "display_order": 10
            })
            service_id = result.scalar()
            db.commit()
            print(f"✅ تم إنشاء خدمة طباعة إجازة حفظ القرآن الكريم (ID: {service_id})")
        
        # إضافة المراحل المخصصة لخدمة طباعة إجازة حفظ القرآن الكريم
        workflows = [
            {
                "step_number": 1,
                "step_name_ar": "رفع الملف والكمية",
                "step_name_en": "Upload File and Quantity",
                "step_description_ar": "قم برفع ملف التصميم وحدد عدد النسخ المطلوبة",
                "step_type": "files",
                "step_config": {
                    "required": True,
                    "multiple": False,
                    "accept": "image/*,.pdf,.ai,.psd,.png,.jpg,.jpeg,application/pdf",
                    "show_quantity": True
                }
            },
            {
                "step_number": 2,
                "step_name_ar": "قياس الإجازة",
                "step_name_en": "Certificate Dimensions",
                "step_description_ar": "حدد قياس الإجازة (الطول والعرض بالسنتيمتر). القياس الافتراضي هو 50×70 سم",
                "step_type": "dimensions",
                "step_config": {
                    "required": True,
                    "default_width": 50,
                    "default_height": 70,
                    "unit": "cm",
                    "show_default": True
                }
            },
            {
                "step_number": 3,
                "step_name_ar": "نوع الكرتون",
                "step_name_en": "Card Type",
                "step_description_ar": "اختر نوع الكرتون المطلوب للطباعة",
                "step_type": "card_type",
                "step_config": {
                    "required": True,
                    "default": "canson",
                    "options": [
                        {"value": "canson", "label_ar": "Canson (الافتراضي)", "label_en": "Canson (Default)"},
                        {"value": "normal", "label_ar": "كرتون عادي", "label_en": "Normal Cardboard"},
                        {"value": "glossy", "label_ar": "كرتون لامع", "label_en": "Glossy Cardboard"}
                    ]
                }
            },
            {
                "step_number": 4,
                "step_name_ar": "ملاحظات",
                "step_name_en": "Notes",
                "step_description_ar": "أضف أي ملاحظات إضافية حول طلبك",
                "step_type": "notes",
                "step_config": {
                    "required": False,
                    "placeholder": "أضف أي ملاحظات إضافية حول طلبك..."
                }
            },
            {
                "step_number": 5,
                "step_name_ar": "معلومات العميل",
                "step_name_en": "Customer Information",
                "step_description_ar": "أدخل معلوماتك للتواصل معك",
                "step_type": "customer_info",
                "step_config": {
                    "required": True,
                    "fields": ["name", "whatsapp", "whatsapp_optional", "delivery_type"]
                }
            }
        ]
        
        # إضافة المراحل
        for workflow in workflows:
            try:
                db.execute(text("""
                    INSERT INTO service_workflows 
                    (service_id, step_number, step_name_ar, step_name_en, step_description_ar, step_type, step_config, display_order, is_active)
                    VALUES 
                    (:service_id, :step_number, :step_name_ar, :step_name_en, :step_description_ar, :step_type, :step_config, :display_order, :is_active)
                """), {
                    "service_id": service_id,
                    "step_number": workflow["step_number"],
                    "step_name_ar": workflow["step_name_ar"],
                    "step_name_en": workflow["step_name_en"],
                    "step_description_ar": workflow["step_description_ar"],
                    "step_type": workflow["step_type"],
                    "step_config": json.dumps(workflow["step_config"]),
                    "display_order": workflow["step_number"],
                    "is_active": True
                })
                print(f"✅ تم إضافة المرحلة {workflow['step_number']}: {workflow['step_name_ar']}")
            except Exception as e:
                print(f"⚠️ خطأ في إضافة المرحلة {workflow['step_number']}: {str(e)[:100]}")
                try:
                    db.rollback()
                except:
                    pass
        
        db.commit()
        print("✅ Migration commit successful!")
        
        # التحقق من الخدمة والمراحل
        print("\n📋 Verifying service and workflows...")
        service_check = db.execute(text("""
            SELECT id, name_ar, is_visible, is_active 
            FROM services 
            WHERE id = :service_id
        """), {"service_id": service_id}).fetchone()
        
        if service_check:
            print(f"✅ Service found: {service_check[1]} (ID: {service_check[0]}, Visible: {service_check[2]}, Active: {service_check[3]})")
        
        workflow_count = db.execute(text("""
            SELECT COUNT(*) FROM service_workflows 
            WHERE service_id = :service_id
        """), {"service_id": service_id}).scalar()
        
        print(f"✅ Found {workflow_count} workflow steps for the service")
        
        db.close()
        
        print("\n✅ Migration completed successfully!")
        return True
    except Exception as e:
        print(f"❌ Migration failed: {str(e)}")
        import traceback
        traceback.print_exc()
        try:
            db.rollback()
        except:
            pass
        return False

if __name__ == "__main__":
    run_migration()

