from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy import text
from database import engine
import os

app = FastAPI(
    title="Khawam API",
    description="API for Khawam Printing Services",
    version="1.0.1"
)

@app.on_event("startup")
async def init_pricing_table_on_startup():
    """إنشاء جدول pricing_rules تلقائياً عند بدء التطبيق"""
    try:
        import asyncio
        asyncio.create_task(_init_pricing_table())
    except Exception as e:
        print(f"Warning: Failed to initialize pricing table: {str(e)[:100]}")

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
    from routers import auth, products, services, portfolio, orders, studio, admin, payments, setup, setup_simple, pricing, init_pricing
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
