from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

app = FastAPI(
    title="Khawam API",
    description="API for Khawam Printing Services",
    version="1.0.0"
)

# CORS - Allow all origins for Railway deployment
import os
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

# Import routers
from routers import auth, products, services, portfolio, orders, studio, admin

app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(products.router, prefix="/api/products", tags=["Products"])
app.include_router(services.router, prefix="/api/services", tags=["Services"])
app.include_router(portfolio.router, prefix="/api/portfolio", tags=["Portfolio"])
app.include_router(orders.router, prefix="/api/orders", tags=["Orders"])
app.include_router(studio.router, prefix="/api/studio", tags=["Studio"])
app.include_router(admin.router, prefix="/api/admin", tags=["Admin"])

# Mount static files
if not os.path.exists("uploads"):
    os.makedirs("uploads")
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

@app.get("/")
async def root():
    return {"message": "Khawam API is running"}

if __name__ == "__main__":
    import uvicorn
    import os
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run(app, host="0.0.0.0", port=port)