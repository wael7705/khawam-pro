from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy import text
from database import engine
from contextlib import asynccontextmanager
import os

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan event handler - بديل لـ @app.on_event("startup")"""
    # Startup - تأكد من أن التطبيق يبدأ حتى لو فشلت المهام الخلفية
    print("🚀 Application starting...")
    print(f"📊 PORT: {os.getenv('PORT', '8000')}")
    print(f"📊 DATABASE_URL: {'configured' if os.getenv('DATABASE_URL') else 'not set'}")
    
    # اختبار الاتصال بقاعدة البيانات (بدون إيقاف التطبيق إذا فشل)
    try:
        from database import engine
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        print("✅ Database connection verified")
    except Exception as db_error:
        print(f"⚠️ Database connection check failed (will retry later): {str(db_error)[:100]}")
        # لا نرفع الخطأ - التطبيق يجب أن يبدأ حتى لو كانت قاعدة البيانات غير متاحة مؤقتاً
    
    # بدء المهام في الخلفية - لا ننتظرها ولا نمنع بدء التطبيق
    import asyncio
    try:
        # الحصول على event loop الحالي
        loop = asyncio.get_event_loop()
        # استخدام create_task بشكل صحيح - ستعمل في الخلفية
        loop.create_task(_init_pricing_table())
        loop.create_task(_setup_lecture_printing_service())
        loop.create_task(_setup_clothing_printing_service())
        loop.create_task(_setup_flier_printing_service())
        loop.create_task(_setup_business_cards_service())
        loop.create_task(_setup_glossy_poster_service())
        loop.create_task(_setup_flex_printing_service())
        loop.create_task(_setup_banners_service())
        loop.create_task(_setup_quran_certificate_service())
        loop.create_task(_ensure_default_services())
        loop.create_task(_ensure_portfolio_images_column())
        loop.create_task(_ensure_order_archive_columns())
        loop.create_task(_init_advanced_pricing_data())
        loop.create_task(_init_hero_slides_table())
        loop.create_task(_daily_archive_task())
        loop.create_task(_monthly_archive_task())
        print("✅ Startup tasks initiated in background")
    except Exception as e:
        print(f"⚠️ Warning: Failed to create startup tasks: {str(e)[:200]}")
        import traceback
        traceback.print_exc()
        # نستمر في البدء حتى لو فشلت المهام - التطبيق يجب أن يبدأ
    
    # yield مباشرة - لا ننتظر اكتمال المهام
    print("✅ Application ready to serve requests")
    yield
    
    # Shutdown
    print("🛑 Application shutting down")

app = FastAPI(
    title="Khawam API",
    description="API for Khawam Printing Services",
    version="1.0.1",
    lifespan=lifespan
)

async def _init_pricing_table():
    """Create pricing_rules table"""
    import asyncio
    await asyncio.sleep(2)  # Wait a bit for database to be ready
    
    conn = None
    try:
        conn = engine.connect()
    except Exception as e:
        print(f"Warning: Database connection failed: {str(e)[:100]}")
        return
    
    if conn is None:
        return

    try:
        # التحقق من وجود الجدول
        check_table = conn.execute(text("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_schema = 'public'
                AND table_name = 'pricing_rules'
            )
        """)).fetchone()

        if check_table and check_table[0]:
            # الجدول موجود - التحقق من الأعمدة
            check_columns = conn.execute(text("""
                SELECT column_name
                FROM information_schema.columns
                WHERE table_name = 'pricing_rules'
            """)).fetchall()

            existing_columns = [col[0] for col in check_columns]

            # إضافة الأعمدة المفقودة
            columns_to_add = {
                'name_ar': "ALTER TABLE pricing_rules ADD COLUMN name_ar VARCHAR(200)",
                'name_en': "ALTER TABLE pricing_rules ADD COLUMN name_en VARCHAR(200)",
                'description_ar': "ALTER TABLE pricing_rules ADD COLUMN description_ar TEXT",
                'description_en': "ALTER TABLE pricing_rules ADD COLUMN description_en TEXT",
                'calculation_type': "ALTER TABLE pricing_rules ADD COLUMN calculation_type VARCHAR(20)",
                'price_multipliers': "ALTER TABLE pricing_rules ADD COLUMN price_multipliers JSONB",
                'specifications': "ALTER TABLE pricing_rules ADD COLUMN specifications JSONB",
                'unit': "ALTER TABLE pricing_rules ADD COLUMN unit VARCHAR(50)",
                'is_active': "ALTER TABLE pricing_rules ADD COLUMN is_active BOOLEAN DEFAULT true",
                'display_order': "ALTER TABLE pricing_rules ADD COLUMN display_order INTEGER DEFAULT 0",        
                'created_at': "ALTER TABLE pricing_rules ADD COLUMN created_at TIMESTAMP DEFAULT NOW()",        
                'updated_at': "ALTER TABLE pricing_rules ADD COLUMN updated_at TIMESTAMP DEFAULT NOW()"
            }

            for col_name, alter_sql in columns_to_add.items():
                if col_name not in existing_columns:
                    try:
                        conn.execute(text(alter_sql))
                        conn.commit()
                        print(f"✅ Added column '{col_name}' to pricing_rules table")
                    except Exception as e:
                        error_msg = str(e)
                        # تجاهل الخطأ إذا كان العمود موجوداً بالفعل
                        if 'already exists' in error_msg.lower() or 'duplicate column' in error_msg.lower():
                            print(f"⏭️  Column '{col_name}' already exists, skipping")
                        else:
                            print(f"⚠️ Error adding column '{col_name}': {error_msg[:100]}")
                            conn.rollback()
                else:
                    print(f"✅ Column '{col_name}' already exists")
        else:
            # الجدول غير موجود - إنشاؤه
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS pricing_rules (
                    id SERIAL PRIMARY KEY,
                    service_id INTEGER,
                    rule_name VARCHAR(200),
                    name_ar VARCHAR(200),
                    name_en VARCHAR(200),
                    description_ar TEXT,
                    description_en TEXT,
                    calculation_type VARCHAR(20),
                    base_price DECIMAL(10, 4),
                    price_multipliers JSONB,
                    specifications JSONB,
                    unit VARCHAR(50),
                    is_active BOOLEAN DEFAULT true,
                    display_order INTEGER DEFAULT 0,
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW()
                )
            """))
            conn.commit()
            print("✅ Created pricing_rules table")
    except Exception as e:
        print(f"❌ Error initializing pricing_rules table: {str(e)}")
        import traceback
        traceback.print_exc()
        if conn:
            try:
                conn.rollback()
            except:
                pass
    finally:
        if conn:
            try:
                conn.close()
            except:
                pass

async def _setup_lecture_printing_service():
    """إعداد خدمة طباعة المحاضرات تلقائياً عند بدء التطبيق"""
    import json
    import asyncio
    await asyncio.sleep(5)  # انتظار أكثر حتى تكون قاعدة البيانات جاهزة
    
    conn = None
    try:
        print("🔄 Starting lecture printing service setup...")
        conn = engine.connect()
        
        # التحقق من وجود الخدمة
        existing_service = conn.execute(text("""
            SELECT id, name_ar FROM services 
            WHERE name_ar LIKE '%طباعة محاضرات%' OR name_ar LIKE '%محاضرات%'
            LIMIT 1
        """)).fetchone()
        
        if existing_service:
            service_id = existing_service[0]
            # حذف المراحل القديمة وإعادة إنشائها
            conn.execute(text("DELETE FROM service_workflows WHERE service_id = :service_id"), {"service_id": service_id})
            conn.commit()
            print(f"✅ خدمة طباعة المحاضرات موجودة (ID: {service_id}) - إعادة بناء المراحل")
        else:
            # إنشاء الخدمة الجديدة
            result = conn.execute(text("""
                INSERT INTO services 
                (name_ar, name_en, description_ar, icon, base_price, is_visible, is_active, display_order)
                VALUES 
                (:name_ar, :name_en, :description_ar, :icon, :base_price, :is_visible, :is_active, :display_order)
                RETURNING id
            """), {
                "name_ar": "طباعة محاضرات",
                "name_en": "Lecture Printing",
                "description_ar": "خدمة طباعة المحاضرات مع خيارات متعددة للقياس والجودة",
                "icon": "📚",
                "base_price": 100.0,
                "is_visible": True,
                "is_active": True,
                "display_order": 1
            })
            service_id = result.scalar()
            conn.commit()
            print(f"✅ تم إنشاء خدمة طباعة المحاضرات (ID: {service_id})")
        
        # إضافة المراحل المخصصة لخدمة طباعة المحاضرات
        workflows = [
            {
                "step_number": 1,
                "step_name_ar": "رفع الملفات وعدد النسخ",
                "step_name_en": "Upload Files and Quantity",
                "step_description_ar": "قم برفع ملفات المحاضرات (PDF أو Word) وحدد عدد النسخ المطلوبة",
                "step_type": "files",
                "step_config": {
                    "required": True,
                    "multiple": True,
                    "accept": "application/pdf,.pdf,.doc,.docx",
                    "analyze_pages": True,
                    "show_quantity": True
                }
            },
            {
                "step_number": 2,
                "step_name_ar": "إعدادات الطباعة",
                "step_name_en": "Print Settings",
                "step_description_ar": "اختر قياس الورق، نوع الطباعة، الجودة، وعدد الوجوه",
                "step_type": "print_options",
                "step_config": {
                    "required": True,
                    "paper_sizes": ["A4", "B5"],
                    "paper_size": "A4",
                    "quality_options": {
                        "color": {
                            "standard": "طباعة عادية",
                            "laser": "دقة عالية (ليزرية)"
                        }
                    },
                    "hide_dimensions": True,  # إخفاء الأبعاد
                    "show_lamination": True  # إظهار خيار التسليك
                }
            },
            {
                "step_number": 3,
                "step_name_ar": "ملاحظات إضافية",
                "step_name_en": "Additional Notes",
                "step_description_ar": "أضف أي ملاحظات إضافية حول طلبك",
                "step_type": "notes",
                "step_config": {
                    "required": False,
                    "hide_work_type": True  # إخفاء نوع العمل
                }
            },
            {
                "step_number": 4,
                "step_name_ar": "معلومات العميل والاستلام",
                "step_name_en": "Customer Info and Delivery",
                "step_description_ar": "معلوماتك واختيار نوع الاستلام",
                "step_type": "customer_info",
                "step_config": {
                    "required": True,
                    "fields": ["whatsapp_optional", "load_from_account"]  # استيراد من الحساب
                }
            },
            {
                "step_number": 5,
                "step_name_ar": "الفاتورة والملخص",
                "step_name_en": "Invoice and Summary",
                "step_description_ar": "راجع تفاصيل طلبك وأكد الإرسال",
                "step_type": "invoice",
                "step_config": {
                    "required": True
                }
            }
        ]
        
        for workflow in workflows:
            try:
                step_config_json = json.dumps(workflow["step_config"])
                result = conn.execute(text("""
                    INSERT INTO service_workflows 
                    (service_id, step_number, step_name_ar, step_name_en, step_description_ar, 
                     step_type, step_config, display_order, is_active)
                    VALUES 
                    (:service_id, :step_number, :step_name_ar, :step_name_en, :step_description_ar,
                     :step_type, CAST(:step_config AS jsonb), :display_order, :is_active)
                """), {
                    "service_id": service_id,
                    "step_number": workflow["step_number"],
                    "step_name_ar": workflow["step_name_ar"],
                    "step_name_en": workflow["step_name_en"],
                    "step_description_ar": workflow["step_description_ar"],
                    "step_type": workflow["step_type"],
                    "step_config": step_config_json,
                    "display_order": workflow["step_number"],
                    "is_active": True
                })
                print(f"  ✅ Added step {workflow['step_number']}: {workflow['step_name_ar']} ({workflow['step_type']})")
            except Exception as step_error:
                print(f"  ❌ Error adding step {workflow['step_number']}: {str(step_error)}")
                import traceback
                traceback.print_exc()
        
        conn.commit()
        print(f"✅ تم إضافة {len(workflows)} مرحلة لخدمة طباعة المحاضرات (Service ID: {service_id})")
        
        # التحقق من أن المراحل تم إضافتها
        verify = conn.execute(text("""
            SELECT COUNT(*) FROM service_workflows WHERE service_id = :service_id
        """), {"service_id": service_id}).scalar()
        print(f"✅ Verification: {verify} workflows found for service {service_id}")
        
    except Exception as e:
        print(f"❌ Error setting up lecture printing service: {str(e)}")
        import traceback
        traceback.print_exc()
        if conn:
            try:
                conn.rollback()
            except:
                pass
    finally:
        if conn:
            try:
                conn.close()
            except:
                pass

async def _setup_clothing_printing_service():
    """إعداد خدمة الطباعة على الملابس تلقائياً عند بدء التطبيق"""
    import asyncio
    import json
    await asyncio.sleep(6)

    conn = None
    try:
        print("🔄 Starting clothing printing service setup...")
        conn = engine.connect()

        existing_service = conn.execute(text("""
            SELECT id FROM services
            WHERE name_ar LIKE '%طباعة على الملابس%' OR name_ar LIKE '%ملابس%'
            LIMIT 1
        """)).fetchone()

        if existing_service:
            service_id = existing_service[0]
            print(f"✅ خدمة الطباعة على الملابس موجودة بالفعل (ID: {service_id})")
        else:
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
            print(f"✅ تم إنشاء خدمة الطباعة على الملابس (ID: {service_id})")

        # إعادة بناء المراحل لضمان التحديث
        conn.execute(text("DELETE FROM service_workflows WHERE service_id = :service_id"), {"service_id": service_id})
        conn.commit()

        workflows = [
            {
                "step_number": 1,
                "step_name_ar": "مصدر الملابس والاختيارات",
                "step_name_en": "Clothing Source",
                "step_description_ar": "حدد ما إذا كنت ستوفر الملابس بنفسك أو ستطلبها من منتجاتنا، ثم اختر المنتج واللون المناسب.",
                "step_type": "clothing_source",
                "step_config": {
                    "required": True,
                    "options": [
                        {"id": "customer", "label": "الملابس من عندي"},
                        {
                            "id": "store",
                            "label": "من منتجات خوام",
                            "products": [
                                {
                                    "id": "hoodie",
                                    "name": "كنزة هودي",
                                    "image_url": "",
                                    "colors": ["أبيض", "أسود", "رمادي"],
                                    "sizes": ["S", "M", "L", "XL", "XXL"]
                                },
                                {
                                    "id": "summer_cotton_sweatshirt",
                                    "name": "كنزة صيفي قطن",
                                    "image_url": "",
                                    "colors": ["أبيض", "أسود"],
                                    "sizes": ["S", "M", "L", "XL", "XXL"]
                                }
                            ]
                        }
                    ]
                }
            },
            {
                "step_number": 2,
                "step_name_ar": "الكمية ورفع التصاميم",
                "step_name_en": "Quantity and Design Upload",
                "step_description_ar": "أدخل الكمية المطلوبة وارفع الملفات لكل موضع من التصميم.",
                "step_type": "clothing_designs",
                "step_config": {
                    "locations": [
                        {"id": "logo", "label": "شعار"},
                        {"id": "front", "label": "صدر"},
                        {"id": "back", "label": "ظهر"},
                        {"id": "shoulder_right", "label": "كتف أيمن"},
                        {"id": "shoulder_left", "label": "كتف أيسر"}
                    ],
                    "accept": ".pdf,.psd,.ai,.png,.jpg,.jpeg"
                }
            },
            {
                "step_number": 3,
                "step_name_ar": "ملاحظات إضافية",
                "step_name_en": "Additional Notes",
                "step_description_ar": "أضف أي تعليمات خاصة للألوان أو أماكن الطباعة.",
                "step_type": "notes",
                "step_config": {
                    "required": False
                }
            },
            {
                "step_number": 4,
                "step_name_ar": "معلومات العميل والاستلام",
                "step_name_en": "Customer Info and Delivery",
                "step_description_ar": "استيراد بياناتك واختيار طريقة الاستلام المناسبة.",
                "step_type": "customer_info",
                "step_config": {
                    "required": True,
                    "fields": ["load_from_account", "whatsapp_optional"],
                    "delivery_options": [
                        {"id": "self", "label": "استلام ذاتي"},
                        {"id": "delivery", "label": "توصيل"}
                    ],
                    "confirmation_message": "سنتواصل معك لتحديد المدة والتكلفة الأفضل لطلبك."
                }
            }
        ]

        for workflow in workflows:
            try:
                conn.execute(text("""
                    INSERT INTO service_workflows
                    (service_id, step_number, step_name_ar, step_name_en, step_description_ar,
                     step_type, step_config, display_order, is_active)
                    VALUES
                    (:service_id, :step_number, :step_name_ar, :step_name_en, :step_description_ar,
                     :step_type, CAST(:step_config AS jsonb), :display_order, true)
                """), {
                    "service_id": service_id,
                    "step_number": workflow["step_number"],
                    "step_name_ar": workflow["step_name_ar"],
                    "step_name_en": workflow["step_name_en"],
                    "step_description_ar": workflow["step_description_ar"],
                    "step_type": workflow["step_type"],
                    "step_config": json.dumps(workflow["step_config"], ensure_ascii=False),
                    "display_order": workflow["step_number"]
                })
                print(f"  ✅ Added clothing step {workflow['step_number']}: {workflow['step_name_ar']}")
            except Exception as step_error:
                print(f"  ❌ Error adding clothing step {workflow['step_number']}: {step_error}")
                import traceback
                traceback.print_exc()

        conn.commit()
        print(f"✅ تم تجهيز {len(workflows)} مرحلة لخدمة الطباعة على الملابس")

    except Exception as e:
        print(f"❌ Error setting up clothing printing service: {str(e)}")
        import traceback
        traceback.print_exc()
        if conn:
            try:
                conn.rollback()
            except:
                pass
    finally:
        if conn:
            try:
                conn.close()
            except:
                pass

async def _setup_flier_printing_service():
    """إعداد خدمة طباعة البروشورات تلقائياً عند بدء التطبيق"""
    import json
    import asyncio
    await asyncio.sleep(7)  # انتظار حتى تكون قاعدة البيانات جاهزة
    
    conn = None
    try:
        print("🔄 Starting brochure printing service setup...")
        conn = engine.connect()
        
        # التحقق من وجود الخدمة
        existing_service = conn.execute(text("""
            SELECT id, name_ar FROM services 
            WHERE name_ar LIKE '%طباعة بروشورات%' OR name_ar LIKE '%بروشورات%' OR name_ar LIKE '%طباعة فلير%' OR name_ar LIKE '%فلير%' OR name_ar LIKE '%فلاير%'
            LIMIT 1
        """)).fetchone()
        
        if existing_service:
            service_id = existing_service[0]
            # تحديث اسم الخدمة إذا كان مختلفاً
            if existing_service[1] != "طباعة بروشورات":
                conn.execute(text("""
                    UPDATE services 
                    SET name_ar = :name_ar, name_en = :name_en, description_ar = :description_ar
                    WHERE id = :id
                """), {
                    "id": service_id,
                    "name_ar": "طباعة بروشورات",
                    "name_en": "Brochure Printing",
                    "description_ar": "خدمة طباعة البروشورات الورقية مع خيارات متعددة لأنواع الورق والقياسات"
                })
                conn.commit()
                print(f"✅ تم تحديث اسم الخدمة إلى 'طباعة بروشورات' (ID: {service_id})")
            # حذف المراحل القديمة وإعادة إنشائها
            conn.execute(text("DELETE FROM service_workflows WHERE service_id = :service_id"), {"service_id": service_id})
            conn.commit()
            print(f"✅ خدمة طباعة البروشورات موجودة (ID: {service_id}) - إعادة بناء المراحل")
        else:
            # إنشاء الخدمة الجديدة
            result = conn.execute(text("""
                INSERT INTO services 
                (name_ar, name_en, description_ar, icon, base_price, is_visible, is_active, display_order)
                VALUES 
                (:name_ar, :name_en, :description_ar, :icon, :base_price, :is_visible, :is_active, :display_order)
                RETURNING id
            """), {
                "name_ar": "طباعة بروشورات",
                "name_en": "Brochure Printing",
                "description_ar": "خدمة طباعة البروشورات الورقية مع خيارات متعددة لأنواع الورق والقياسات",
                "icon": "📋",
                "base_price": 0.0,
                "is_visible": True,
                "is_active": True,
                "display_order": 8
            })
            service_id = result.scalar()
            conn.commit()
            print(f"✅ تم إنشاء خدمة طباعة البروشورات (ID: {service_id})")
        
        # إضافة المراحل المخصصة لخدمة طباعة البروشورات
        workflows = [
            {
                "step_number": 1,
                "step_name_ar": "الكمية ورفع الملف أو الصورة",
                "step_name_en": "Quantity and File Upload",
                "step_description_ar": "قم برفع الملف أو الصورة وحدد الكمية المطلوبة",
                "step_type": "files",
                "step_config": {
                    "required": True,
                    "multiple": False,
                    "accept": "image/*,.pdf,.jpg,.jpeg,.png",
                    "analyze_pages": False,
                    "show_quantity": True
                }
            },
            {
                "step_number": 2,
                "step_name_ar": "تحديد نوع الورق والقياس والدقة",
                "step_name_en": "Paper Type, Size and Quality",
                "step_description_ar": "اختر نوع الورق، القياس، ونوع الدقة",
                "step_type": "print_options",
                "step_config": {
                    "required": True,
                    "paper_sizes": ["A5", "A4", "custom"],
                    "paper_size": "A4",
                    "show_paper_type": True,
                    "paper_types": [
                        {"value": "glasse_170", "label": "Glasse 170"},
                        {"value": "glasse_210", "label": "Glasse 210"},
                        {"value": "glasse_250", "label": "Glasse 250"},
                        {"value": "bristol_170", "label": "Bristol 170"},
                        {"value": "bristol_240", "label": "Bristol 240"},
                        {"value": "mashsh_170", "label": "مقشش 170غ"},
                        {"value": "mashsh_250", "label": "مقشش 250غ"},
                        {"value": "mujann", "label": "معجن"},
                        {"value": "normal", "label": "ورق عادي"}
                    ],
                    "quality_options": {
                        "standard": "عادية",
                        "laser": "عالية (ليزرية)"
                    },
                    "force_color": True,  # البروشورات دائماً ملونة
                    "hide_print_sides": True,  # إخفاء عدد الوجوه (البروشورات عادة وجه واحد)
                    "hide_dimensions": False,  # إظهار الأبعاد للقياس المخصص
                    "show_custom_dimensions": True,  # إظهار حقول الأبعاد عند اختيار custom
                    "show_lamination": True,  # إظهار خيار التسليك
                    "show_notes_in_print_options": True  # إظهار خانة الملاحظات
                }
            },
            {
                "step_number": 3,
                "step_name_ar": "معلومات العميل والاستلام",
                "step_name_en": "Customer Info and Delivery",
                "step_description_ar": "معلوماتك واختيار نوع الاستلام",
                "step_type": "customer_info",
                "step_config": {
                    "required": True,
                    "fields": ["whatsapp_optional", "load_from_account"],
                    "skip_invoice": True  # تخطي مرحلة الفاتورة
                }
            }
        ]
        
        for workflow in workflows:
            try:
                step_config_json = json.dumps(workflow["step_config"], ensure_ascii=False)
                result = conn.execute(text("""
                    INSERT INTO service_workflows 
                    (service_id, step_number, step_name_ar, step_name_en, step_description_ar, 
                     step_type, step_config, display_order, is_active)
                    VALUES 
                    (:service_id, :step_number, :step_name_ar, :step_name_en, :step_description_ar,
                     :step_type, CAST(:step_config AS jsonb), :display_order, :is_active)
                """), {
                    "service_id": service_id,
                    "step_number": workflow["step_number"],
                    "step_name_ar": workflow["step_name_ar"],
                    "step_name_en": workflow["step_name_en"],
                    "step_description_ar": workflow["step_description_ar"],
                    "step_type": workflow["step_type"],
                    "step_config": step_config_json,
                    "display_order": workflow["step_number"],
                    "is_active": True
                })
                print(f"  ✅ Added step {workflow['step_number']}: {workflow['step_name_ar']} ({workflow['step_type']})")
            except Exception as step_error:
                print(f"  ❌ Error adding step {workflow['step_number']}: {str(step_error)}")
                import traceback
                traceback.print_exc()
        
        conn.commit()
        print(f"✅ تم إضافة {len(workflows)} مرحلة لخدمة طباعة البروشورات (Service ID: {service_id})")
        
        # التحقق من أن المراحل تم إضافتها
        verify = conn.execute(text("""
            SELECT COUNT(*) FROM service_workflows WHERE service_id = :service_id
        """), {"service_id": service_id}).scalar()
        print(f"✅ Verification: {verify} workflows found for service {service_id}")
        
    except Exception as e:
        print(f"❌ Error setting up brochure printing service: {str(e)}")
        import traceback
        traceback.print_exc()
        if conn:
            try:
                conn.rollback()
            except:
                pass
    finally:
        if conn:
            try:
                conn.close()
            except:
                pass

async def _setup_business_cards_service():
    """إعداد خدمة طباعة الكروت الشخصية تلقائياً عند بدء التطبيق"""
    import json
    import asyncio
    await asyncio.sleep(8)
    
    conn = None
    try:
        print("🔄 Starting business cards service setup...")
        conn = engine.connect()
        
        existing_service = conn.execute(text("""
            SELECT id, name_ar FROM services 
            WHERE name_ar LIKE '%كروت%' OR name_ar LIKE '%business%card%'
            LIMIT 1
        """)).fetchone()
        
        if existing_service:
            service_id = existing_service[0]
            conn.execute(text("DELETE FROM service_workflows WHERE service_id = :service_id"), {"service_id": service_id})
            conn.commit()
            print(f"✅ خدمة الكروت الشخصية موجودة (ID: {service_id}) - إعادة بناء المراحل")
        else:
            result = conn.execute(text("""
                INSERT INTO services 
                (name_ar, name_en, description_ar, icon, base_price, is_visible, is_active, display_order)
                VALUES 
                (:name_ar, :name_en, :description_ar, :icon, :base_price, :is_visible, :is_active, :display_order)
                RETURNING id
            """), {
                "name_ar": "الكروت الشخصية",
                "name_en": "Business Cards",
                "description_ar": "طباعة الكروت الشخصية مع خيارات متعددة",
                "icon": "💳",
                "base_price": 0.0,
                "is_visible": True,
                "is_active": True,
                "display_order": 10
            })
            service_id = result.scalar()
            conn.commit()
            print(f"✅ تم إنشاء خدمة الكروت الشخصية (ID: {service_id})")
        
        workflows = [
            {
                "step_number": 1,
                "step_name_ar": "رفع الملفات",
                "step_name_en": "Upload Files",
                "step_description_ar": "قم برفع ملفات التصميم (AI, PDF, PSD, PNG, JPG)",
                "step_type": "files",
                "step_config": {
                    "required": True,
                    "multiple": False,
                    "accept": ".ai,.pdf,.psd,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg,application/postscript",
                    "analyze_pages": False,
                    "show_quantity": True
                }
            },
            {
                "step_number": 2,
                "step_name_ar": "إعدادات الطباعة",
                "step_name_en": "Print Settings",
                "step_description_ar": "اختر نوع الورق وعدد الوجوه",
                "step_type": "print_options",
                "step_config": {
                    "required": True,
                    "hide_paper_size": True,
                    "hide_dimensions": True,
                    "hide_print_color_choice": True,
                    "hide_quality_options": True,
                    "show_paper_type": True,
                    "paper_types": [
                        {"value": "mujann", "label": "معجن"},
                        {"value": "mashsh", "label": "مقشش"},
                        {"value": "carton", "label": "كرتون"}
                    ],
                    "show_print_sides": True,
                    "print_sides_options": {
                        "single": "وجه واحد",
                        "double": "وجهين"
                    }
                }
            },
            {
                "step_number": 3,
                "step_name_ar": "ملاحظات إضافية",
                "step_name_en": "Additional Notes",
                "step_description_ar": "أضف أي ملاحظات إضافية حول طلبك",
                "step_type": "notes",
                "step_config": {
                    "required": False,
                    "hide_work_type": False
                }
            },
            {
                "step_number": 4,
                "step_name_ar": "معلومات العميل والاستلام",
                "step_name_en": "Customer Info and Delivery",
                "step_description_ar": "معلوماتك واختيار نوع الاستلام",
                "step_type": "customer_info",
                "step_config": {
                    "required": True,
                    "fields": ["whatsapp_optional"]
                }
            },
            {
                "step_number": 5,
                "step_name_ar": "الفاتورة والملخص",
                "step_name_en": "Invoice and Summary",
                "step_description_ar": "راجع تفاصيل طلبك وأكد الإرسال",
                "step_type": "invoice",
                "step_config": {
                    "required": True
                }
            }
        ]
        
        for workflow in workflows:
            try:
                step_config_json = json.dumps(workflow["step_config"])
                conn.execute(text("""
                    INSERT INTO service_workflows 
                    (service_id, step_number, step_name_ar, step_name_en, step_description_ar, 
                     step_type, step_config, display_order, is_active)
                    VALUES 
                    (:service_id, :step_number, :step_name_ar, :step_name_en, :step_description_ar,
                     :step_type, CAST(:step_config AS jsonb), :display_order, :is_active)
                """), {
                    "service_id": service_id,
                    "step_number": workflow["step_number"],
                    "step_name_ar": workflow["step_name_ar"],
                    "step_name_en": workflow["step_name_en"],
                    "step_description_ar": workflow["step_description_ar"],
                    "step_type": workflow["step_type"],
                    "step_config": step_config_json,
                    "display_order": workflow["step_number"],
                    "is_active": True
                })
                print(f"  ✅ Added step {workflow['step_number']}: {workflow['step_name_ar']}")
            except Exception as step_error:
                print(f"  ❌ Error adding step {workflow['step_number']}: {str(step_error)}")
                import traceback
                traceback.print_exc()
        
        conn.commit()
        print(f"✅ تم إضافة {len(workflows)} مرحلة لخدمة الكروت الشخصية (Service ID: {service_id})")
        
    except Exception as e:
        print(f"❌ Error setting up business cards service: {str(e)}")
        import traceback
        traceback.print_exc()
        if conn:
            try:
                conn.rollback()
            except:
                pass
    finally:
        if conn:
            try:
                conn.close()
            except:
                pass

async def _setup_glossy_poster_service():
    """إعداد خدمة طباعة كلك بولستر تلقائياً عند بدء التطبيق"""
    import json
    import asyncio
    await asyncio.sleep(9)
    
    conn = None
    try:
        print("🔄 Starting glossy poster service setup...")
        conn = engine.connect()
        
        existing_service = conn.execute(text("""
            SELECT id, name_ar FROM services 
            WHERE name_ar LIKE '%كلك%بولستر%' OR name_ar LIKE '%glossy%poster%'
            LIMIT 1
        """)).fetchone()
        
        if existing_service:
            service_id = existing_service[0]
            conn.execute(text("DELETE FROM service_workflows WHERE service_id = :service_id"), {"service_id": service_id})
            conn.commit()
            print(f"✅ خدمة كلك بولستر موجودة (ID: {service_id}) - إعادة بناء المراحل")
        else:
            result = conn.execute(text("""
                INSERT INTO services 
                (name_ar, name_en, description_ar, icon, base_price, is_visible, is_active, display_order)
                VALUES 
                (:name_ar, :name_en, :description_ar, :icon, :base_price, :is_visible, :is_active, :display_order)
                RETURNING id
            """), {
                "name_ar": "طباعة كلك بولستر",
                "name_en": "Glossy Poster",
                "description_ar": "طباعة كلك بولستر عالية الجودة",
                "icon": "🖼️",
                "base_price": 0.0,
                "is_visible": True,
                "is_active": True,
                "display_order": 11
            })
            service_id = result.scalar()
            conn.commit()
            print(f"✅ تم إنشاء خدمة كلك بولستر (ID: {service_id})")
        
        workflows = [
            {
                "step_number": 1,
                "step_name_ar": "رفع الملفات",
                "step_name_en": "Upload Files",
                "step_description_ar": "قم برفع ملفات التصميم (AI, PDF, PSD, PNG, JPG)",
                "step_type": "files",
                "step_config": {
                    "required": True,
                    "multiple": False,
                    "accept": ".ai,.pdf,.psd,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg,application/postscript",
                    "analyze_pages": False,
                    "show_quantity": True
                }
            },
            {
                "step_number": 2,
                "step_name_ar": "الأبعاد",
                "step_name_en": "Dimensions",
                "step_description_ar": "حدد أبعاد الطباعة ووحدة القياس",
                "step_type": "dimensions",
                "step_config": {
                    "required": True,
                    "fields": ["width", "height"],
                    "hide_pages": True,
                    "hide_print_type": True,
                    "field_labels": {
                        "width": "العرض",
                        "height": "الارتفاع"
                    }
                }
            },
            {
                "step_number": 3,
                "step_name_ar": "إعدادات الطباعة",
                "step_name_en": "Print Settings",
                "step_description_ar": "اختر نوع الطباعة وجودتها",
                "step_type": "print_options",
                "step_config": {
                    "required": True,
                    "hide_paper_size": True,
                    "hide_dimensions": True,
                    "hide_print_sides": True,
                    "hide_print_color_choice": True,
                    "quality_options": {
                        "standard": "عادية",
                        "laser": "عالية (ليزرية)"
                    },
                    "force_color": True
                }
            },
            {
                "step_number": 4,
                "step_name_ar": "ملاحظات إضافية",
                "step_name_en": "Additional Notes",
                "step_description_ar": "أضف أي ملاحظات إضافية حول طلبك",
                "step_type": "notes",
                "step_config": {
                    "required": False,
                    "hide_work_type": False
                }
            },
            {
                "step_number": 5,
                "step_name_ar": "معلومات العميل والاستلام",
                "step_name_en": "Customer Info and Delivery",
                "step_description_ar": "معلوماتك واختيار نوع الاستلام",
                "step_type": "customer_info",
                "step_config": {
                    "required": True,
                    "fields": ["whatsapp_optional"]
                }
            },
            {
                "step_number": 6,
                "step_name_ar": "الفاتورة والملخص",
                "step_name_en": "Invoice and Summary",
                "step_description_ar": "راجع تفاصيل طلبك وأكد الإرسال",
                "step_type": "invoice",
                "step_config": {
                    "required": True
                }
            }
        ]
        
        for workflow in workflows:
            try:
                step_config_json = json.dumps(workflow["step_config"])
                conn.execute(text("""
                    INSERT INTO service_workflows 
                    (service_id, step_number, step_name_ar, step_name_en, step_description_ar, 
                     step_type, step_config, display_order, is_active)
                    VALUES 
                    (:service_id, :step_number, :step_name_ar, :step_name_en, :step_description_ar,
                     :step_type, CAST(:step_config AS jsonb), :display_order, :is_active)
                """), {
                    "service_id": service_id,
                    "step_number": workflow["step_number"],
                    "step_name_ar": workflow["step_name_ar"],
                    "step_name_en": workflow["step_name_en"],
                    "step_description_ar": workflow["step_description_ar"],
                    "step_type": workflow["step_type"],
                    "step_config": step_config_json,
                    "display_order": workflow["step_number"],
                    "is_active": True
                })
                print(f"  ✅ Added step {workflow['step_number']}: {workflow['step_name_ar']}")
            except Exception as step_error:
                print(f"  ❌ Error adding step {workflow['step_number']}: {str(step_error)}")
                import traceback
                traceback.print_exc()
        
        conn.commit()
        print(f"✅ تم إضافة {len(workflows)} مرحلة لخدمة كلك بولستر (Service ID: {service_id})")
        
    except Exception as e:
        print(f"❌ Error setting up glossy poster service: {str(e)}")
        import traceback
        traceback.print_exc()
        if conn:
            try:
                conn.rollback()
            except:
                pass
    finally:
        if conn:
            try:
                conn.close()
            except:
                pass

async def _setup_flex_printing_service():
    """إعداد خدمة طباعة الفليكس تلقائياً عند بدء التطبيق"""
    import json
    import asyncio
    await asyncio.sleep(10)
    
    conn = None
    try:
        print("🔄 Starting flex printing service setup...")
        conn = engine.connect()
        
        existing_service = conn.execute(text("""
            SELECT id, name_ar FROM services 
            WHERE name_ar LIKE '%فليكس%' OR name_ar LIKE '%flex%'
            LIMIT 1
        """)).fetchone()
        
        if existing_service:
            service_id = existing_service[0]
            conn.execute(text("DELETE FROM service_workflows WHERE service_id = :service_id"), {"service_id": service_id})
            conn.commit()
            print(f"✅ خدمة طباعة الفليكس موجودة (ID: {service_id}) - إعادة بناء المراحل")
        else:
            result = conn.execute(text("""
                INSERT INTO services 
                (name_ar, name_en, description_ar, icon, base_price, is_visible, is_active, display_order)
                VALUES 
                (:name_ar, :name_en, :description_ar, :icon, :base_price, :is_visible, :is_active, :display_order)
                RETURNING id
            """), {
                "name_ar": "طباعة فليكس",
                "name_en": "Flex Printing",
                "description_ar": "طباعة فليكس حسب القياس (متر مربع)",
                "icon": "🖨️",
                "base_price": 50.0,
                "is_visible": True,
                "is_active": True,
                "display_order": 2
            })
            service_id = result.scalar()
            conn.commit()
            print(f"✅ تم إنشاء خدمة طباعة الفليكس (ID: {service_id})")
        
        workflows = [
            {
                "step_number": 1,
                "step_name_ar": "رفع الملفات",
                "step_name_en": "Upload Files",
                "step_description_ar": "قم برفع ملفات التصميم (AI, PDF, PSD, PNG, JPG)",
                "step_type": "files",
                "step_config": {
                    "required": True,
                    "multiple": False,
                    "accept": ".ai,.pdf,.psd,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg,application/postscript",
                    "analyze_pages": False,
                    "show_quantity": False
                }
            },
            {
                "step_number": 2,
                "step_name_ar": "الأبعاد",
                "step_name_en": "Dimensions",
                "step_description_ar": "حدد أبعاد الطباعة ووحدة القياس",
                "step_type": "dimensions",
                "step_config": {
                    "required": True,
                    "fields": ["width", "height"],
                    "hide_pages": True,
                    "hide_print_type": True,
                    "field_labels": {
                        "width": "العرض",
                        "height": "الارتفاع"
                    }
                }
            },
            {
                "step_number": 3,
                "step_name_ar": "نوع الطباعة والفليكس",
                "step_name_en": "Print Type and Flex Type",
                "step_description_ar": "اختر نوع الطباعة وجودتها ونوع الفليكس",
                "step_type": "print_options",
                "step_config": {
                    "required": True,
                    "force_color": True,
                    "quality_options": {
                        "standard": "دقة عادية",
                        "uv": "دقة عالية (UV)"
                    },
                    "hide_paper_size": True,
                    "hide_print_sides": True,
                    "hide_print_color_choice": True,
                    "show_flex_type": True,
                    "flex_types": {
                        "normal": "عادي",
                        "lighted": "مضاء"
                    }
                }
            },
            {
                "step_number": 4,
                "step_name_ar": "ملاحظات إضافية",
                "step_name_en": "Additional Notes",
                "step_description_ar": "أضف أي ملاحظات إضافية حول طلبك",
                "step_type": "notes",
                "step_config": {
                    "required": False,
                    "hide_work_type": False
                }
            },
            {
                "step_number": 5,
                "step_name_ar": "معلومات العميل والاستلام",
                "step_name_en": "Customer Info and Delivery",
                "step_description_ar": "معلوماتك واختيار نوع الاستلام",
                "step_type": "customer_info",
                "step_config": {
                    "required": True,
                    "fields": ["whatsapp_optional"]
                }
            },
            {
                "step_number": 6,
                "step_name_ar": "الفاتورة والملخص",
                "step_name_en": "Invoice and Summary",
                "step_description_ar": "راجع تفاصيل طلبك وأكد الإرسال",
                "step_type": "invoice",
                "step_config": {
                    "required": True
                }
            }
        ]
        
        for workflow in workflows:
            try:
                step_config_json = json.dumps(workflow["step_config"])
                conn.execute(text("""
                    INSERT INTO service_workflows 
                    (service_id, step_number, step_name_ar, step_name_en, step_description_ar, 
                     step_type, step_config, display_order, is_active)
                    VALUES 
                    (:service_id, :step_number, :step_name_ar, :step_name_en, :step_description_ar,
                     :step_type, CAST(:step_config AS jsonb), :display_order, :is_active)
                """), {
                    "service_id": service_id,
                    "step_number": workflow["step_number"],
                    "step_name_ar": workflow["step_name_ar"],
                    "step_name_en": workflow["step_name_en"],
                    "step_description_ar": workflow["step_description_ar"],
                    "step_type": workflow["step_type"],
                    "step_config": step_config_json,
                    "display_order": workflow["step_number"],
                    "is_active": True
                })
                print(f"  ✅ Added step {workflow['step_number']}: {workflow['step_name_ar']}")
            except Exception as step_error:
                print(f"  ❌ Error adding step {workflow['step_number']}: {str(step_error)}")
                import traceback
                traceback.print_exc()
        
        conn.commit()
        print(f"✅ تم إضافة {len(workflows)} مرحلة لخدمة طباعة الفليكس (Service ID: {service_id})")
        
    except Exception as e:
        print(f"❌ Error setting up flex printing service: {str(e)}")
        import traceback
        traceback.print_exc()
        if conn:
            try:
                conn.rollback()
            except:
                pass
    finally:
        if conn:
            try:
                conn.close()
            except:
                pass

async def _setup_quran_certificate_service():
    """إعداد خدمة طباعة إجازة حفظ القرآن الكريم تلقائياً عند بدء التطبيق"""
    import json
    import asyncio
    await asyncio.sleep(12)  # انتظار أكثر حتى تكون قاعدة البيانات جاهزة
    
    conn = None
    try:
        print("🔄 Starting Quran Certificate service setup...")
        conn = engine.connect()
        
        # التحقق من وجود الخدمة
        existing_service = conn.execute(text("""
            SELECT id, name_ar FROM services 
            WHERE name_ar LIKE '%إجازة%' OR name_ar LIKE '%قرآن%' OR name_ar LIKE '%حفظ%'
            LIMIT 1
        """)).fetchone()
        
        if existing_service:
            service_id = existing_service[0]
            # حذف المراحل القديمة وإعادة إنشائها
            conn.execute(text("DELETE FROM service_workflows WHERE service_id = :service_id"), {"service_id": service_id})
            conn.commit()
            print(f"✅ خدمة طباعة إجازة حفظ القرآن الكريم موجودة (ID: {service_id}) - إعادة بناء المراحل")
        else:
            # إنشاء الخدمة الجديدة
            result = conn.execute(text("""
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
            conn.commit()
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
        
        for workflow in workflows:
            try:
                step_config_json = json.dumps(workflow["step_config"])
                result = conn.execute(text("""
                    INSERT INTO service_workflows 
                    (service_id, step_number, step_name_ar, step_name_en, step_description_ar, 
                     step_type, step_config, display_order, is_active)
                    VALUES 
                    (:service_id, :step_number, :step_name_ar, :step_name_en, :step_description_ar,
                     :step_type, CAST(:step_config AS jsonb), :display_order, :is_active)
                """), {
                    "service_id": service_id,
                    "step_number": workflow["step_number"],
                    "step_name_ar": workflow["step_name_ar"],
                    "step_name_en": workflow["step_name_en"],
                    "step_description_ar": workflow["step_description_ar"],
                    "step_type": workflow["step_type"],
                    "step_config": step_config_json,
                    "display_order": workflow["step_number"],
                    "is_active": True
                })
                print(f"  ✅ Added step {workflow['step_number']}: {workflow['step_name_ar']} ({workflow['step_type']})")
            except Exception as step_error:
                print(f"  ❌ Error adding step {workflow['step_number']}: {str(step_error)}")
                import traceback
                traceback.print_exc()
        
        conn.commit()
        print(f"✅ تم إضافة {len(workflows)} مرحلة لخدمة طباعة إجازة حفظ القرآن الكريم (Service ID: {service_id})")
        
        # التحقق من أن المراحل تم إضافتها
        verify = conn.execute(text("""
            SELECT COUNT(*) FROM service_workflows WHERE service_id = :service_id
        """), {"service_id": service_id}).scalar()
        print(f"✅ Verified: {verify} workflow steps created for service ID {service_id}")
        
    except Exception as e:
        print(f"❌ Error setting up Quran Certificate service: {str(e)}")
        import traceback
        traceback.print_exc()
        if conn:
            try:
                conn.rollback()
            except:
                pass
    finally:
        if conn:
            try:
                conn.close()
            except:
                pass

async def _setup_banners_service():
    """إعداد خدمة طباعة البانرات تلقائياً عند بدء التطبيق"""
    import json
    import asyncio
    await asyncio.sleep(11)
    
    conn = None
    try:
        print("🔄 Starting banners service setup...")
        conn = engine.connect()
        
        existing_service = conn.execute(text("""
            SELECT id, name_ar FROM services 
            WHERE name_ar LIKE '%بانرات%' OR name_ar LIKE '%banner%'
            LIMIT 1
        """)).fetchone()
        
        if existing_service:
            service_id = existing_service[0]
            # تحديث اسم الخدمة لإضافة (Roll up)
            conn.execute(text("""
                UPDATE services 
                SET name_ar = :name_ar
                WHERE id = :service_id
            """), {
                "service_id": service_id,
                "name_ar": "البانرات الإعلانية (Roll up)"
            })
            conn.commit()
            conn.execute(text("DELETE FROM service_workflows WHERE service_id = :service_id"), {"service_id": service_id})
            conn.commit()
            print(f"✅ خدمة البانرات موجودة (ID: {service_id}) - إعادة بناء المراحل")
        else:
            result = conn.execute(text("""
                INSERT INTO services 
                (name_ar, name_en, description_ar, icon, base_price, is_visible, is_active, display_order)
                VALUES 
                (:name_ar, :name_en, :description_ar, :icon, :base_price, :is_visible, :is_active, :display_order)
                RETURNING id
            """), {
                "name_ar": "البانرات الإعلانية (Roll up)",
                "name_en": "Advertising Banners (Roll up)",
                "description_ar": "طباعة بانرات إعلانية بجميع المقاسات",
                "icon": "📢",
                "base_price": 0.0,
                "is_visible": True,
                "is_active": True,
                "display_order": 3
            })
            service_id = result.scalar()
            conn.commit()
            print(f"✅ تم إنشاء خدمة البانرات (ID: {service_id})")
        
        workflows = [
            {
                "step_number": 1,
                "step_name_ar": "رفع الملفات",
                "step_name_en": "Upload Files",
                "step_description_ar": "قم برفع ملفات التصميم (AI, PDF, PSD, PNG, JPG)",
                "step_type": "files",
                "step_config": {
                    "required": True,
                    "multiple": False,
                    "accept": ".ai,.pdf,.psd,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg,application/postscript",
                    "analyze_pages": False,
                    "show_quantity": True
                }
            },
            {
                "step_number": 2,
                "step_name_ar": "الأبعاد",
                "step_name_en": "Dimensions",
                "step_description_ar": "حدد أبعاد الطباعة ووحدة القياس",
                "step_type": "dimensions",
                "step_config": {
                    "required": True,
                    "fields": ["width", "height"],
                    "hide_pages": True,
                    "hide_print_type": True,
                    "field_labels": {
                        "width": "العرض",
                        "height": "الارتفاع"
                    }
                }
            },
            {
                "step_number": 3,
                "step_name_ar": "نوع الطباعة و Roll up",
                "step_name_en": "Print Type and Roll up",
                "step_description_ar": "اختر نوع الطباعة ومصدر Roll up",
                "step_type": "print_options",
                "step_config": {
                    "required": True,
                    "hide_paper_size": True,
                    "hide_dimensions": True,
                    "hide_print_sides": True,
                    "hide_print_color_choice": True,
                    "hide_quality_options": True,
                    "show_print_type_choice": True,
                    "print_type_options": {
                        "flex": "فليكس",
                        "pvc": "PVC"
                    },
                    "show_rollup_source": True,
                    "rollup_source_options": {
                        "ours": "من عندنا",
                        "yours": "من عندك"
                    }
                }
            },
            {
                "step_number": 4,
                "step_name_ar": "ملاحظات إضافية",
                "step_name_en": "Additional Notes",
                "step_description_ar": "أضف أي ملاحظات إضافية حول طلبك",
                "step_type": "notes",
                "step_config": {
                    "required": False,
                    "hide_work_type": False
                }
            },
            {
                "step_number": 5,
                "step_name_ar": "معلومات العميل والاستلام",
                "step_name_en": "Customer Info and Delivery",
                "step_description_ar": "معلوماتك واختيار نوع الاستلام",
                "step_type": "customer_info",
                "step_config": {
                    "required": True,
                    "fields": ["whatsapp_optional"]
                }
            },
            {
                "step_number": 6,
                "step_name_ar": "الفاتورة والملخص",
                "step_name_en": "Invoice and Summary",
                "step_description_ar": "راجع تفاصيل طلبك وأكد الإرسال",
                "step_type": "invoice",
                "step_config": {
                    "required": True
                }
            }
        ]
        
        for workflow in workflows:
            try:
                step_config_json = json.dumps(workflow["step_config"])
                conn.execute(text("""
                    INSERT INTO service_workflows 
                    (service_id, step_number, step_name_ar, step_name_en, step_description_ar, 
                     step_type, step_config, display_order, is_active)
                    VALUES 
                    (:service_id, :step_number, :step_name_ar, :step_name_en, :step_description_ar,
                     :step_type, CAST(:step_config AS jsonb), :display_order, :is_active)
                """), {
                    "service_id": service_id,
                    "step_number": workflow["step_number"],
                    "step_name_ar": workflow["step_name_ar"],
                    "step_name_en": workflow["step_name_en"],
                    "step_description_ar": workflow["step_description_ar"],
                    "step_type": workflow["step_type"],
                    "step_config": step_config_json,
                    "display_order": workflow["step_number"],
                    "is_active": True
                })
                print(f"  ✅ Added step {workflow['step_number']}: {workflow['step_name_ar']}")
            except Exception as step_error:
                print(f"  ❌ Error adding step {workflow['step_number']}: {str(step_error)}")
                import traceback
                traceback.print_exc()
        
        conn.commit()
        print(f"✅ تم إضافة {len(workflows)} مرحلة لخدمة البانرات (Service ID: {service_id})")
        
    except Exception as e:
        print(f"❌ Error setting up banners service: {str(e)}")
        import traceback
        traceback.print_exc()
        if conn:
            try:
                conn.rollback()
            except:
                pass
    finally:
        if conn:
            try:
                conn.close()
            except:
                pass

async def _init_advanced_pricing_data():
    """تهيئة البيانات الأولية للأسعار المتقدمة"""
    import asyncio
    await asyncio.sleep(5)  # انتظار قليل لضمان جاهزية قاعدة البيانات
    
    try:
        from init_advanced_pricing_data import init_advanced_pricing_data
        init_advanced_pricing_data()
    except Exception as e:
        print(f"⚠️ Warning: Failed to init advanced pricing data: {str(e)[:200]}")

async def _init_advanced_pricing_data():
    """تهيئة البيانات الأولية للأسعار المتقدمة"""
    import asyncio
    await asyncio.sleep(5)  # انتظار قليل لضمان جاهزية قاعدة البيانات
    
    try:
        from init_advanced_pricing_data import init_advanced_pricing_data
        init_advanced_pricing_data()
    except Exception as e:
        print(f"⚠️ Warning: Failed to init advanced pricing data: {str(e)[:200]}")

async def _ensure_portfolio_images_column():
    """التأكد من وجود عمود images في جدول portfolio_works"""
    import asyncio
    await asyncio.sleep(12)  # انتظار حتى تكون قاعدة البيانات جاهزة
    
    conn = None
    try:
        print("🔄 Ensuring portfolio_works.images column exists...")
        conn = engine.connect()
        
        from sqlalchemy import text
        
        # التحقق من وجود العمود
        check_col = conn.execute(text("""
            SELECT 1 FROM information_schema.columns
            WHERE table_name='portfolio_works' AND column_name='images'
        """)).fetchone()
        
        if not check_col:
            # إضافة العمود إذا لم يكن موجوداً
            try:
                conn.execute(text("""
                    ALTER TABLE portfolio_works ADD COLUMN images TEXT[] DEFAULT ARRAY[]::TEXT[]
                """))
                conn.commit()
                print("✅ Added 'images' column to portfolio_works table")
            except Exception as alter_error:
                print(f"⚠️ Error adding images column: {alter_error}")
                conn.rollback()
        else:
            print("✅ portfolio_works.images column already exists")
    except Exception as e:
        print(f"❌ Error ensuring portfolio_works.images column: {str(e)}")
        import traceback
        traceback.print_exc()
        if conn:
            try:
                conn.rollback()
            except:
                pass
    finally:
        if conn:
            try:
                conn.close()
            except:
                pass

async def _ensure_order_archive_columns():
    """التأكد من وجود أعمدة delivery_date و completed_at في جدول orders"""
    import asyncio
    await asyncio.sleep(10)  # انتظار حتى تكون قاعدة البيانات جاهزة
    
    conn = None
    try:
        print("🔄 Ensuring order archive columns (delivery_date, completed_at) exist...")
        conn = engine.connect()
        
        from sqlalchemy import text
        
        # التحقق من وجود الأعمدة
        check_cols = conn.execute(text("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name='orders' 
            AND column_name IN ('delivery_date', 'completed_at')
        """)).fetchall()
        
        existing_cols = [col[0] for col in check_cols]
        
        # إضافة delivery_date إذا لم يكن موجوداً
        if 'delivery_date' not in existing_cols:
            try:
                conn.execute(text("""
                    ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_date DATE
                """))
                conn.commit()
                print("✅ Added 'delivery_date' column to orders table")
            except Exception as alter_error:
                print(f"⚠️ Error adding delivery_date column: {alter_error}")
                conn.rollback()
        else:
            print("✅ orders.delivery_date column already exists")
        
        # إضافة completed_at إذا لم يكن موجوداً
        if 'completed_at' not in existing_cols:
            try:
                conn.execute(text("""
                    ALTER TABLE orders ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP
                """))
                conn.commit()
                print("✅ Added 'completed_at' column to orders table")
            except Exception as alter_error:
                print(f"⚠️ Error adding completed_at column: {alter_error}")
                conn.rollback()
        else:
            print("✅ orders.completed_at column already exists")
            
    except Exception as e:
        print(f"❌ Error ensuring order archive columns: {str(e)}")
        import traceback
        traceback.print_exc()
        if conn:
            try:
                conn.rollback()
            except:
                pass
    finally:
        if conn:
            try:
                conn.close()
            except:
                pass

async def _init_hero_slides_table():
    """إنشاء جدول hero_slides إذا لم يكن موجوداً"""
    import asyncio
    await asyncio.sleep(3)  # انتظار قليل لضمان جاهزية قاعدة البيانات
    
    conn = None
    try:
        print("🔄 Initializing hero_slides table...")
        conn = engine.connect()
        
        # التحقق من وجود الجدول
        check_table = conn.execute(text("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_schema = 'public'
                AND table_name = 'hero_slides'
            )
        """)).fetchone()
        
        if check_table and check_table[0]:
            # الجدول موجود - التحقق من الأعمدة
            check_columns = conn.execute(text("""
                SELECT column_name
                FROM information_schema.columns
                WHERE table_name = 'hero_slides'
            """)).fetchall()
            
            existing_columns = [col[0] for col in check_columns]
            required_columns = ['id', 'image_url', 'is_logo', 'is_active', 'display_order', 'created_at', 'updated_at']
            
            # إضافة الأعمدة المفقودة
            columns_to_add = {
                'id': "ALTER TABLE hero_slides ADD COLUMN id SERIAL PRIMARY KEY",
                'image_url': "ALTER TABLE hero_slides ADD COLUMN image_url TEXT NOT NULL",
                'is_logo': "ALTER TABLE hero_slides ADD COLUMN is_logo BOOLEAN DEFAULT false",
                'is_active': "ALTER TABLE hero_slides ADD COLUMN is_active BOOLEAN DEFAULT true",
                'display_order': "ALTER TABLE hero_slides ADD COLUMN display_order INTEGER DEFAULT 0",
                'created_at': "ALTER TABLE hero_slides ADD COLUMN created_at TIMESTAMP DEFAULT NOW()",
                'updated_at': "ALTER TABLE hero_slides ADD COLUMN updated_at TIMESTAMP DEFAULT NOW()"
            }
            
            for col_name in required_columns:
                if col_name not in existing_columns:
                    if col_name == 'id':
                        # لا يمكن إضافة PRIMARY KEY بعد إنشاء الجدول
                        continue
                    try:
                        alter_sql = columns_to_add.get(col_name)
                        if alter_sql:
                            conn.execute(text(alter_sql))
                            conn.commit()
                            print(f"✅ Added column '{col_name}' to hero_slides table")
                    except Exception as e:
                        error_msg = str(e)
                        if 'already exists' in error_msg.lower() or 'duplicate column' in error_msg.lower():
                            print(f"⏭️  Column '{col_name}' already exists, skipping")
                        else:
                            print(f"⚠️ Error adding column '{col_name}': {error_msg[:100]}")
                            conn.rollback()
                else:
                    print(f"✅ Column '{col_name}' already exists")
            
            print("✅ hero_slides table verified")
        else:
            # الجدول غير موجود - إنشاؤه
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS hero_slides (
                    id SERIAL PRIMARY KEY,
                    image_url TEXT NOT NULL,
                    is_logo BOOLEAN DEFAULT false,
                    is_active BOOLEAN DEFAULT true,
                    display_order INTEGER DEFAULT 0,
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW()
                )
            """))
            conn.commit()
            print("✅ Created hero_slides table")
    except Exception as e:
        print(f"❌ Error initializing hero_slides table: {str(e)}")
        import traceback
        traceback.print_exc()
        if conn:
            try:
                conn.rollback()
            except:
                pass
    finally:
        if conn:
            try:
                conn.close()
            except:
                pass

async def _ensure_default_services():
    """التأكد من وجود الخدمات الأساسية في قاعدة البيانات"""
    import asyncio
    await asyncio.sleep(13)  # انتظار حتى تكون قاعدة البيانات جاهزة
    
    conn = None
    try:
        print("🔄 Ensuring default services exist...")
        conn = engine.connect()
        
        from sqlalchemy import text
        
        default_services = [
            {
                "name_ar": "طباعة محاضرات",
                "name_en": "Lecture Printing",
                "description_ar": "خدمة طباعة المحاضرات مع خيارات متعددة للقياس والجودة",
                "icon": "📚",
                "display_order": 1
            },
            {
                "name_ar": "الطباعة على الملابس",
                "name_en": "Clothing Printing",
                "description_ar": "طباعة الشعارات والتصاميم على التيشرتات والملابس بخيارات متعددة",
                "icon": "👕",
                "display_order": 2
            },
            {
                "name_ar": "طباعة فليكس",
                "name_en": "Flex Printing",
                "description_ar": "طباعة فليكس حسب القياس (متر مربع)",
                "icon": "🖨️",
                "display_order": 3
            },
            {
                "name_ar": "طباعة فينيل",
                "name_en": "Vinyl Printing",
                "description_ar": "طباعة فينيل لاصق بجميع الأنواع",
                "icon": "🎨",
                "display_order": 4
            },
            {
                "name_ar": "طباعة بروشورات",
                "name_en": "Brochure Printing",
                "description_ar": "خدمة طباعة البروشورات الورقية مع خيارات متعددة لأنواع الورق والقياسات",
                "icon": "📋",
                "display_order": 8
            },
            {
                "name_ar": "الكروت الشخصية",
                "name_en": "Business Cards",
                "description_ar": "طباعة الكروت الشخصية مع خيارات متعددة",
                "icon": "💳",
                "display_order": 10
            },
            {
                "name_ar": "طباعة كلك بولستر",
                "name_en": "Glossy Poster",
                "description_ar": "طباعة كلك بولستر عالية الجودة",
                "icon": "🖼️",
                "display_order": 11
            },
            {
                "name_ar": "البانرات الإعلانية (Roll up)",
                "name_en": "Advertising Banners (Roll up)",
                "description_ar": "طباعة بانرات إعلانية بجميع المقاسات",
                "icon": "📢",
                "display_order": 3
            }
        ]
        
        for service in default_services:
            try:
                existing = conn.execute(text("""
                    SELECT id FROM services WHERE name_ar = :name_ar
                """), {"name_ar": service["name_ar"]}).fetchone()
                
                if not existing:
                    conn.execute(text("""
                        INSERT INTO services 
                        (name_ar, name_en, description_ar, icon, base_price, is_visible, is_active, display_order)
                        VALUES 
                            (:name_ar, :name_en, :description_ar, :icon, :base_price, :is_visible, :is_active, :display_order)
                    """), {
                        "name_ar": service["name_ar"],
                        "name_en": service["name_en"],
                        "description_ar": service["description_ar"],
                        "icon": service["icon"],
                        "base_price": 0.0,
                        "is_visible": True,
                        "is_active": True,
                        "display_order": service["display_order"]
                    })
                    print(f"✅ Created default service: {service['name_ar']}")
                else:
                    print(f"✅ Service already exists: {service['name_ar']}")
            except Exception as service_error:
                print(f"⚠️ Error ensuring service {service['name_ar']}: {str(service_error)[:100]}")
        
        conn.commit()
        print("✅ Default services check completed")
        
    except Exception as e:
        print(f"❌ Error ensuring default services: {str(e)}")
        import traceback
        traceback.print_exc()
        if conn:
            try:
                conn.rollback()
            except:
                pass
    finally:
        if conn:
            try:
                conn.close()
            except:
                pass

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
from routers import auth, services, orders, portfolio, products, admin, studio, service_workflows, pricing, advanced_pricing, hero_slides, analytics

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(services.router, prefix="/api/services", tags=["services"])
app.include_router(orders.router, prefix="/api/orders", tags=["orders"])
app.include_router(portfolio.router, prefix="/api/portfolio", tags=["portfolio"])
app.include_router(products.router, prefix="/api/products", tags=["products"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])
app.include_router(studio.router, prefix="/api/studio", tags=["studio"])
app.include_router(service_workflows.router, prefix="/api/workflows", tags=["workflows"])
app.include_router(pricing.router, prefix="/api", tags=["pricing"])
app.include_router(advanced_pricing.router, prefix="/api", tags=["advanced-pricing"])
app.include_router(hero_slides.router, prefix="/api", tags=["hero-slides"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["analytics"])

# Static files
# إنشاء مجلدات uploads إذا لم تكن موجودة
os.makedirs("uploads", exist_ok=True)
os.makedirs("uploads/hero_slides", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Serve frontend static files (must be after API routes)
static_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static")
if os.path.exists(static_dir):
    # Serve static assets (JS, CSS, images, etc.)
    assets_dir = os.path.join(static_dir, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")
    
    # Serve service worker
    sw_path = os.path.join(static_dir, "sw.js")
    if os.path.exists(sw_path):
        @app.get("/sw.js")
        async def serve_sw():
            return FileResponse(sw_path, media_type="application/javascript")
    
    # Serve logo
    logo_path = os.path.join(static_dir, "logo.jpg")
    if os.path.exists(logo_path):
        @app.get("/logo.jpg")
        async def serve_logo():
            return FileResponse(logo_path, media_type="image/jpeg")
    
    # Serve services image
    services_image_path = os.path.join(static_dir, "khawam_services.png")
    if os.path.exists(services_image_path):
        @app.get("/khawam_services.png")
        async def serve_services_image():
            return FileResponse(services_image_path, media_type="image/png")
    else:
        print(f"⚠️ Warning: khawam_services.png not found at {services_image_path}")
    
    # Serve index.html for all non-API routes (SPA fallback)
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        # Don't serve API routes or uploads
        if full_path.startswith("api/") or full_path.startswith("uploads/"):
            raise HTTPException(status_code=404, detail="Not found")
        
        # Serve index.html for SPA routing
        index_path = os.path.join(static_dir, "index.html")
        if os.path.exists(index_path):
            return FileResponse(index_path)
        raise HTTPException(status_code=404, detail="Frontend not found")
else:
    print("⚠️ Warning: static directory not found, frontend files will not be served")

    @app.get("/")
    async def root():
        # Serve index.html for root path if static directory exists
        index_path = os.path.join(static_dir, "index.html")
        if os.path.exists(index_path):
            return FileResponse(index_path)
        return {"message": "Khawam API", "version": "1.0.1"}

async def _daily_archive_task():
    """مهمة يومية: نقل الطلبات المكتملة إلى الأرشيف"""
    import asyncio
    import httpx
    
    # انتظر قليلاً حتى يكون التطبيق جاهزاً
    await asyncio.sleep(10)
    
    while True:
        try:
            # انتظر حتى منتصف الليل (00:00) ثم نفذ المهمة
            from datetime import datetime, timedelta
            now = datetime.now()
            # حساب الوقت حتى منتصف الليل التالي
            next_midnight = (now + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
            wait_seconds = (next_midnight - now).total_seconds()
            
            print(f"📅 Daily archive task: Will run at midnight (in {wait_seconds/3600:.1f} hours)")
            await asyncio.sleep(wait_seconds)
            
            # تنفيذ المهمة
            print("🔄 Running daily archive task...")
            try:
                # استدعاء endpoint الأرشيف اليومي
                async with httpx.AsyncClient() as client:
                    # استخدام URL داخلي
                    base_url = os.getenv("PUBLIC_BASE_URL", "http://localhost:8000")
                    if not base_url.startswith("http"):
                        base_url = f"http://localhost:8000"
                    
                    response = await client.post(f"{base_url}/api/admin/orders/archive/daily-move")
                    if response.status_code == 200:
                        result = response.json()
                        print(f"✅ Daily archive task completed: {result.get('message', '')}")
                    else:
                        print(f"⚠️ Daily archive task failed: {response.status_code}")
            except Exception as e:
                print(f"⚠️ Error in daily archive task: {e}")
            
        except Exception as e:
            print(f"⚠️ Error in daily archive task loop: {e}")
            # انتظر ساعة قبل إعادة المحاولة
            await asyncio.sleep(3600)


async def _monthly_archive_task():
    """مهمة شهرية: نقل الطلبات الأرشيفية القديمة (أكثر من 30 يوم) إلى الأرشيف الشهري"""
    import asyncio
    import httpx
    
    # انتظر قليلاً حتى يكون التطبيق جاهزاً
    await asyncio.sleep(15)
    
    while True:
        try:
            # تنفيذ المهمة كل يوم (للتحقق من الطلبات القديمة)
            # انتظر حتى الساعة 1:00 صباحاً
            from datetime import datetime, timedelta
            now = datetime.now()
            next_run = (now + timedelta(days=1)).replace(hour=1, minute=0, second=0, microsecond=0)
            wait_seconds = (next_run - now).total_seconds()
            
            print(f"📅 Monthly archive task: Will run at 1:00 AM (in {wait_seconds/3600:.1f} hours)")
            await asyncio.sleep(wait_seconds)
            
            # تنفيذ المهمة
            print("🔄 Running monthly archive task...")
            try:
                # استدعاء endpoint الأرشيف الشهري
                async with httpx.AsyncClient() as client:
                    base_url = os.getenv("PUBLIC_BASE_URL", "http://localhost:8000")
                    if not base_url.startswith("http"):
                        base_url = f"http://localhost:8000"
                    
                    response = await client.post(f"{base_url}/api/admin/orders/archive/monthly-move")
                    if response.status_code == 200:
                        result = response.json()
                        print(f"✅ Monthly archive task completed: {result.get('message', '')}")
                    else:
                        print(f"⚠️ Monthly archive task failed: {response.status_code}")
            except Exception as e:
                print(f"⚠️ Error in monthly archive task: {e}")
            
        except Exception as e:
            print(f"⚠️ Error in monthly archive task loop: {e}")
            # انتظر ساعة قبل إعادة المحاولة
            await asyncio.sleep(3600)


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    import os
    db_status = "connected"
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"error: {str(e)[:50]}"
    
    return {
        "status": "ok", 
        "message": "API is running", 
        "database": db_status,
        "port": os.getenv("PORT", "8000")
    }
