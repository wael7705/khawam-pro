from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os

app = FastAPI(
    title="Khawam API",
    description="API for Khawam Printing Services",
    version="1.0.0"
)

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
    from routers import auth, products, services, portfolio, orders, studio, admin, payments, setup, setup_simple
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
    from routers import db_fix, db_check, db_rebuild, test_password
    app.include_router(db_fix.router, prefix="/api/fix", tags=["Fix"])
    app.include_router(db_check.router, prefix="/api/fix", tags=["Fix"])
    app.include_router(db_rebuild.router, prefix="/api/fix", tags=["Fix"])
    app.include_router(test_password.router, prefix="/api/fix", tags=["Fix"])
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