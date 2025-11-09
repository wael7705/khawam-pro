from fastapi import FastAPI
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
    # Startup
    try:
        import asyncio
        # تشغيل المهام بشكل متوازي
        loop = asyncio.get_event_loop()
        loop.create_task(_init_pricing_table())
        loop.create_task(_setup_lecture_printing_service())
        loop.create_task(_setup_clothing_printing_service())
        loop.create_task(_ensure_default_services())
    except Exception as e:
        print(f"Warning: Failed to initialize: {str(e)[:100]}")
    
    yield
    
    # Shutdown (if needed)
    pass

app = FastAPI(
    title="Khawam API",
    description="API for Khawam Printing Services",
    version="1.0.1",
    lifespan=lifespan
)

async def _init_pricing_table():
    """Create pricing_rules table"""
    import time
    time.sleep(2)  # Wait a bit for database to be ready
    
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
                'base_price': "ALTER TABLE pricing_rules ADD COLUMN base_price DECIMAL(10, 4)",
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
                        print(f"Added column {col_name} to pricing_rules")
                    except Exception as e:
                        print(f"Warning: Failed to add column {col_name}: {e}")
                        conn.rollback()

            print("Table pricing_rules exists and updated")
        else:
            # إنشاء الجدول
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS pricing_rules (
                    id SERIAL PRIMARY KEY,
                    name_ar VARCHAR(200) NOT NULL,
                    name_en VARCHAR(200),
                    description_ar TEXT,
                    description_en TEXT,
                    calculation_type VARCHAR(20) NOT NULL,
                    base_price DECIMAL(10, 4) NOT NULL,
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
            print("Created pricing_rules table successfully")
        
        # إنشاء جداول النظام الهرمي الجديد
        # 1. pricing_categories
        check_categories = conn.execute(text("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'pricing_categories'
            )
        """)).fetchone()
        
        if not (check_categories and check_categories[0]):
            conn.execute(text("""
                CREATE TABLE pricing_categories (
                    id SERIAL PRIMARY KEY,
                    name_ar VARCHAR(200) NOT NULL,
                    name_en VARCHAR(200),
                    description_ar TEXT,
                    description_en TEXT,
                    icon VARCHAR(50),
                    is_active BOOLEAN DEFAULT true,
                    display_order INTEGER DEFAULT 0,
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW()
                )
            """))
            conn.commit()
            print("Created pricing_categories table successfully")
        
        # 2. pricing_configs
        check_configs = conn.execute(text("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'pricing_configs'
            )
        """)).fetchone()
        
        if not (check_configs and check_configs[0]):
            conn.execute(text("""
                CREATE TABLE pricing_configs (
                    id SERIAL PRIMARY KEY,
                    category_id INTEGER NOT NULL REFERENCES pricing_categories(id) ON DELETE CASCADE,
                    paper_size VARCHAR(10) NOT NULL,
                    paper_type VARCHAR(50),
                    print_type VARCHAR(20) NOT NULL,
                    quality_type VARCHAR(20),
                    price_per_page DECIMAL(10, 4) NOT NULL,
                    unit VARCHAR(50) DEFAULT 'صفحة',
                    is_active BOOLEAN DEFAULT true,
                    display_order INTEGER DEFAULT 0,
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW()
                )
            """))
            conn.commit()
            print("Created pricing_configs table successfully")
        
        # 3. service_workflows
        check_workflows = conn.execute(text("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'service_workflows'
            )
        """)).fetchone()
        
        if not (check_workflows and check_workflows[0]):
            conn.execute(text("""
                CREATE TABLE service_workflows (
                    id SERIAL PRIMARY KEY,
                    service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
                    step_number INTEGER NOT NULL,
                    step_name_ar VARCHAR(200) NOT NULL,
                    step_name_en VARCHAR(200),
                    step_description_ar TEXT,
                    step_description_en TEXT,
                    step_type VARCHAR(50) NOT NULL,
                    step_config JSONB,
                    display_order INTEGER DEFAULT 0,
                    is_active BOOLEAN DEFAULT true,
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW()
                )
            """))
            conn.commit()
            print("Created service_workflows table successfully")

    except Exception as e:
        print(f"Warning: Error initializing pricing tables: {str(e)[:200]}")
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
    import time
    import json
    import asyncio
    import json
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
            print(f"✅ خدمة طباعة المحاضرات موجودة بالفعل (ID: {service_id}) - لا حاجة لإعادة إنشائها")
            # لا نقوم بأي شيء - الخدمة موجودة بالفعل
            return
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
                    "hide_dimensions": True  # إخفاء الأبعاد
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
                                    "colors": ["أبيض", "أسود", "رمادي"]
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

async def _ensure_default_services():
    """التأكد من وجود الخدمات الأساسية في قاعدة البيانات"""
    import time
    import asyncio
    await asyncio.sleep(8)  # انتظار حتى تكون قاعدة البيانات جاهزة
    
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
                "name_ar": "طباعة كلك بولستر",
                "name_en": "Sticker Printing",
                "description_ar": "طباعة ملصقات لاصقة بجميع الأشكال والأحجام",
                "icon": "🏷️",
                "display_order": 5
            },
            {
                "name_ar": "طباعة البوسترات",
                "name_en": "Poster Printing",
                "description_ar": "طباعة بوسترات عالية الجودة بجميع المقاسات",
                "icon": "📄",
                "display_order": 6
            },
            {
                "name_ar": "البانرات الإعلانية",
                "name_en": "Advertising Banners",
                "description_ar": "طباعة بانرات إعلانية بجميع المقاسات",
                "icon": "📢",
                "display_order": 7
            }
        ]
        
        created_count = 0
        updated_count = 0
        
        for service in default_services:
            # التحقق من وجود الخدمة
            existing = conn.execute(text("""
                SELECT id, is_visible, is_active FROM services 
                WHERE name_ar = :name_ar
            """), {"name_ar": service["name_ar"]}).fetchone()
            
            if existing:
                # تحديث الخدمة الموجودة
                if not existing[1] or not existing[2]:  # is_visible or is_active is False
                    conn.execute(text("""
                        UPDATE services
                        SET is_visible = true, is_active = true, 
                            display_order = :display_order,
                            icon = :icon,
                            description_ar = :description_ar
                        WHERE id = :id
                    """), {
                        "id": existing[0],
                        "display_order": service["display_order"],
                        "icon": service["icon"],
                        "description_ar": service["description_ar"]
                    })
                    updated_count += 1
                    print(f"  ✅ Updated service: {service['name_ar']}")
            else:
                # إنشاء خدمة جديدة
                conn.execute(text("""
                    INSERT INTO services 
                    (name_ar, name_en, description_ar, icon, base_price, is_visible, is_active, display_order)
                    VALUES 
                    (:name_ar, :name_en, :description_ar, :icon, 0, true, true, :display_order)
                """), {
                    "name_ar": service["name_ar"],
                    "name_en": service["name_en"],
                    "description_ar": service["description_ar"],
                    "icon": service["icon"],
                    "display_order": service["display_order"]
                })
                created_count += 1
                print(f"  ✅ Created service: {service['name_ar']}")
        
        conn.commit()
        print(f"✅ Ensured default services: {created_count} created, {updated_count} updated")
        
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

# CORS - Allow all origins for Railway deployment
allowed_origins = [
    "http://localhost:5173",
    os.getenv("FRONTEND_URL", ""),
    "*"  # Allow all in production
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import routers - استيراد آمن مع معالجة الأخطاء
try:
    from routers import auth, products, services, portfolio, orders, studio, admin, payments, setup, setup_simple, pricing, init_pricing, file_analysis, notifications
    app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
    app.include_router(products.router, prefix="/api/products", tags=["Products"])
    app.include_router(services.router, prefix="/api/services", tags=["Services"])
    app.include_router(portfolio.router, prefix="/api/portfolio", tags=["Portfolio"])
    app.include_router(orders.router, prefix="/api/orders", tags=["Orders"])
    app.include_router(studio.router, prefix="/api/studio", tags=["Studio"])
    app.include_router(admin.router, prefix="/api/admin", tags=["Admin"])
    app.include_router(payments.router, prefix="/api/payments", tags=["Payments"])
    app.include_router(setup.router, prefix="/api/setup", tags=["Setup"])
    app.include_router(setup_simple.router, prefix="/api/setup", tags=["Setup"])
    app.include_router(pricing.router, prefix="/api/pricing", tags=["Pricing"])
    app.include_router(init_pricing.router, prefix="/api/pricing", tags=["Pricing"])
    app.include_router(file_analysis.router, prefix="/api/files", tags=["File Analysis"])
    app.include_router(notifications.router, tags=["Notifications"])
except ImportError as e:
    print(f"Warning: Error importing main routers: {e}")

# إضافة router النظام الهرمي
try:
    from routers import pricing_hierarchical
    app.include_router(pricing_hierarchical.router, prefix="/api/pricing-hierarchical", tags=["Pricing Hierarchical"])
except ImportError as e:
    print(f"Warning: Error importing pricing_hierarchical router: {e}")

# إضافة router اختبار قاعدة البيانات
try:
    from routers import test_db
    app.include_router(test_db.router, prefix="/api", tags=["Test"])
except ImportError as e:
    print(f"Warning: Error importing test_db router: {e}")

# إضافة router إصلاح قاعدة البيانات (حل بديل بسيط)
try:
    from routers import db_fix, db_check, db_rebuild, test_password, fix_login, fix_user_types, fix_user_types_data, update_user_types_final
    app.include_router(db_fix.router, prefix="/api/fix", tags=["Fix"])
    app.include_router(db_check.router, prefix="/api/fix", tags=["Fix"])
    app.include_router(db_rebuild.router, prefix="/api/fix", tags=["Fix"])
    app.include_router(test_password.router, prefix="/api/fix", tags=["Fix"])
    app.include_router(fix_login.router, prefix="/api/fix", tags=["Fix"])
    app.include_router(fix_user_types.router, prefix="/api/fix", tags=["Fix"])
    app.include_router(fix_user_types_data.router, prefix="/api/fix", tags=["Fix"])
    app.include_router(update_user_types_final.router, prefix="/api/fix", tags=["Fix"])
except ImportError as e:
    print(f"Warning: Error importing db_fix router: {e}")

# إضافة router مراحل الخدمات
try:
    from routers import service_workflows
    app.include_router(service_workflows.router, prefix="/api/workflows", tags=["Service Workflows"])
except ImportError as e:
    print(f"Warning: Error importing service_workflows router: {e}")

# Mount static files
if not os.path.exists("uploads"):
    os.makedirs("uploads")
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Serve Frontend static files
static_dir = "static"
if os.path.exists(static_dir):
    app.mount("/assets", StaticFiles(directory=os.path.join(static_dir, "assets")), name="assets")
    
    # Serve index.html for all non-API routes
    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        # Don't serve frontend for API routes
        if full_path.startswith("api/") or full_path.startswith("uploads/"):
            return {"message": "Not found"}
        
        # Try to serve the file from static directory
        file_path = os.path.join(static_dir, full_path)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
        
        # For any route, serve index.html (for React Router)
        index_path = os.path.join(static_dir, "index.html")
        if os.path.exists(index_path):
            return FileResponse(index_path)
        
        return {"message": "Frontend files not found"}

@app.get("/")
async def root():
    # Try to serve index.html, otherwise show API message
    index_path = os.path.join("static", "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"message": "Khawam API is running"}

@app.post("/api/setup-lecture-printing-now")
async def setup_lecture_printing_now():
    """إعداد خدمة طباعة المحاضرات مباشرة - يمكن استدعاؤها يدوياً"""
    try:
        await _setup_lecture_printing_service()
        return {"success": True, "message": "تم إعداد خدمة طباعة المحاضرات بنجاح"}
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"success": False, "error": str(e)}

@app.post("/api/setup-clothing-printing-now")
async def setup_clothing_printing_now():
    """إعداد خدمة الطباعة على الملابس مباشرة - يمكن استدعاؤها يدوياً"""
    try:
        await _setup_clothing_printing_service()
        return {"success": True, "message": "تم إعداد خدمة الطباعة على الملابس بنجاح"}
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"success": False, "error": str(e)}

@app.get("/api/health")
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "ok", "message": "API is running", "database": "connected"}

if __name__ == "__main__":
    import uvicorn
    import os
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run(app, host="0.0.0.0", port=port)
