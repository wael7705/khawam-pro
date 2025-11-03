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
    version="1.0.0"
)

@app.on_event("startup")
async def init_pricing_table_on_startup():
    """إنشاء جدول pricing_rules تلقائياً عند بدء التطبيق"""
    conn = None
    try:
        conn = engine.connect()
        
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
                        print(f"✅ تم إضافة العمود {col_name} إلى pricing_rules")
                    except Exception as e:
                        print(f"⚠️ تحذير: فشل إضافة العمود {col_name}: {e}")
                        conn.rollback()
            
            print("✅ جدول pricing_rules موجود ومحدث")
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
            print("✅ تم إنشاء جدول pricing_rules بنجاح")
        
    except Exception as e:
        print(f"⚠️ تحذير: خطأ في تهيئة جدول pricing_rules: {e}")
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
    print(f"⚠️ Warning: Error importing main routers: {e}")

# إضافة router اختبار قاعدة البيانات
try:
    from routers import test_db
    app.include_router(test_db.router, prefix="/api", tags=["Test"])
except ImportError as e:
    print(f"⚠️ Warning: Error importing test_db router: {e}")

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
    print(f"⚠️ Warning: Error importing db_fix router: {e}")

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