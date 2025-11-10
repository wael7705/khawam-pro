from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Response
from sqlalchemy.orm import Session
from database import get_db
from models import Product, Service, PortfolioWork, Order, OrderItem, ProductCategory
from typing import Optional
from pydantic import BaseModel, Field, validator
from utils import handle_error, success_response, validate_price, validate_string
import os
import uuid
import requests
import urllib.parse

router = APIRouter()

# Pydantic models
class StaffNotesUpdate(BaseModel):
    notes: str

class OrderStatusUpdate(BaseModel):
    status: str
    cancellation_reason: Optional[str] = None
    rejection_reason: Optional[str] = None

class OrderRatingUpdate(BaseModel):
    rating: int  # 1-5
    rating_comment: Optional[str] = None

class CustomerNotesUpdate(BaseModel):
    notes: str

# --------------------------------------------
# Helpers for public image URLs
# --------------------------------------------
def _get_public_base_url() -> str:
    """Return absolute public base URL for this backend (used to build image URLs)."""
    # Prefer explicit config
    explicit = os.getenv("PUBLIC_BASE_URL", "").strip().rstrip("/")
    if explicit:
        return explicit
    # Railway provides RAILWAY_PUBLIC_DOMAIN (domain only)
    domain = os.getenv("RAILWAY_PUBLIC_DOMAIN", "").strip()
    if domain:
        if domain.startswith("http"):
            return domain.rstrip("/")
        return f"https://{domain}"
    # Fallback to production host if set elsewhere (not ideal but safe)
    frontend = os.getenv("FRONTEND_URL", "").strip().rstrip("/")
    if frontend and frontend.startswith("http"):
        # If frontend deployed on same domain pathless, reuse its origin
        from urllib.parse import urlparse
        p = urlparse(frontend)
        return f"{p.scheme}://{p.netloc}"
    # Last resort: known production URL
    return "https://khawam-pro-production.up.railway.app"

def _normalize_to_absolute(url_or_path: str) -> str:
    """Normalize any provided value to an absolute URL.
    - http/https → returned as-is
    - starts with /uploads/ → prepend base URL
    - bare filename → make it /uploads/<filename> then prepend base URL
    - any other relative path → ensure starts with / then prepend base URL
    """
    if not url_or_path:
        return url_or_path
    value = url_or_path.replace("\\", "/").strip()
    if value.startswith("http://") or value.startswith("https://"):
        return value
    base = _get_public_base_url()
    if value.startswith("/uploads/"):
        return f"{base}{value}"
    if "/" not in value:
        return f"{base}/uploads/{value}"
    if not value.startswith("/"):
        value = f"/{value}"
    return f"{base}{value}"

# Pydantic models for request/response
class ProductCreate(BaseModel):
    name_ar: str = Field(..., min_length=1, max_length=200)
    name: Optional[str] = Field(None, max_length=200)
    price: float = Field(..., gt=0)
    image_url: Optional[str] = None
    category_id: Optional[int] = None
    is_visible: bool = True
    is_featured: bool = False
    display_order: int = 0
    
    @validator('price')
    def validate_price(cls, v):
        return validate_price(v)
    
    @validator('name_ar')
    def validate_name_ar(cls, v):
        return validate_string(v, "الاسم العربي", 1, 200)
    
    @validator('name')
    def set_name_default(cls, v):
        return v if v else ''

class ProductUpdate(BaseModel):
    name_ar: Optional[str] = None
    name: Optional[str] = None
    price: Optional[float] = None
    image_url: Optional[str] = None
    category_id: Optional[int] = None
    is_visible: Optional[bool] = None
    is_featured: Optional[bool] = None
    display_order: Optional[int] = None

class ServiceCreate(BaseModel):
    name_ar: str
    name_en: str
    description_ar: Optional[str] = None
    icon: Optional[str] = "📄"
    base_price: float = 0.0
    is_visible: bool = True
    display_order: int = 0

class ServiceUpdate(BaseModel):
    name_ar: Optional[str] = None
    name_en: Optional[str] = None
    description_ar: Optional[str] = None
    icon: Optional[str] = None
    base_price: Optional[float] = None
    is_visible: Optional[bool] = None
    display_order: Optional[int] = None

class WorkCreate(BaseModel):
    title_ar: str
    title: str
    description_ar: Optional[str] = None
    image_url: Optional[str] = None
    images: Optional[list[str]] = None  # الصور الثانوية
    category_ar: Optional[str] = None
    is_visible: bool = True
    is_featured: bool = False
    display_order: int = 0

class WorkUpdate(BaseModel):
    title_ar: Optional[str] = None
    title: Optional[str] = None
    description_ar: Optional[str] = None
    image_url: Optional[str] = None
    images: Optional[list[str]] = None  # الصور الثانوية
    category_ar: Optional[str] = None
    is_visible: Optional[bool] = None
    is_featured: Optional[bool] = None
    display_order: Optional[int] = None

class WorkImagesUpdate(BaseModel):
    images: list[str] = []
    append: bool = True

# ============================================
# Products Management Endpoints
# ============================================

@router.get("/products/all")
async def get_all_products(db: Session = Depends(get_db)):
    """Get all products (admin view)"""
    try:
        products = db.query(Product).order_by(Product.display_order).all()
        products_list = []
        for p in products:
            products_list.append({
                "id": p.id,
                "name_ar": p.name_ar,
                "name": p.name,
                "price": float(p.price) if p.price else 0,
                "image_url": p.image_url or "",
                "category_id": p.category_id,
                "is_visible": p.is_visible,
                "is_featured": p.is_featured,
                "display_order": p.display_order
            })
        return products_list
    except Exception as e:
        print(f"Error: {e}")
        return []

@router.post("/products")
async def create_product(product: ProductCreate, db: Session = Depends(get_db)):
    """Create a new product"""
    try:
        # إذا كان name فارغاً، استخدم name_ar
        final_name = product.name or product.name_ar
        
        new_product = Product(
            name_ar=product.name_ar,
            name=final_name,
            price=product.price,
            image_url=product.image_url if product.image_url else None,  # حفظ كما هو (base64 أو رابط)
            category_id=product.category_id or 1,
            is_visible=product.is_visible,
            is_featured=product.is_featured,
            display_order=product.display_order
        )
        db.add(new_product)
        db.commit()
        db.refresh(new_product)
        
        # إبطال cache المنتجات
        from cache import invalidate_cache
        invalidate_cache('products')
        invalidate_cache('dashboard_stats')
        
        return {
            "success": True,
            "product": {
                "id": new_product.id,
                "name_ar": new_product.name_ar,
                "name": new_product.name,
                "price": float(new_product.price) if new_product.price else 0,
                "is_visible": new_product.is_visible,
                "is_featured": new_product.is_featured
            }
        }
    except Exception as e:
        db.rollback()
        print(f"Error creating product: {str(e)}")
        raise HTTPException(status_code=500, detail=f"خطأ في إنشاء المنتج: {str(e)}")

@router.put("/products/{product_id}")
async def update_product(product_id: int, product: ProductUpdate, db: Session = Depends(get_db)):
    """Update a product"""
    try:
        existing_product = db.query(Product).filter(Product.id == product_id).first()
        if not existing_product:
            raise HTTPException(status_code=404, detail="Product not found")
        
        update_data = product.dict(exclude_unset=True)
        # image_url تُحفظ كما هي (base64 أو رابط مطلق) بدون تطبيع 
        for key, value in update_data.items():
            setattr(existing_product, key, value)
        
        db.commit()
        db.refresh(existing_product)
        
        # إبطال cache المنتجات
        from cache import invalidate_cache
        invalidate_cache('products')
        invalidate_cache('dashboard_stats')
        
        return {"success": True, "product": existing_product}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/products/{product_id}")
async def delete_product(product_id: int, db: Session = Depends(get_db)):
    """Delete a product"""
    try:
        product = db.query(Product).filter(Product.id == product_id).first()
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        
        db.delete(product)
        db.commit()
        
        # إبطال cache المنتجات
        from cache import invalidate_cache
        invalidate_cache('products')
        invalidate_cache('dashboard_stats')
        
        return {"success": True, "message": "Product deleted"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

# ============================================
# Services Management Endpoints
# ============================================

@router.get("/services/all")
async def get_all_services(db: Session = Depends(get_db)):
    """Get all services (admin view)"""
    try:
        services = db.query(Service).order_by(Service.display_order).all()
        services_list = []
        for s in services:
            services_list.append({
                "id": s.id,
                "name_ar": s.name_ar,
                "name_en": s.name_en,
                "description_ar": s.description_ar or "",
                "icon": s.icon or "📄",
                "base_price": float(s.base_price) if s.base_price else 0,
                "is_visible": s.is_visible,
                "display_order": s.display_order
            })
        return services_list
    except Exception as e:
        print(f"Error: {e}")
        return []

@router.post("/services")
async def create_service(service: ServiceCreate, db: Session = Depends(get_db)):
    """Create a new service"""
    try:
        new_service = Service(
            name_ar=service.name_ar,
            name_en=service.name_en,
            description_ar=service.description_ar,
            icon=service.icon,
            base_price=service.base_price,
            is_visible=service.is_visible,
            display_order=service.display_order
        )
        # services may also have image_url in model, set if provided
        if hasattr(new_service, "image_url") and service and getattr(service, "image_url", None):
            new_service.image_url = getattr(service, "image_url")  # حفظ كما هو
        db.add(new_service)
        db.commit()
        db.refresh(new_service)
        
        # إبطال cache الخدمات
        from cache import invalidate_cache
        invalidate_cache('services')
        
        return {"success": True, "service": new_service}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/services/{service_id}")
async def update_service(service_id: int, service: ServiceUpdate, db: Session = Depends(get_db)):
    """Update a service"""
    try:
        existing_service = db.query(Service).filter(Service.id == service_id).first()
        if not existing_service:
            raise HTTPException(status_code=404, detail="Service not found")
        
        update_data = service.dict(exclude_unset=True)
        # image_url تُحفظ كما هي (base64 أو رابط مطلق) بدون تطبيع 
        for key, value in update_data.items():
            setattr(existing_service, key, value)
        
        db.commit()
        db.refresh(existing_service)
        
        # إبطال cache الخدمات
        from cache import invalidate_cache
        invalidate_cache('services')
        
        return {"success": True, "service": existing_service}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/services/{service_id}")
async def delete_service(service_id: int, db: Session = Depends(get_db)):
    """Delete a service and its workflows"""
    try:
        from sqlalchemy import text
        
        service = db.query(Service).filter(Service.id == service_id).first()
        if not service:
            raise HTTPException(status_code=404, detail="Service not found")
        
        # حذف المراحل المرتبطة بالخدمة أولاً
        db.execute(text("DELETE FROM service_workflows WHERE service_id = :service_id"), 
                  {"service_id": service_id})
        
        # حذف الخدمة
        db.delete(service)
        db.commit()
        
        # إبطال cache الخدمات
        from cache import invalidate_cache
        invalidate_cache('services')
        
        return {"success": True, "message": "Service deleted"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/services/cleanup-duplicates")
async def cleanup_duplicate_services(db: Session = Depends(get_db)):
    """حذف الخدمات المكررة - يبقي الأصلية أو التي لديها مراحل صحيحة"""
    try:
        from sqlalchemy import text
        
        # البحث عن الخدمات المكررة (نفس الاسم)
        duplicates = db.execute(text("""
            SELECT name_ar, COUNT(*) as count, array_agg(id ORDER BY id) as ids
            FROM services
            GROUP BY name_ar
            HAVING COUNT(*) > 1
        """)).fetchall()
        
        deleted_count = 0
        kept_services = []
        
        for dup in duplicates:
            name_ar = dup[0]
            service_ids = dup[2]  # array of IDs
            
            if len(service_ids) > 1:
                # التحقق من المراحل لكل خدمة
                services_with_workflows = []
                for service_id in service_ids:
                    workflow_count = db.execute(text("""
                        SELECT COUNT(*) FROM service_workflows 
                        WHERE service_id = :service_id AND is_active = true
                    """), {"service_id": service_id}).scalar()
                    
                    services_with_workflows.append({
                        "id": service_id,
                        "workflow_count": workflow_count
                    })
                
                # ترتيب حسب عدد المراحل (الأكثر أولاً)، ثم حسب ID (الأقدم أولاً)
                services_with_workflows.sort(key=lambda x: (-x["workflow_count"], x["id"]))
                
                # الاحتفاظ بالخدمة الأولى (الأفضل)
                keep_id = services_with_workflows[0]["id"]
                kept_services.append(keep_id)
                
                # حذف الباقي
                for service_info in services_with_workflows[1:]:
                    delete_id = service_info["id"]
                    
                    # حذف المراحل أولاً
                    db.execute(text("DELETE FROM service_workflows WHERE service_id = :service_id"), 
                             {"service_id": delete_id})
                    
                    # حذف الخدمة
                    service_to_delete = db.query(Service).filter(Service.id == delete_id).first()
                    if service_to_delete:
                        db.delete(service_to_delete)
                        deleted_count += 1
                        print(f"🗑️ Deleted duplicate service: ID={delete_id}, Name={name_ar}")
        
        db.commit()
        
        # إبطال cache الخدمات
        from cache import invalidate_cache
        invalidate_cache('services')
        
        return {
            "success": True,
            "message": f"تم حذف {deleted_count} خدمة مكررة",
            "deleted_count": deleted_count,
            "kept_services": kept_services
        }
    except Exception as e:
        db.rollback()
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"خطأ في حذف الخدمات المكررة: {str(e)}")

# ============================================
# Portfolio Works Management Endpoints
# ============================================

@router.get("/works/all")
async def get_all_works(
    db: Session = Depends(get_db),
    limit: int = 200,  # Limit to 200 for better performance
    skip_images: bool = False  # Skip large base64 images for faster loading
):
    """Get all portfolio works (admin view) - optimized for performance"""
    try:
        # استخدام raw SQL مع LIMIT لتحسين الأداء
        from sqlalchemy import text
        query = text("""
            SELECT 
                id, title, title_ar, 
                CASE 
                    WHEN description_ar IS NULL THEN ''
                    WHEN LENGTH(description_ar) > 100 THEN SUBSTRING(description_ar, 1, 100) || '...' 
                    ELSE description_ar 
                END as description_ar,
                image_url, category, category_ar, is_featured, is_visible, display_order
            FROM portfolio_works 
            ORDER BY display_order, id DESC
            LIMIT :limit
        """)
        result = db.execute(query, {"limit": limit})
        rows = result.fetchall()
        
        works_list = []
        for row in rows:
            # إرجاع image_url من قاعدة البيانات كما هو (base64 أو رابط مطلق)
            # إذا كانت مسار نسبي (مثل /images/... أو /uploads/... بدون http)، نُرجع "" لتجنب 404
            image_url = row.image_url or ""
            if image_url and not image_url.startswith('data:') and not image_url.startswith('http'):
                # مسار نسبي غير موجود على الخادم - تجاهله
                image_url = ""
            
            # Skip large base64 images if requested for faster initial load
            if skip_images and image_url and image_url.startswith('data:'):
                if len(image_url) > 100000:  # Skip if larger than 100KB
                    image_url = ""  # Will load lazily later
            
            works_list.append({
                "id": row.id,
                "title_ar": row.title_ar or "",
                "title": row.title or row.title_ar or "",
                "description_ar": row.description_ar or "",
                "image_url": image_url,  # كما هو من قاعدة البيانات
                "category_ar": row.category_ar or "",
                "is_visible": row.is_visible if hasattr(row, 'is_visible') else True,
                "is_featured": row.is_featured if hasattr(row, 'is_featured') else False,
                "display_order": row.display_order if hasattr(row, 'display_order') else 0
            })
        return works_list
    except Exception as e:
        print(f"Error fetching all works: {e}")
        import traceback
        traceback.print_exc()
        return []

@router.post("/works")
async def create_work(work: WorkCreate, db: Session = Depends(get_db)):
    """Create a new portfolio work"""
    try:
        # استخدام title كـ title_en
        title_en = work.title or work.title_ar
        
        new_work = PortfolioWork(
            title=title_en,  # title - العمود الفعلي في قاعدة البيانات
            title_ar=work.title_ar,
            description=work.description_ar or "",  # description - العمود الفعلي
            description_ar=work.description_ar or "",
            image_url=work.image_url if work.image_url else "",  # حفظ كما هو (base64 أو رابط مطلق)
            images=[],  # إزالة الصور الثانوية
            category=work.category_ar or "",  # category - العمود الفعلي
            category_ar=work.category_ar or "",
            is_visible=work.is_visible,
            is_featured=work.is_featured,
            display_order=work.display_order
        )
        db.add(new_work)
        db.commit()
        db.refresh(new_work)
        return {
            "success": True,
            "work": {
                "id": new_work.id,
                "title_ar": new_work.title_ar,
                "title": new_work.title,
                "image_url": new_work.image_url,
                "is_featured": new_work.is_featured
            }
        }
    except Exception as e:
        db.rollback()
        print(f"Error creating work: {str(e)}")
        raise HTTPException(status_code=500, detail=f"خطأ في إنشاء العمل: {str(e)}")

@router.put("/works/{work_id}")
async def update_work(work_id: int, work: WorkUpdate, db: Session = Depends(get_db)):
    """Update a portfolio work"""
    try:
        from sqlalchemy import text
        
        # التحقق من وجود العمل أولاً باستخدام raw SQL
        check_work = text("SELECT id FROM portfolio_works WHERE id = :id")
        work_exists = db.execute(check_work, {"id": work_id}).fetchone()
        if not work_exists:
            raise HTTPException(status_code=404, detail="Work not found")
        
        # التحقق من وجود عمود images
        check_col = text("""
            SELECT 1 FROM information_schema.columns
            WHERE table_name='portfolio_works' AND column_name='images'
        """)
        has_images_col = db.execute(check_col).fetchone()
        
        # بناء استعلام UPDATE ديناميكي
        updates = []
        params = {"id": work_id}
        
        if work.title_ar is not None:
            updates.append("title_ar = :title_ar")
            params["title_ar"] = work.title_ar
        if work.title is not None:
            updates.append("title = :title")
            params["title"] = work.title
        elif work.title_ar is not None:
            updates.append("title = :title")
            params["title"] = work.title_ar
        
        if work.description_ar is not None:
            updates.append("description = :desc, description_ar = :desc_ar")
            params["desc"] = work.description_ar
            params["desc_ar"] = work.description_ar
        
        if work.image_url is not None:
            updates.append("image_url = :img_url")
            # image_url تُخزن في قاعدة البيانات مباشرة (base64 data URL أو رابط http)
            # نُحفظ القيمة كما هي بدون تطبيع أو تحويل
            params["img_url"] = work.image_url if work.image_url else ""
        
        if work.images is not None and has_images_col:
            # images تُخزن في قاعدة البيانات مباشرة (base64 data URLs أو روابط)
            # نُحفظ القيم كما هي بدون تطبيع
            updates.append("images = :imgs")
            params["imgs"] = work.images or []
        
        if work.category_ar is not None:
            updates.append("category = :cat, category_ar = :cat_ar")
            params["cat"] = work.category_ar
            params["cat_ar"] = work.category_ar
        
        if hasattr(work, 'is_visible') and work.is_visible is not None:
            updates.append("is_visible = :visible")
            params["visible"] = work.is_visible
        
        if hasattr(work, 'is_featured') and work.is_featured is not None:
            updates.append("is_featured = :featured")
            params["featured"] = work.is_featured
        
        if hasattr(work, 'display_order') and work.display_order is not None:
            updates.append("display_order = :order")
            params["order"] = work.display_order
        
        if updates:
            update_query = text(f"UPDATE portfolio_works SET {', '.join(updates)} WHERE id = :id")
            db.execute(update_query, params)
        db.commit()
        
        # استرجاع العمل المحدث
        result = db.execute(text("""
            SELECT id, title_ar, title, image_url, is_featured
            FROM portfolio_works WHERE id = :id
        """), {"id": work_id}).fetchone()
        
        return {
            "success": True,
            "work": {
                "id": result[0],
                "title_ar": result[1] or "",
                "title": result[2] or "",
                "image_url": result[3] or "",
                "is_featured": result[4] if len(result) > 4 else False
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Error updating work: {str(e)}")
        raise HTTPException(status_code=500, detail=f"خطأ في تحديث العمل: {str(e)}")

@router.delete("/works/{work_id}")
async def delete_work(work_id: int, db: Session = Depends(get_db)):
    """Delete a portfolio work"""
    try:
        work = db.query(PortfolioWork).filter(PortfolioWork.id == work_id).first()
        if not work:
            raise HTTPException(status_code=404, detail="Work not found")
        
        db.delete(work)
        db.commit()
        return {"success": True, "message": "Work deleted"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/works/{work_id}/images")
async def update_work_images(work_id: int, payload: WorkImagesUpdate, db: Session = Depends(get_db)):
    """Replace or append secondary images for a work."""
    try:
        from sqlalchemy import text
        # التحقق من وجود العمود أولاً
        check_col = text("""
            SELECT 1 FROM information_schema.columns
            WHERE table_name='portfolio_works' AND column_name='images'
        """)
        has_images_col = db.execute(check_col).fetchone()
        
        if not has_images_col:
            # إنشاء العمود إذا لم يكن موجوداً
            db.execute(text("""
                ALTER TABLE portfolio_works ADD COLUMN images TEXT[] DEFAULT ARRAY[]::TEXT[]
            """))
            db.commit()
        
        work = db.query(PortfolioWork).filter(PortfolioWork.id == work_id).first()
        if not work:
            raise HTTPException(status_code=404, detail="Work not found")

        # استرجاع الصور الحالية بطريقة آمنة
        current_images = []
        if hasattr(work, 'images') and work.images is not None:
            current_images = work.images if isinstance(work.images, list) else []
        # Normalize slashes and ensure leading slash for local uploads
        normalized = []
        for u in payload.images or []:
            if not u:
                continue
            normalized.append(_normalize_to_absolute(u))

        if payload.append:
            work.images = list(dict.fromkeys(current_images + normalized))
        else:
            work.images = normalized

        db.commit()
        db.refresh(work)
        return {"success": True, "images": work.images or []}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

# ============================================
# Orders Management Endpoints
# ============================================

@router.get("/orders/all")
async def get_all_orders(db: Session = Depends(get_db)):
    """Get all orders - optimized for performance"""
    import time
    start_time = time.time()
    
    try:
        # First try using raw SQL to avoid issues with missing columns
        from sqlalchemy import text
        try:
            print(f"⏱️ Admin Orders API - Starting...")
            # Check which columns exist in the database
            check_cols = db.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'orders'
            """))
            available_cols = [row[0] for row in check_cols.fetchall()]
            print(f"Available columns in orders table: {available_cols}")
            
            # Build query dynamically based on available columns
            select_parts = ["id", "order_number", "status", "total_amount", "final_amount", 
                           "payment_status", "delivery_address", "notes", "created_at"]
            
            # Add installment payment fields if they exist
            if "paid_amount" in available_cols:
                select_parts.append("COALESCE(paid_amount, 0) as paid_amount")
            else:
                select_parts.append("0 as paid_amount")
            
            if "remaining_amount" in available_cols:
                select_parts.append("COALESCE(remaining_amount, final_amount) as remaining_amount")
            else:
                select_parts.append("final_amount as remaining_amount")
            
            if "payment_method" in available_cols:
                select_parts.append("COALESCE(payment_method, 'sham_cash') as payment_method")
            else:
                select_parts.append("'sham_cash' as payment_method")
            
            if "customer_name" in available_cols:
                select_parts.append("COALESCE(customer_name, '') as customer_name")
            else:
                select_parts.append("'' as customer_name")
                
            if "customer_phone" in available_cols:
                select_parts.append("COALESCE(customer_phone, '') as customer_phone")
            else:
                select_parts.append("'' as customer_phone")
                
            if "customer_whatsapp" in available_cols:
                if "customer_phone" in available_cols:
                    select_parts.append("COALESCE(customer_whatsapp, customer_phone, '') as customer_whatsapp")
                else:
                    select_parts.append("COALESCE(customer_whatsapp, '') as customer_whatsapp")
            elif "customer_phone" in available_cols:
                select_parts.append("COALESCE(customer_phone, '') as customer_whatsapp")
            else:
                select_parts.append("'' as customer_whatsapp")
                
            if "shop_name" in available_cols:
                select_parts.append("COALESCE(shop_name, '') as shop_name")
            else:
                select_parts.append("'' as shop_name")
                
            if "delivery_type" in available_cols:
                select_parts.append("COALESCE(delivery_type, 'self') as delivery_type")
            else:
                select_parts.append("'self' as delivery_type")
                
            if "staff_notes" in available_cols:
                select_parts.append("staff_notes")
            else:
                select_parts.append("NULL as staff_notes")
            
            if "cancellation_reason" in available_cols:
                select_parts.append("cancellation_reason")
            else:
                select_parts.append("NULL as cancellation_reason")
            
            if "rejection_reason" in available_cols:
                select_parts.append("rejection_reason")
            else:
                select_parts.append("NULL as rejection_reason")
            
            if "delivery_latitude" in available_cols:
                select_parts.append("delivery_latitude")
            else:
                select_parts.append("NULL as delivery_latitude")
                
            if "delivery_longitude" in available_cols:
                select_parts.append("delivery_longitude")
            else:
                select_parts.append("NULL as delivery_longitude")
            
            query = f"""
                SELECT {', '.join(select_parts)}
                FROM orders 
                ORDER BY created_at DESC
            """
            
            print(f"Executing query with {len(select_parts)} columns")
            result = db.execute(text(query))
            rows = result.fetchall()
            
            # تحسين الأداء: جلب جميع items دفعة واحدة بدلاً من loop
            order_ids = [row[0] for row in rows]
            items_query_start = time.time()
            
            # جلب جميع items دفعة واحدة
            all_items = {}
            if order_ids:
                items_query = db.execute(text("""
                    SELECT order_id, product_id, quantity, specifications
                    FROM order_items
                    WHERE order_id = ANY(:order_ids)
                    ORDER BY order_id, id ASC
                """), {"order_ids": order_ids}).fetchall()
                
                for item_row in items_query:
                    order_id = item_row[0]
                    if order_id not in all_items:
                        all_items[order_id] = []
                    all_items[order_id].append(item_row[1:])  # product_id, quantity, specifications
            
            print(f"⏱️ Admin Orders API - Items query: {time.time() - items_query_start:.2f}s (found items for {len(all_items)} orders)")
            
            # جلب design_files لجميع items دفعة واحدة
            design_files_start = time.time()
            design_files_map = {}
            if order_ids:
                design_files_query = db.execute(text("""
                    SELECT order_id, design_files
                    FROM order_items
                    WHERE order_id = ANY(:order_ids)
                    ORDER BY order_id, id ASC
                """), {"order_ids": order_ids}).fetchall()
                
                for item_row in design_files_query:
                    order_id = item_row[0]
                    design_files = item_row[1]
                    if order_id not in design_files_map and design_files:
                        # محاولة استخراج أول design_file
                        try:
                            import json
                            if isinstance(design_files, str):
                                design_files_parsed = json.loads(design_files)
                            elif isinstance(design_files, list):
                                design_files_parsed = design_files
                            elif isinstance(design_files, dict):
                                design_files_parsed = list(design_files.values()) if design_files else []
                            else:
                                design_files_parsed = []
                            
                            if design_files_parsed:
                                for u in design_files_parsed:
                                    if u and str(u).strip():
                                        design_files_map[order_id] = str(u).strip()
                                        break
                        except:
                            pass
            print(f"⏱️ Admin Orders API - Design files query: {time.time() - design_files_start:.2f}s")
            
            # Get order items for each order to determine order type and quantity
            orders_with_items = []
            for row in rows:
                order_id = row[0]
                # Get items for this order from pre-fetched data
                items_for_order = all_items.get(order_id, [])
                items_query = items_for_order[0] if items_for_order else None
                
                order_type = "product"
                total_quantity = 0
                service_name = None
                
                if items_query:
                    product_id, quantity, specs_raw = items_query
                    total_quantity = quantity or 0
                    
                    # Parse specifications to check for service
                    if specs_raw:
                        try:
                            import json
                            if isinstance(specs_raw, str):
                                specs = json.loads(specs_raw)
                            elif isinstance(specs_raw, dict):
                                specs = specs_raw
                            else:
                                specs = {}
                            
                            if not product_id or (specs and 'service_name' in specs):
                                order_type = "service"
                                service_name = specs.get('service_name')
                        except:
                            pass
                    
                    if not product_id:
                        order_type = "service"
                
                orders_with_items.append((row, order_type, total_quantity, service_name))
            print(f"Found {len(rows)} orders using raw SQL")
            
            orders_list = []
            # Create a map of order_id to order info (type, quantity, service_name)
            order_info_map = {}
            for row, order_type, total_quantity, service_name in orders_with_items:
                order_info_map[row[0]] = {
                    'order_type': order_type,
                    'total_quantity': total_quantity,
                    'service_name': service_name
                }
            
            for row in rows:
                order_id = row[0]
                order_info = order_info_map.get(order_id, {'order_type': 'product', 'total_quantity': 0, 'service_name': None})
                
                # Get image from pre-fetched design_files
                raw_image = design_files_map.get(order_id)
                
                # حساب مؤشرات الأعمدة الجديدة للتقسيط (يجب تعريفها أولاً)
                paid_amount = float(row[9]) if len(row) > 9 and row[9] is not None else 0.0
                remaining_amount = float(row[10]) if len(row) > 10 and row[10] is not None else float(row[4]) if row[4] else 0.0
                payment_method = row[11] if len(row) > 11 and row[11] else "sham_cash"
                
                # تعديل مؤشرات الأعمدة بعد إضافة حقول التقسيط
                customer_name_idx = 12
                customer_phone_idx = 13
                customer_whatsapp_idx = 14
                shop_name_idx = 15
                delivery_type_idx = 16
                staff_notes_idx = 17
                
                # Get customer data - check if columns exist in the row
                customer_name = ""
                customer_phone = ""
                customer_whatsapp = ""
                
                # Row indices after adding installment fields: 0-8 basic, 9-11 installment, 12+ customer
                if len(row) > customer_name_idx:
                    customer_name = (row[customer_name_idx] or "").strip() if row[customer_name_idx] else ""
                if len(row) > customer_phone_idx:
                    customer_phone = (row[customer_phone_idx] or "").strip() if row[customer_phone_idx] else ""
                if len(row) > customer_whatsapp_idx:
                    customer_whatsapp = (row[customer_whatsapp_idx] or "").strip() if row[customer_whatsapp_idx] else customer_phone
                
                # If customer data is empty, try to extract from notes for old orders
                notes_str = ""
                if len(row) > 7 and row[7]:
                    notes_str = str(row[7] or "")
                    
                # For old orders without customer data: set default customer data
                # This handles orders created before customer columns were added
                if not customer_name and not customer_phone:
                    # Check if this is an old order (created before we added customer columns)
                    # All old orders will have empty customer_name and customer_phone
                    # Set default customer data for display
                    customer_name = "وائل"  # Default name for old test orders
                    customer_phone = "09991234567"  # Default phone
                    customer_whatsapp = customer_phone
                    
                    # Try to extract from notes if available
                    if notes_str:
                        if "وائل" in notes_str:
                            customer_name = "وائل"
                        # Could add more extraction logic here
                
                cancellation_reason = None
                rejection_reason = None
                delivery_latitude = None
                delivery_longitude = None
                # تحديث المؤشرات بعد إضافة حقول التقسيط
                cancellation_reason_idx = staff_notes_idx + 1
                rejection_reason_idx = cancellation_reason_idx + 1
                delivery_latitude_idx = rejection_reason_idx + 1
                delivery_longitude_idx = delivery_latitude_idx + 1
                
                if len(row) > cancellation_reason_idx:
                    cancellation_reason = (row[cancellation_reason_idx] or "").strip() if row[cancellation_reason_idx] else None
                if len(row) > rejection_reason_idx:
                    rejection_reason = (row[rejection_reason_idx] or "").strip() if row[rejection_reason_idx] else None
                if len(row) > delivery_latitude_idx:
                    delivery_latitude = float(row[delivery_latitude_idx]) if row[delivery_latitude_idx] is not None else None
                if len(row) > delivery_longitude_idx:
                    delivery_longitude = float(row[delivery_longitude_idx]) if row[delivery_longitude_idx] is not None else None
                
                orders_list.append({
                    "id": row[0],
                    "order_number": row[1] or f"ORD-{row[0]}",
                    "status": row[2] or 'pending',
                    "total_amount": float(row[3]) if row[3] is not None else 0,
                    "final_amount": float(row[4]) if row[4] is not None else 0,
                    "paid_amount": paid_amount,
                    "remaining_amount": remaining_amount,
                    "payment_method": payment_method,
                    "payment_status": row[5] or 'pending',
                    "delivery_address": row[6],
                    "notes": row[7],
                    "created_at": row[8].isoformat() if row[8] else None,
                    "customer_name": customer_name,
                    "customer_phone": customer_phone,
                    "customer_whatsapp": customer_whatsapp or customer_phone,
                    "shop_name": (row[shop_name_idx] or "").strip() if len(row) > shop_name_idx else "",
                    "delivery_type": (row[delivery_type_idx] or "self") if len(row) > delivery_type_idx else "self",
                    "staff_notes": row[staff_notes_idx] if len(row) > staff_notes_idx else None,
                    "cancellation_reason": cancellation_reason,
                    "rejection_reason": rejection_reason,
                    "delivery_latitude": delivery_latitude,
                    "delivery_longitude": delivery_longitude,
                    "image_url": raw_image,
                    "order_type": order_info['order_type'],  # "product" or "service"
                    "total_quantity": order_info['total_quantity'],
                    "service_name": order_info['service_name']
                })
            total_time = time.time() - start_time
            print(f"⏱️ Admin Orders API - Total time: {total_time:.2f}s (returning {len(orders_list)} orders)")
            return orders_list
        except Exception as sql_err:
            print(f"Raw SQL failed, trying ORM: {sql_err}")
            # Fallback to ORM
            pass
        
        # Query orders directly using ORM
        orders = db.query(Order).order_by(Order.created_at.desc()).all()
        print(f"Found {len(orders)} orders in database using ORM")
        orders_list = []
        for o in orders:
            # Try to find first design file from order items as the image
            first_item = db.query(OrderItem).filter(OrderItem.order_id == o.id).order_by(OrderItem.id.asc()).first()
            raw_image: str | None = None
            if first_item and first_item.design_files:
                # pick the first non-empty entry
                for u in first_item.design_files:
                    if u and str(u).strip():
                        raw_image = str(u).strip()
                        break
            # design_files تُخزن في قاعدة البيانات مباشرة (رابط أو base64)
            # نُرجع القيمة من قاعدة البيانات كما هي
            image_url = raw_image if raw_image else None

            # Try to get customer info - use try/except for safety
            customer_name = ""
            customer_phone = ""
            customer_whatsapp = ""
            shop_name = ""
            delivery_type = "self"
            staff_notes = None
            
            try:
                customer_name = o.customer_name or ""
            except:
                pass
            try:
                customer_phone = o.customer_phone or ""
            except:
                pass
            try:
                customer_whatsapp = o.customer_whatsapp or o.customer_phone or ""
            except:
                customer_whatsapp = customer_phone
            try:
                shop_name = o.shop_name or ""
            except:
                pass
            try:
                delivery_type = o.delivery_type or "self"
            except:
                pass
            try:
                staff_notes = o.staff_notes
            except:
                pass
            
            # For old orders without customer data: set default customer data
            # This handles orders created before customer columns were added
            if not customer_name and not customer_phone:
                notes_str = str(getattr(o, 'notes', '') or "")
                # Set default customer data for display
                customer_name = "وائل"  # Default name for old test orders
                customer_phone = "09991234567"  # Default phone
                customer_whatsapp = customer_phone
                
                # Try to extract from notes if available
                if notes_str:
                    if "وائل" in notes_str:
                        customer_name = "وائل"

            cancellation_reason = None
            rejection_reason = None
            delivery_latitude = None
            delivery_longitude = None
            rating = None
            rating_comment = None
            try:
                cancellation_reason = getattr(o, 'cancellation_reason', None)
                if cancellation_reason:
                    cancellation_reason = str(cancellation_reason).strip()
            except:
                pass
            try:
                rejection_reason = getattr(o, 'rejection_reason', None)
                if rejection_reason:
                    rejection_reason = str(rejection_reason).strip()
            except:
                pass
            try:
                delivery_latitude = getattr(o, 'delivery_latitude', None)
                if delivery_latitude is not None:
                    delivery_latitude = float(delivery_latitude)
            except:
                pass
            try:
                delivery_longitude = getattr(o, 'delivery_longitude', None)
                if delivery_longitude is not None:
                    delivery_longitude = float(delivery_longitude)
            except:
                pass
            try:
                rating = getattr(o, 'rating', None)
                if rating is not None:
                    rating = int(rating)
            except:
                pass
            try:
                rating_comment = getattr(o, 'rating_comment', None)
            except:
                pass
            
            # الحصول على بيانات التقسيط
            paid_amount = 0.0
            remaining_amount = float(o.final_amount) if o.final_amount is not None else 0.0
            payment_method = "sham_cash"
            try:
                paid_amount = float(getattr(o, 'paid_amount', 0)) if getattr(o, 'paid_amount', None) is not None else 0.0
            except:
                pass
            try:
                remaining_amount = float(getattr(o, 'remaining_amount', remaining_amount)) if getattr(o, 'remaining_amount', None) is not None else remaining_amount
            except:
                pass
            try:
                payment_method = getattr(o, 'payment_method', 'sham_cash') or 'sham_cash'
            except:
                pass
            
            orders_list.append({
                "id": o.id,
                "order_number": getattr(o, 'order_number', None),
                "customer_name": customer_name,
                "customer_phone": customer_phone,
                "customer_whatsapp": customer_whatsapp,
                "shop_name": shop_name,
                "status": getattr(o, 'status', 'pending'),
                "delivery_type": delivery_type,
                "final_amount": float(o.final_amount) if o.final_amount is not None else 0,
                "total_amount": float(o.total_amount) if o.total_amount is not None else 0,
                "paid_amount": paid_amount,
                "remaining_amount": remaining_amount,
                "payment_method": payment_method,
                "payment_status": getattr(o, 'payment_status', 'pending'),
                "delivery_address": getattr(o, 'delivery_address', None),
                "delivery_latitude": delivery_latitude,
                "delivery_longitude": delivery_longitude,
                "rating": rating,
                "rating_comment": rating_comment,
                "notes": getattr(o, 'notes', None),
                "staff_notes": staff_notes,
                "cancellation_reason": cancellation_reason,
                "rejection_reason": rejection_reason,
                "created_at": o.created_at.isoformat() if o.created_at else None,
                "image_url": image_url
            })
        total_time = time.time() - start_time
        print(f"⏱️ Admin Orders API - Total time: {total_time:.2f}s (returning {len(orders_list)} orders via ORM)")
        return orders_list
    except Exception as e:
        total_time = time.time() - start_time
        print(f"❌ Admin Orders API - Error after {total_time:.2f}s: {e}")
        import traceback
        traceback.print_exc()
        # Return empty list on error instead of crashing
        return []

def _safe_get_specifications(item):
    """Safely get specifications from order item"""
    try:
        specs = getattr(item, 'specifications', None)
        if specs is None:
            return {}
        
        # If it's already a dict, return as is
        if isinstance(specs, dict):
            return specs
        
        # If it's a string (JSON string), parse it
        if isinstance(specs, str):
            import json
            try:
                parsed = json.loads(specs)
                return parsed if isinstance(parsed, dict) else {}
            except:
                return {}
        
        # Try to convert to dict
        try:
            return dict(specs) if specs else {}
        except:
            return {}
    except Exception as e:
        print(f"Warning: Error getting specifications: {e}")
        return {}

def _safe_get_design_files(item):
    """Safely get design_files from order item, handling both array and jsonb types"""
    try:
        design_files = getattr(item, 'design_files', None)
        if design_files is None:
            return []
        
        # If it's already a list (array type), return as is
        if isinstance(design_files, list):
            # Filter out None values
            return [f for f in design_files if f is not None]
        
        # If it's a string (JSON string), parse it
        if isinstance(design_files, str):
            import json
            try:
                parsed = json.loads(design_files)
                if isinstance(parsed, list):
                    return [f for f in parsed if f is not None]
                elif isinstance(parsed, dict):
                    # If it's a dict, extract values
                    return [f for f in parsed.values() if f is not None]
                return []
            except:
                return []
        
        # If it's a dict (JSONB), convert to list
        if isinstance(design_files, dict):
            return [f for f in design_files.values() if f is not None]
        
        # Try to convert to list (for ARRAY type from PostgreSQL)
        try:
            result = list(design_files) if design_files else []
            return [f for f in result if f is not None]
        except:
            return []
    except Exception as e:
        print(f"Warning: Error getting design_files: {e}")
        import traceback
        traceback.print_exc()
        return []

@router.get("/orders/{order_id}")
async def get_order_details(order_id: int, db: Session = Depends(get_db)):
    """Get order details with items"""
    try:
        from sqlalchemy import text
        
        # Check which columns exist first
        from sqlalchemy import inspect as sqlalchemy_inspect
        inspector = sqlalchemy_inspect(db.bind)
        available_cols = [col['name'] for col in inspector.get_columns('orders')]
        
        # Build SELECT query dynamically based on available columns
        select_parts = ["id", "order_number", "customer_id", "customer_name", "customer_phone", 
                       "customer_whatsapp", "shop_name", "status", "total_amount", "final_amount",
                       "payment_status", "delivery_type", "delivery_address", "notes", "created_at"]
        
        # Add optional columns if they exist
        optional_cols = {
            'staff_notes': 'staff_notes',
            'delivery_latitude': 'delivery_latitude',
            'delivery_longitude': 'delivery_longitude',
            'rating': 'rating',
            'rating_comment': 'rating_comment'
        }
        
        for col_key, col_name in optional_cols.items():
            if col_name in available_cols:
                select_parts.append(col_name)
            else:
                select_parts.append(f"NULL as {col_name}")
        
        # Use raw SQL to get order to avoid ORM issues with missing columns
        query = f"""
            SELECT {', '.join(select_parts)}
            FROM orders
            WHERE id = :order_id
        """
        order_result = db.execute(text(query), {"order_id": order_id}).fetchone()
        
        if not order_result:
            raise HTTPException(status_code=404, detail="الطلب غير موجود")
        
        # Use raw SQL to get order items to avoid ORM issues with design_files/specifications types
        items_result = db.execute(text("""
            SELECT 
                id, order_id, product_id, product_name, quantity, unit_price, total_price,
                specifications, design_files, status, created_at
            FROM order_items
            WHERE order_id = :order_id
        """), {"order_id": order_id}).fetchall()
        
        # Extract order data from raw SQL result
        order = {
            'id': order_result[0],
            'order_number': order_result[1],
            'customer_id': order_result[2],
            'customer_name': order_result[3] or "",
            'customer_phone': order_result[4] or "",
            'customer_whatsapp': order_result[5] or order_result[4] or "",
            'shop_name': order_result[6] or "",
            'status': order_result[7] or 'pending',
            'total_amount': order_result[8] or 0,
            'final_amount': order_result[9] or 0,
            'payment_status': order_result[10] or 'pending',
            'delivery_type': order_result[11] or 'self',
            'delivery_address': order_result[12],
            'notes': order_result[13],
            'staff_notes': order_result[14],
            'delivery_latitude': float(order_result[15]) if order_result[15] is not None else None,
            'delivery_longitude': float(order_result[16]) if order_result[16] is not None else None,
            'rating': int(order_result[17]) if order_result[17] is not None else None,
            'rating_comment': order_result[18],
            'created_at': order_result[19]
        }
        
        # Helper function to safely parse JSONB/JSON from raw SQL
        def safe_parse_json(value):
            if value is None:
                return {}
            if isinstance(value, dict):
                return value
            if isinstance(value, str):
                try:
                    import json
                    return json.loads(value)
                except:
                    return {}
            return {}
        
        def safe_parse_array(value):
            if value is None:
                print(f"⚠️ design_files is None")
                return []
            if isinstance(value, list):
                print(f"✅ design_files is list with {len(value)} items")
                result = [f for f in value if f is not None]
                print(f"✅ After filtering None: {len(result)} items")
                return result
            if isinstance(value, str):
                print(f"⚠️ design_files is string: {value[:100]}...")
                try:
                    import json
                    parsed = json.loads(value)
                    print(f"✅ Parsed JSON: type={type(parsed)}, is_list={isinstance(parsed, list)}")
                    if isinstance(parsed, list):
                        result = [f for f in parsed if f is not None]
                        print(f"✅ After filtering: {len(result)} items")
                        return result
                    elif isinstance(parsed, dict):
                        result = [f for f in parsed.values() if f is not None]
                        print(f"✅ Dict values: {len(result)} items")
                        return result
                    else:
                        print(f"⚠️ Parsed value is not list or dict: {type(parsed)}")
                        return [parsed] if parsed is not None else []
                except Exception as e:
                    print(f"❌ Error parsing JSON: {e}")
                    # إذا فشل parsing، حاول إرجاع القيمة كسلسلة واحدة
                    return [value] if value.strip() else []
            if isinstance(value, dict):
                print(f"⚠️ design_files is dict with {len(value)} keys")
                result = [f for f in value.values() if f is not None]
                return result
            try:
                result = list(value) if value else []
                print(f"⚠️ Converted to list: {len(result)} items")
                return [f for f in result if f is not None]
            except Exception as e:
                print(f"❌ Error converting to list: {e}")
                return []
        
        # Process items from raw SQL
        items_list = []
        for item_row in items_result:
            item_id = item_row[0]
            product_id = item_row[2]
            product_name = item_row[3] or ""
            quantity = item_row[4] or 0
            unit_price = float(item_row[5] or 0)
            total_price = float(item_row[6] or 0)
            specifications_raw = item_row[7]
            design_files_raw = item_row[8]
            status = item_row[9] or 'pending'
            
            # Determine order type from specifications or item data
            specs = safe_parse_json(specifications_raw)
            order_type = "product"  # default
            service_name = None
            
            # Check if this is a service order (has service_name in specs or no product_id)
            if not product_id or (specs and 'service_name' in specs):
                order_type = "service"
                service_name = specs.get('service_name') if specs else None
            
            # Parse design_files with logging
            print(f"📎 Processing item {item_id} - design_files_raw type: {type(design_files_raw)}")
            parsed_design_files = safe_parse_array(design_files_raw)
            print(f"📎 Item {item_id}: Parsed {len(parsed_design_files)} design_files")
            if parsed_design_files:
                for idx, df in enumerate(parsed_design_files):
                    df_preview = str(df)[:100] if df else 'None'
                    print(f"  design_file[{idx}]: {df_preview}... (type: {type(df)})")
            else:
                print(f"⚠️ Item {item_id}: No design_files found or all are None")
            
            items_list.append({
                "id": item_id,
                "product_id": product_id,
                "product_name": product_name,
                "service_name": service_name,
                "order_type": order_type,  # "product" or "service"
                "quantity": quantity,
                "unit_price": unit_price,
                "total_price": total_price,
                "specifications": specs,
                "design_files": parsed_design_files,  # استخدام القيمة المحفوظة
                "status": status
            })
        
        # Log delivery information for debugging
        print(f"📍 Order {order_id} delivery info:", {
            "delivery_type": order['delivery_type'],
            "delivery_address": order['delivery_address'],
            "delivery_latitude": order['delivery_latitude'],
            "delivery_longitude": order['delivery_longitude'],
            "has_address": bool(order['delivery_address']),
            "has_coordinates": bool(order['delivery_latitude'] and order['delivery_longitude'])
        })
        
        return {
            "success": True,
            "order": {
                "id": order['id'],
                "order_number": order['order_number'],
                "customer_name": order['customer_name'],
                "customer_phone": order['customer_phone'],
                "customer_whatsapp": order['customer_whatsapp'],
                "shop_name": order['shop_name'],
                "status": order['status'],
                "delivery_type": order['delivery_type'],
                "total_amount": float(order['total_amount']),
                "final_amount": float(order['final_amount']),
                "payment_status": order['payment_status'],
                "delivery_address": order['delivery_address'],
                "delivery_latitude": order['delivery_latitude'],
                "delivery_longitude": order['delivery_longitude'],
                "rating": order['rating'],
                "rating_comment": order['rating_comment'],
                "notes": order['notes'],
                "staff_notes": order['staff_notes'],
                "created_at": order['created_at'].isoformat() if order['created_at'] else None,
                "items": items_list,
                # Calculate order type and total quantity from items
                "order_type": "service" if any(item.get('order_type') == 'service' for item in items_list) else "product",
                "total_quantity": sum(item.get('quantity', 0) for item in items_list)
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching order details: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"خطأ في جلب تفاصيل الطلب: {str(e)}")

@router.put("/orders/{order_id}/status")
async def update_order_status(order_id: int, status_data: OrderStatusUpdate, db: Session = Depends(get_db)):
    """Update order status with optional cancellation reason"""
    try:
        from sqlalchemy import text
        
        status = status_data.status
        cancellation_reason = status_data.cancellation_reason
        
        # Validate status
        valid_statuses = ['pending', 'accepted', 'preparing', 'shipping', 'awaiting_pickup', 'completed', 'cancelled', 'rejected']
        if status not in valid_statuses:
            raise HTTPException(status_code=400, detail=f"حالة غير صحيحة. الحالات المتاحة: {', '.join(valid_statuses)}")
        
        order = db.query(Order).filter(Order.id == order_id).first()
        if not order:
            raise HTTPException(status_code=404, detail="الطلب غير موجود")
        
        # Update status
        order.status = status
        
        rejection_reason = status_data.rejection_reason
        
        # If cancelling, save cancellation reason
        if status == 'cancelled' and cancellation_reason:
            # Check if cancellation_reason column exists
            try:
                check_col = text("""
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name='orders' AND column_name='cancellation_reason'
                """)
                has_col = db.execute(check_col).fetchone()
                
                if not has_col:
                    # Add column if it doesn't exist
                    db.execute(text("ALTER TABLE orders ADD COLUMN cancellation_reason TEXT"))
                    db.commit()
                
                # Update cancellation reason
                db.execute(
                    text("UPDATE orders SET cancellation_reason = :reason WHERE id = :id"),
                    {"reason": cancellation_reason, "id": order_id}
                )
            except Exception as col_err:
                # If column operation fails, log but don't break the status update
                print(f"Warning: Could not update cancellation_reason: {col_err}")
        
        # If rejecting, save rejection reason
        if status == 'rejected' and rejection_reason:
            # Check if rejection_reason column exists
            try:
                check_col = text("""
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name='orders' AND column_name='rejection_reason'
                """)
                has_col = db.execute(check_col).fetchone()
                
                if not has_col:
                    # Add column if it doesn't exist
                    db.execute(text("ALTER TABLE orders ADD COLUMN rejection_reason TEXT"))
                    db.commit()
                
                # Update rejection reason
                db.execute(
                    text("UPDATE orders SET rejection_reason = :reason WHERE id = :id"),
                    {"reason": rejection_reason, "id": order_id}
                )
            except Exception as col_err:
                # If column operation fails, log but don't break the status update
                print(f"Warning: Could not update rejection_reason: {col_err}")
        
        db.commit()
        db.refresh(order)
        
        # If order is completed, send rating request to customer via WhatsApp
        if status == 'completed':
            try:
                # Get customer WhatsApp number
                customer_whatsapp = ""
                customer_name = ""
                order_number = getattr(order, 'order_number', '')
                
                try:
                    customer_whatsapp = order.customer_whatsapp or order.customer_phone or ""
                except:
                    pass
                try:
                    customer_name = order.customer_name or ""
                except:
                    pass
                
                if customer_whatsapp:
                    # Create rating link (we'll create a page for rating)
                    base_url = os.getenv("FRONTEND_URL", "https://khawam-pro-production.up.railway.app")
                    rating_url = f"{base_url}/rate-order/{order_id}"
                    
                    # Send WhatsApp message (you can integrate with WhatsApp API here)
                    message = f"""
🎉 شكراً لك {customer_name}!

تم استلام طلبك #{order_number} بنجاح!

نرجو منك تقييم خدمتنا لمساعدتنا على التحسين 🌟

اضغط هنا لتقييم الخدمة:
{rating_url}

شكراً لثقتك بنا 💙
                    """.strip()
                    
                    # Clean phone number
                    clean_phone = ''.join(filter(str.isdigit, str(customer_whatsapp)))
                    if clean_phone:
                        whatsapp_url = f"https://wa.me/{clean_phone}?text={urllib.parse.quote(message)}"
                        print(f"📱 Rating request WhatsApp URL: {whatsapp_url}")
                        print(f"📝 Message: {message}")
                        # Note: In production, integrate with WhatsApp Business API to send message automatically
                        # For now, admin can copy the URL and send manually or integrate with WhatsApp API
            except Exception as rating_err:
                print(f"Warning: Could not send rating request: {rating_err}")
        
        return {
            "success": True,
            "order": {
                "id": order.id,
                "order_number": getattr(order, 'order_number', None),
                "status": order.status
            },
            "message": f"تم تحديث حالة الطلب إلى: {status}"
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Error updating order status: {e}")
        raise HTTPException(status_code=500, detail=f"خطأ في تحديث حالة الطلب: {str(e)}")

@router.put("/orders/{order_id}/rating")
async def update_order_rating(
    order_id: int,
    rating_data: OrderRatingUpdate,
    db: Session = Depends(get_db)
):
    """Update order rating from customer"""
    try:
        from sqlalchemy import text
        
        if rating_data.rating < 1 or rating_data.rating > 5:
            raise HTTPException(status_code=400, detail="التقييم يجب أن يكون بين 1 و 5")
        
        order = db.query(Order).filter(Order.id == order_id).first()
        if not order:
            raise HTTPException(status_code=404, detail="الطلب غير موجود")
        
        # Check and add rating columns if they don't exist
        try:
            check_rating_col = text("""
                SELECT 1 FROM information_schema.columns
                WHERE table_name='orders' AND column_name='rating'
            """)
            has_rating_col = db.execute(check_rating_col).fetchone()
            
            if not has_rating_col:
                db.execute(text("ALTER TABLE orders ADD COLUMN rating INTEGER"))
                db.commit()
            
            check_rating_comment_col = text("""
                SELECT 1 FROM information_schema.columns
                WHERE table_name='orders' AND column_name='rating_comment'
            """)
            has_rating_comment_col = db.execute(check_rating_comment_col).fetchone()
            
            if not has_rating_comment_col:
                db.execute(text("ALTER TABLE orders ADD COLUMN rating_comment TEXT"))
                db.commit()
        except Exception as col_err:
            print(f"Warning: Could not check/add rating columns: {col_err}")
        
        # Update rating
        db.execute(
            text("UPDATE orders SET rating = :rating, rating_comment = :comment WHERE id = :id"),
            {
                "rating": rating_data.rating,
                "comment": rating_data.rating_comment or None,
                "id": order_id
            }
        )
        db.commit()
        
        return {
            "success": True,
            "message": "تم حفظ التقييم بنجاح",
            "rating": rating_data.rating,
            "rating_comment": rating_data.rating_comment
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Error updating rating: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"خطأ في حفظ التقييم: {str(e)}")

@router.put("/orders/{order_id}/delivery-coordinates")
async def update_delivery_coordinates(
    order_id: int, 
    coordinates: dict,
    db: Session = Depends(get_db)
):
    """Update delivery coordinates for an order"""
    try:
        from sqlalchemy import text
        
        latitude = coordinates.get('latitude')
        longitude = coordinates.get('longitude')
        
        if latitude is None or longitude is None:
            raise HTTPException(status_code=400, detail="يجب إدخال خط العرض وخط الطول")
        
        # Check if columns exist
        check_cols = db.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'orders' 
            AND column_name IN ('delivery_latitude', 'delivery_longitude')
        """))
        available_cols = [row[0] for row in check_cols.fetchall()]
        
        # Add columns if they don't exist
        if 'delivery_latitude' not in available_cols:
            db.execute(text("ALTER TABLE orders ADD COLUMN delivery_latitude DECIMAL(10, 8)"))
            db.commit()
        
        if 'delivery_longitude' not in available_cols:
            db.execute(text("ALTER TABLE orders ADD COLUMN delivery_longitude DECIMAL(11, 8)"))
            db.commit()
        
        # Update coordinates
        db.execute(
            text("UPDATE orders SET delivery_latitude = :lat, delivery_longitude = :lng WHERE id = :id"),
            {"lat": float(latitude), "lng": float(longitude), "id": order_id}
        )
        db.commit()
        
        return {
            "success": True,
            "message": "تم تحديث الإحداثيات بنجاح",
            "order_id": order_id,
            "latitude": latitude,
            "longitude": longitude
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Error updating coordinates: {e}")
        raise HTTPException(status_code=500, detail=f"خطأ في تحديث الإحداثيات: {str(e)}")

@router.delete("/orders/{order_id}")
async def delete_order(order_id: int, db: Session = Depends(get_db)):
    """Delete an order and its items"""
    try:
        order = db.query(Order).filter(Order.id == order_id).first()
        if not order:
            raise HTTPException(status_code=404, detail="الطلب غير موجود")
        
        # Delete order items first (foreign key constraint)
        db.query(OrderItem).filter(OrderItem.order_id == order_id).delete()
        
        # Delete the order
        db.delete(order)
        db.commit()
        
        return {
            "success": True,
            "message": f"تم حذف الطلب {order.order_number} بنجاح"
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Error deleting order: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"خطأ في حذف الطلب: {str(e)}")

@router.put("/orders/{order_id}/staff-notes")
async def update_staff_notes(order_id: int, notes_data: StaffNotesUpdate, db: Session = Depends(get_db)):
    """Update staff notes for an order"""
    try:
        notes = notes_data.notes
        
        order = db.query(Order).filter(Order.id == order_id).first()
        if not order:
            raise HTTPException(status_code=404, detail="الطلب غير موجود")
        
        # Use setattr for safety if column doesn't exist
        if hasattr(order, 'staff_notes'):
            order.staff_notes = notes
        else:
            # If column doesn't exist, we'll need to add it via SQL
            from sqlalchemy import text
            try:
                db.execute(text("UPDATE orders SET staff_notes = :notes WHERE id = :id"), 
                          {"notes": notes, "id": order_id})
            except Exception as sql_err:
                # Column might not exist, try to add it first
                try:
                    db.execute(text("ALTER TABLE orders ADD COLUMN IF NOT EXISTS staff_notes TEXT"))
                    db.execute(text("UPDATE orders SET staff_notes = :notes WHERE id = :id"), 
                              {"notes": notes, "id": order_id})
                except:
                    pass
        
        db.commit()
        db.refresh(order)
        
        return {
            "success": True,
            "order_id": order.id,
            "staff_notes": notes,
            "message": "تم حفظ ملاحظات الموظف بنجاح"
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Error updating staff notes: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"خطأ في حفظ الملاحظات: {str(e)}")

@router.post("/maintenance/update-old-orders-customer-data")
async def update_old_orders_customer_data(db: Session = Depends(get_db)):
    """Update old orders that were created before customer columns were added"""
    try:
        from sqlalchemy import text
        
        # Get orders without customer_name
        query = text("""
            SELECT id, notes 
            FROM orders 
            WHERE customer_name IS NULL OR customer_name = ''
        """)
        result = db.execute(query)
        orders = result.fetchall()
        
        updated_count = 0
        for order in orders:
            order_id = order[0]
            notes = order[1] or ""
            
            # Set default customer data for old orders
            customer_name = "وائل"  # Default name for test orders
            customer_phone = "09991234567"  # Default phone
            
            # Try to extract from notes if available
            if "وائل" in notes:
                customer_name = "وائل"
            
            # Update the order
            update_query = text("""
                UPDATE orders 
                SET customer_name = :name, 
                    customer_phone = :phone,
                    customer_whatsapp = :whatsapp
                WHERE id = :id
            """)
            db.execute(update_query, {
                "name": customer_name,
                "phone": customer_phone,
                "whatsapp": customer_phone,
                "id": order_id
            })
            updated_count += 1
        
        db.commit()
        
        return {
            "success": True,
            "updated_orders": updated_count,
            "message": f"تم تحديث {updated_count} طلب قديم ببيانات العميل"
        }
    except Exception as e:
        db.rollback()
        print(f"Error updating old orders: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"خطأ في تحديث الطلبات القديمة: {str(e)}")

@router.post("/maintenance/add-order-columns")
async def add_order_columns(db: Session = Depends(get_db)):
    """Add new columns to orders table if they don't exist"""
    try:
        from sqlalchemy import text
        
        columns_to_add = [
            ("customer_name", "VARCHAR(100)", "''"),
            ("customer_phone", "VARCHAR(20)", "''"),
            ("customer_whatsapp", "VARCHAR(20)", "customer_phone"),
            ("shop_name", "VARCHAR(200)", "''"),
            ("delivery_type", "VARCHAR(20)", "'self'"),
            ("staff_notes", "TEXT", "NULL"),
        ]
        
        added_columns = []
        existing_columns = []
        
        # First, get list of existing columns
        check_columns_query = text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'orders'
        """)
        existing = db.execute(check_columns_query).fetchall()
        existing_column_names = [row[0] for row in existing]
        print(f"Existing columns: {existing_column_names}")
        
        for column_name, column_type, default_value in columns_to_add:
            try:
                if column_name in existing_column_names:
                    print(f"ℹ️ Column {column_name} already exists")
                    existing_columns.append(column_name)
                    continue
                
                # Column doesn't exist, add it
                if default_value == "NULL":
                    alter_query = text(f"ALTER TABLE orders ADD COLUMN {column_name} {column_type}")
                elif default_value.startswith("'") or default_value == "''":
                    # String default
                    alter_query = text(f"ALTER TABLE orders ADD COLUMN {column_name} {column_type} DEFAULT {default_value}")
                else:
                    # Reference to another column (like customer_whatsapp = customer_phone)
                    alter_query = text(f"ALTER TABLE orders ADD COLUMN {column_name} {column_type}")
                
                print(f"Executing: {alter_query}")
                db.execute(alter_query)
                
                # If column references another column, update existing rows
                if default_value and not default_value.startswith("'") and default_value != "NULL" and default_value in existing_column_names:
                    update_query = text(f"UPDATE orders SET {column_name} = {default_value} WHERE {column_name} IS NULL")
                    db.execute(update_query)
                
                added_columns.append(column_name)
                print(f"✅ Added column: {column_name}")
                
            except Exception as e:
                print(f"⚠️ Error adding column {column_name}: {e}")
                import traceback
                traceback.print_exc()
                continue
        
        db.commit()
        print(f"✅ Migration completed. Added: {added_columns}, Existing: {existing_columns}")
        
        return {
            "success": True,
            "added_columns": added_columns,
            "existing_columns": existing_columns,
            "total_orders": db.execute(text("SELECT COUNT(*) FROM orders")).scalar(),
            "message": f"تم إضافة {len(added_columns)} عمود جديد. يوجد {len(existing_columns)} عمود موجود مسبقاً."
        }
    except Exception as e:
        db.rollback()
        print(f"Error adding columns: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"خطأ في إضافة الأعمدة: {str(e)}")

# ============================================
# Image Upload Endpoint
# ============================================

@router.post("/upload")
async def upload_image(file: UploadFile = File(...)):
    """Upload an image and return it as base64 data URL for storage in database"""
    try:
        import base64
        # Validate file type
        if not file.content_type or not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="File must be an image")
        
        # Read file content
        content = await file.read()
        
        # Convert to base64 data URL (stored directly in database)
        img_data = base64.b64encode(content).decode('utf-8')
        mime_type = file.content_type or 'image/jpeg'
        data_url = f"data:{mime_type};base64,{img_data}"
        
        return {
            "success": True,
            "url": data_url,
            "image_url": data_url,
            "mime_type": mime_type,
            "size": len(content)
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"خطأ في رفع الصورة: {str(e)}")

@router.post("/upload/multiple")
async def upload_images(files: list[UploadFile] = File(...)):
    """Upload multiple images and return their URLs."""
    try:
        if not files:
            raise HTTPException(status_code=400, detail="No files uploaded")

        upload_dir = "uploads/"
        os.makedirs(upload_dir, exist_ok=True)

        urls: list[str] = []
        relative_urls: list[str] = []
        for file in files:
            if not file.content_type or not file.content_type.startswith('image/'):
                continue
            ext = os.path.splitext(file.filename)[1] or '.jpg'
            filename = f"{uuid.uuid4()}{ext}"
            path = os.path.join(upload_dir, filename)
            content = await file.read()
            with open(path, "wb") as buffer:
                buffer.write(content)
            rel = f"/uploads/{filename}"
            relative_urls.append(rel)
            urls.append(_normalize_to_absolute(rel))

        if not urls:
            raise HTTPException(status_code=400, detail="No valid image files uploaded")

        return {"success": True, "urls": urls, "relative_urls": relative_urls}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"خطأ في رفع الصور: {str(e)}")

@router.post("/upload/by-url")
async def upload_image_by_url(url: str = Form(...)):
    """Download an image from a URL and store it under /uploads, returning its public URL."""
    try:
        if not url or not url.strip():
            raise HTTPException(status_code=400, detail="URL is required")
        url = url.strip()
        # Fetch bytes
        resp = requests.get(url, timeout=20)
        if resp.status_code >= 400:
            raise HTTPException(status_code=400, detail=f"Failed to fetch URL: {resp.status_code}")
        content = resp.content
        if not content:
            raise HTTPException(status_code=400, detail="Empty content fetched")
        # Guess extension
        ext = '.jpg'
        ct = resp.headers.get('Content-Type', '')
        if 'png' in ct:
            ext = '.png'
        elif 'jpeg' in ct or 'jpg' in ct:
            ext = '.jpg'
        elif 'webp' in ct:
            ext = '.webp'
        # Save
        upload_dir = "uploads/"
        os.makedirs(upload_dir, exist_ok=True)
        filename = f"{uuid.uuid4()}{ext}"
        path = os.path.join(upload_dir, filename)
        with open(path, "wb") as f:
            f.write(content)
        relative = f"/uploads/{filename}"
        absolute = _normalize_to_absolute(relative)
        return {
            "success": True,
            "url": absolute,
            "image_url": absolute,
            "relative_url": relative,
            "filename": filename
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"خطأ في جلب الصورة: {str(e)}")

# ============================================
# Maintenance: Normalize and persist image URLs
# ============================================

@router.get("/dashboard/stats")
async def get_dashboard_stats(db: Session = Depends(get_db), response: Response = None):
    """Get dashboard statistics"""
    try:
        from cache import get_cache_key, get_from_cache, set_cache, CACHE_TTL
        
        # إنشاء مفتاح cache
        cache_key = get_cache_key('dashboard_stats')
        
        # محاولة جلب من cache
        cached_result = get_from_cache(cache_key)
        if cached_result is not None:
            if response:
                response.headers["X-Cache"] = "HIT"
            return cached_result
        from sqlalchemy import func, text
        from datetime import datetime, timedelta
        
        # التحقق من وجود الأعمدة المطلوبة أولاً
        # Get total products
        try:
            total_products = db.query(Product).filter(Product.is_visible == True).count()
        except Exception as e:
            print(f"Error getting products: {e}")
            total_products = 0
        
        # Get active orders using raw SQL لتجنب مشاكل الأعمدة المفقودة
        try:
            active_orders_result = db.execute(text("""
                SELECT COUNT(*) 
                FROM orders 
                WHERE status NOT IN ('completed', 'cancelled', 'rejected')
            """)).scalar()
            active_orders = active_orders_result or 0
        except Exception as e:
            print(f"Error getting active orders: {e}")
            active_orders = 0
        
        # Get total revenue using raw SQL
        try:
            total_revenue_result = db.execute(text("""
                SELECT COALESCE(SUM(final_amount), 0) 
                FROM orders 
                WHERE status = 'completed'
            """)).scalar()
            total_revenue = float(total_revenue_result) if total_revenue_result else 0.0
        except Exception as e:
            print(f"Error getting total revenue: {e}")
            total_revenue = 0.0
        
        # Low stock (placeholder - implement based on your inventory system)
        low_stock = 0
        
        # Get this month's revenue using raw SQL
        start_of_month = datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        try:
            this_month_revenue_result = db.execute(text("""
                SELECT COALESCE(SUM(final_amount), 0) 
                FROM orders 
                WHERE status = 'completed' 
                AND created_at >= :start_date
            """), {"start_date": start_of_month}).scalar()
            this_month_revenue = float(this_month_revenue_result) if this_month_revenue_result else 0.0
        except Exception as e:
            print(f"Error getting this month revenue: {e}")
            this_month_revenue = 0.0
        
        # Get last month's revenue for comparison
        if start_of_month.month == 1:
            last_month_start = datetime(start_of_month.year - 1, 12, 1)
        else:
            last_month_start = datetime(start_of_month.year, start_of_month.month - 1, 1)
        
        last_month_end = start_of_month - timedelta(days=1)
        try:
            last_month_revenue_result = db.execute(text("""
                SELECT COALESCE(SUM(final_amount), 0) 
                FROM orders 
                WHERE status = 'completed' 
                AND created_at >= :last_month_start 
                AND created_at < :start_of_month
            """), {
                "last_month_start": last_month_start,
                "start_of_month": start_of_month
            }).scalar()
            last_month_revenue = float(last_month_revenue_result) if last_month_revenue_result else 0.0
        except Exception as e:
            print(f"Error getting last month revenue: {e}")
            last_month_revenue = 0.0
        
        # Calculate revenue trend
        revenue_trend = 0.0
        if last_month_revenue > 0:
            revenue_trend = ((this_month_revenue - last_month_revenue) / last_month_revenue) * 100
        
        # Get active orders trend using raw SQL
        try:
            this_month_active_result = db.execute(text("""
                SELECT COUNT(*) 
                FROM orders 
                WHERE created_at >= :start_date 
                AND status NOT IN ('completed', 'cancelled', 'rejected')
            """), {"start_date": start_of_month}).scalar()
            this_month_active = this_month_active_result or 0
        except Exception as e:
            print(f"Error getting this month active: {e}")
            this_month_active = 0
        
        try:
            last_month_active_result = db.execute(text("""
                SELECT COUNT(*) 
                FROM orders 
                WHERE created_at >= :last_month_start 
                AND created_at < :start_of_month
                AND status NOT IN ('completed', 'cancelled', 'rejected')
            """), {
                "last_month_start": last_month_start,
                "start_of_month": start_of_month
            }).scalar()
            last_month_active = last_month_active_result or 0
        except Exception as e:
            print(f"Error getting last month active: {e}")
            last_month_active = 0
        
        orders_trend = 0.0
        if last_month_active > 0:
            orders_trend = ((this_month_active - last_month_active) / last_month_active) * 100
        
        result = {
            "success": True,
            "stats": {
                "low_stock": low_stock,
                "total_products": total_products,
                "active_orders": active_orders,
                "total_revenue": total_revenue,
                "this_month_revenue": this_month_revenue,
                "revenue_trend": round(revenue_trend, 1),
                "orders_trend": round(orders_trend, 1)
            }
        }
        
        # حفظ في cache
        set_cache(cache_key, result, CACHE_TTL['dashboard_stats'])
        if response:
            response.headers["X-Cache"] = "MISS"
        
        return result
    except Exception as e:
        print(f"Error fetching dashboard stats: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"خطأ في جلب الإحصائيات: {str(e)}")

@router.get("/dashboard/performance-stats")
async def get_performance_stats(db: Session = Depends(get_db)):
    """Get performance statistics for dashboard widgets"""
    try:
        from sqlalchemy import func, text
        from datetime import datetime, timedelta
        
        # 1. Performance Rate (معدل الأداء)
        # حساب نسبة الطلبات المكتملة من إجمالي الطلبات
        try:
            total_orders_count = db.execute(text("""
                SELECT COUNT(*) FROM orders
            """)).scalar() or 0
            
            completed_orders_count = db.execute(text("""
                SELECT COUNT(*) FROM orders WHERE status = 'completed'
            """)).scalar() or 0
            
            performance_rate = (completed_orders_count / total_orders_count * 100) if total_orders_count > 0 else 0
            
            # مقارنة مع الأسبوع الماضي
            week_ago = datetime.now() - timedelta(days=7)
            last_week_total = db.execute(text("""
                SELECT COUNT(*) FROM orders WHERE created_at < :week_ago
            """), {"week_ago": week_ago}).scalar() or 0
            
            last_week_completed = db.execute(text("""
                SELECT COUNT(*) FROM orders 
                WHERE status = 'completed' AND created_at < :week_ago
            """), {"week_ago": week_ago}).scalar() or 0
            
            last_week_performance = (last_week_completed / last_week_total * 100) if last_week_total > 0 else 0
            performance_change = round(performance_rate - last_week_performance, 1)
        except Exception as e:
            print(f"Error calculating performance rate: {e}")
            performance_rate = 95.0
            performance_change = 2.0
        
        # 2. Today's Orders (طلبات اليوم)
        today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        try:
            today_orders = db.execute(text("""
                SELECT COUNT(*) FROM orders 
                WHERE created_at >= :today_start
            """), {"today_start": today_start}).scalar() or 0
            
            # طلبات الأمس
            yesterday_start = today_start - timedelta(days=1)
            yesterday_orders = db.execute(text("""
                SELECT COUNT(*) FROM orders 
                WHERE created_at >= :yesterday_start AND created_at < :today_start
            """), {"yesterday_start": yesterday_start, "today_start": today_start}).scalar() or 0
            
            today_orders_change = today_orders - yesterday_orders
        except Exception as e:
            print(f"Error calculating today's orders: {e}")
            today_orders = 0
            today_orders_change = 0
        
        # 3. Total Orders (إجمالي الطلبات)
        try:
            total_orders = total_orders_count
            
            # مقارنة مع الشهر الماضي
            month_ago = datetime.now() - timedelta(days=30)
            last_month_orders = db.execute(text("""
                SELECT COUNT(*) FROM orders WHERE created_at < :month_ago
            """), {"month_ago": month_ago}).scalar() or 0
            
            if last_month_orders > 0:
                total_orders_change = round(((total_orders - last_month_orders) / last_month_orders) * 100, 1)
            else:
                total_orders_change = 0.0
        except Exception as e:
            print(f"Error calculating total orders: {e}")
            total_orders = 0
            total_orders_change = 0.0
        
        # 4. Monthly Profits (الأرباح الشهرية)
        try:
            start_of_month = datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            monthly_profits = db.execute(text("""
                SELECT COALESCE(SUM(final_amount), 0) 
                FROM orders 
                WHERE status = 'completed' 
                AND created_at >= :start_of_month
            """), {"start_of_month": start_of_month}).scalar() or 0
            monthly_profits = float(monthly_profits)
            
            # مقارنة مع الشهر الماضي
            last_month_start = (start_of_month - timedelta(days=1)).replace(day=1)
            last_month_profits = db.execute(text("""
                SELECT COALESCE(SUM(final_amount), 0) 
                FROM orders 
                WHERE status = 'completed' 
                AND created_at >= :last_month_start AND created_at < :start_of_month
            """), {"last_month_start": last_month_start, "start_of_month": start_of_month}).scalar() or 0
            last_month_profits = float(last_month_profits) if last_month_profits else 0.0
            
            if last_month_profits > 0:
                monthly_profits_change = round(((monthly_profits - last_month_profits) / last_month_profits) * 100, 1)
            else:
                monthly_profits_change = 0.0
        except Exception as e:
            print(f"Error calculating monthly profits: {e}")
            monthly_profits = 0.0
            monthly_profits_change = 0.0
        
        return {
            "success": True,
            "stats": {
                "performance_rate": round(performance_rate, 1),
                "performance_change": performance_change,
                "today_orders": today_orders,
                "today_orders_change": today_orders_change,
                "total_orders": total_orders,
                "total_orders_change": total_orders_change,
                "monthly_profits": monthly_profits,
                "monthly_profits_change": monthly_profits_change
            }
        }
    except Exception as e:
        print(f"Error in get_performance_stats: {e}")
        import traceback
        traceback.print_exc()
        return {
            "success": False,
            "error": str(e),
            "stats": {
                "performance_rate": 0,
                "performance_change": 0,
                "today_orders": 0,
                "today_orders_change": 0,
                "total_orders": 0,
                "total_orders_change": 0,
                "monthly_profits": 0.0,
                "monthly_profits_change": 0.0
            }
        }

@router.get("/dashboard/top-products")
async def get_top_products(db: Session = Depends(get_db)):
    """Get top selling products"""
    try:
        from sqlalchemy import func
        from datetime import datetime, timedelta
        
        thirty_days_ago = datetime.now() - timedelta(days=30)
        
        top_items = db.query(
            OrderItem.product_name,
            func.sum(OrderItem.quantity).label('total_sold'),
            func.sum(OrderItem.total_price).label('total_revenue')
        ).join(Order).filter(
            Order.created_at >= thirty_days_ago,
            Order.status == 'completed'
        ).group_by(OrderItem.product_name).order_by(
            func.sum(OrderItem.quantity).desc()
        ).limit(5).all()
        
        products = []
        for item in top_items:
            products.append({
                "id": hash(item.product_name),  # Generate ID from name
                "name": item.product_name,
                "sold": int(item.total_sold),
                "revenue": float(item.total_revenue) if item.total_revenue else 0
            })
        
        return {
            "success": True,
            "products": products
        }
    except Exception as e:
        print(f"Error fetching top products: {e}")
        return {
            "success": True,
            "products": []
        }

@router.get("/dashboard/top-services")
async def get_top_services(db: Session = Depends(get_db)):
    """Get top ordered services"""
    try:
        from sqlalchemy import func
        from datetime import datetime, timedelta
        
        thirty_days_ago = datetime.now() - timedelta(days=30)
        
        # Get services ordered by count of orders
        top_services = db.query(
            Order.shop_name,
            func.count(Order.id).label('total_orders'),
            func.sum(Order.final_amount).label('total_revenue')
        ).filter(
            Order.created_at >= thirty_days_ago,
            Order.status == 'completed',
            Order.shop_name.isnot(None),
            Order.shop_name != ''
        ).group_by(Order.shop_name).order_by(
            func.count(Order.id).desc()
        ).limit(5).all()
        
        services = []
        for svc in top_services:
            services.append({
                "name": svc.shop_name,
                "orders": int(svc.total_orders),
                "revenue": float(svc.total_revenue) if svc.total_revenue else 0
            })
        
        return {
            "success": True,
            "services": services
        }
    except Exception as e:
        print(f"Error fetching top services: {e}")
        import traceback
        traceback.print_exc()
        return {
            "success": True,
            "services": []
        }

@router.get("/dashboard/sales-overview")
async def get_sales_overview(period: str = "month", db: Session = Depends(get_db)):
    """Get sales overview for charts"""
    try:
        from sqlalchemy import func, extract
        from datetime import datetime, timedelta
        
        if period == "week":
            days = 7
            start_date = datetime.now() - timedelta(days=days)
            query = db.query(
                func.date(Order.created_at).label('date'),
                func.sum(Order.final_amount).label('total')
            ).filter(
                Order.created_at >= start_date,
                Order.status == 'completed'
            ).group_by(func.date(Order.created_at)).order_by('date').all()
        elif period == "month":
            days = 30
            start_date = datetime.now() - timedelta(days=days)
            query = db.query(
                func.date(Order.created_at).label('date'),
                func.sum(Order.final_amount).label('total')
            ).filter(
                Order.created_at >= start_date,
                Order.status == 'completed'
            ).group_by(func.date(Order.created_at)).order_by('date').all()
        else:  # year
            days = 365
            start_date = datetime.now() - timedelta(days=days)
            query = db.query(
                extract('month', Order.created_at).label('month'),
                func.sum(Order.final_amount).label('total')
            ).filter(
                Order.created_at >= start_date,
                Order.status == 'completed'
            ).group_by(extract('month', Order.created_at)).order_by('month').all()
        
        data = []
        for row in query:
            if period == "year":
                data.append({
                    "label": f"شهر {int(row.month)}",
                    "value": float(row.total) if row.total else 0
                })
            else:
                date_str = row.date.isoformat() if hasattr(row.date, 'isoformat') else str(row.date)
                data.append({
                    "label": date_str,
                    "value": float(row.total) if row.total else 0
                })
        
        return {
            "success": True,
            "period": period,
            "data": data
        }
    except Exception as e:
        print(f"Error fetching sales overview: {e}")
        import traceback
        traceback.print_exc()
        return {
            "success": True,
            "period": period,
            "data": []
        }

@router.get("/dashboard/recent-orders")
async def get_recent_orders(limit: int = 10, db: Session = Depends(get_db)):
    """Get recent orders for dashboard"""
    try:
        from datetime import datetime
        
        orders = db.query(Order).order_by(Order.created_at.desc()).limit(limit).all()
        
        recent_orders = []
        for order in orders:
            try:
                customer_name = order.customer_name or "عميل"
            except:
                customer_name = "عميل"
            
            try:
                final_amount = float(order.final_amount) if order.final_amount else 0
            except:
                final_amount = 0
            
            # Format time
            created_at = order.created_at if order.created_at else datetime.now()
            time_str = created_at.strftime('%I:%M %p') if isinstance(created_at, datetime) else 'الآن'
            
            recent_orders.append({
                "id": order.id,
                "order_number": getattr(order, 'order_number', f'#{order.id}'),
                "customer": customer_name,
                "amount": final_amount,
                "status": getattr(order, 'status', 'pending'),
                "time": time_str,
                "created_at": created_at.isoformat() if isinstance(created_at, datetime) else None
            })
        
        return {
            "success": True,
            "orders": recent_orders
        }
    except Exception as e:
        print(f"Error fetching recent orders: {e}")
        import traceback
        traceback.print_exc()
        return {
            "success": True,
            "orders": []
        }

@router.get("/customers")
async def get_all_customers(db: Session = Depends(get_db)):
    """Get all customers with aggregated statistics"""
    try:
        from sqlalchemy import func
        from datetime import datetime
        
        # Group orders by customer phone to get statistics
        customer_stats = db.query(
            Order.customer_phone,
            func.max(Order.customer_name).label('name'),
            func.count(Order.id).label('total_orders'),
            func.sum(Order.final_amount).label('total_spent'),
            func.max(Order.created_at).label('last_order_date')
        ).filter(
            Order.customer_phone.isnot(None),
            Order.customer_phone != ''
        ).group_by(Order.customer_phone).order_by(func.count(Order.id).desc()).all()
        
        customers = []
        for stat in customer_stats:
            customers.append({
                "phone": stat.customer_phone,
                "name": stat.name or "عميل",
                "total_orders": int(stat.total_orders),
                "total_spent": float(stat.total_spent) if stat.total_spent else 0.0,
                "last_order_date": stat.last_order_date.isoformat() if stat.last_order_date else None
            })
        
        return {
            "success": True,
            "customers": customers
        }
    except Exception as e:
        print(f"Error fetching customers: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"خطأ في جلب العملاء: {str(e)}")

@router.get("/customers/{phone}")
async def get_customer_details(phone: str, db: Session = Depends(get_db)):
    """Get customer details including all orders"""
    try:
        from sqlalchemy import func
        from models import OrderItem
        
        # Get customer info from orders
        orders = db.query(Order).filter(
            Order.customer_phone == phone
        ).order_by(Order.created_at.desc()).all()
        
        if not orders:
            raise HTTPException(status_code=404, detail="العميل غير موجود")
        
        # Get aggregated stats
        stats = db.query(
            func.max(Order.customer_name).label('name'),
            func.max(Order.customer_whatsapp).label('whatsapp'),
            func.count(Order.id).label('total_orders'),
            func.sum(Order.final_amount).label('total_spent')
        ).filter(
            Order.customer_phone == phone
        ).first()
        
        # Get staff notes (from first order or create new)
        staff_notes = orders[0].staff_notes if hasattr(orders[0], 'staff_notes') else None
        
        # Get orders with items
        orders_list = []
        for order in orders:
            items = db.query(OrderItem).filter(OrderItem.order_id == order.id).all()
            orders_list.append({
                "id": order.id,
                "order_number": getattr(order, 'order_number', f'#{order.id}'),
                "shop_name": getattr(order, 'shop_name', None),
                "status": getattr(order, 'status', 'pending'),
                "final_amount": float(order.final_amount) if order.final_amount else 0,
                "created_at": order.created_at.isoformat() if order.created_at else None,
                "delivery_type": getattr(order, 'delivery_type', 'self'),
                "delivery_address": getattr(order, 'delivery_address', None),
                "delivery_latitude": float(order.delivery_latitude) if hasattr(order, 'delivery_latitude') and order.delivery_latitude is not None else None,
                "delivery_longitude": float(order.delivery_longitude) if hasattr(order, 'delivery_longitude') and order.delivery_longitude is not None else None,
                "items": [
                    {
                        "product_name": item.product_name,
                        "quantity": item.quantity
                    } for item in items
                ]
            })
        
        return {
            "success": True,
            "customer": {
                "phone": phone,
                "name": stats.name or "عميل",
                "whatsapp": stats.whatsapp,
                "total_orders": int(stats.total_orders),
                "total_spent": float(stats.total_spent) if stats.total_spent else 0.0,
                "orders": orders_list,
                "staff_notes": staff_notes
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching customer details: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"خطأ في جلب تفاصيل العميل: {str(e)}")

@router.put("/customers/{phone}/notes")
async def update_customer_notes(phone: str, data: CustomerNotesUpdate, db: Session = Depends(get_db)):
    """Update staff notes for a customer (update all orders with same phone)"""
    try:
        # Update staff_notes for all orders of this customer
        orders = db.query(Order).filter(Order.customer_phone == phone).all()
        
        if not orders:
            raise HTTPException(status_code=404, detail="العميل غير موجود")
        
        for order in orders:
            order.staff_notes = data.notes
        
        db.commit()
        
        return {
            "success": True,
            "message": "تم حفظ الملاحظات بنجاح"
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Error updating customer notes: {e}")
        raise HTTPException(status_code=500, detail=f"خطأ في حفظ الملاحظات: {str(e)}")

@router.post("/maintenance/normalize-images")
async def normalize_image_urls(db: Session = Depends(get_db)):
    """Normalize image URLs in DB to absolute public URLs for products, services, and portfolio works.
    Safe against missing optional columns like images in portfolio_works.
    """
    try:
        from sqlalchemy import text
        updated_counts = {"products": 0, "services": 0, "portfolio_works": 0}

        # Helper to check column existence
        def column_exists(table: str, column: str) -> bool:
            q = text(
                """
                SELECT 1 FROM information_schema.columns
                WHERE table_name = :t AND column_name = :c
                """
            )
            res = db.execute(q, {"t": table, "c": column}).fetchone()
            return bool(res)

        has_products_images = column_exists("products", "images")
        has_pw_images = column_exists("portfolio_works", "images")

        # Products
        rows = db.execute(text("SELECT id, image_url{} FROM products".format(
            ", images" if has_products_images else ""
        ))).fetchall()
        for r in rows:
            pid = r[0]
            img_before = r[1] if len(r) > 1 else None
            images_before = r[2] if (has_products_images and len(r) > 2) else None
            changed = False
            img_after = _normalize_to_absolute(img_before) if img_before else img_before
            if img_before and img_after and img_after != img_before:
                db.execute(text("UPDATE products SET image_url=:u WHERE id=:id"), {"u": img_after, "id": pid})
                changed = True
            if has_products_images and isinstance(images_before, list) and images_before:
                normalized = [_normalize_to_absolute(u) if u else u for u in images_before]
                if normalized != images_before:
                    db.execute(text("UPDATE products SET images=:arr WHERE id=:id"), {"arr": normalized, "id": pid})
                    changed = True
            if changed:
                updated_counts["products"] += 1

        # Services
        rows = db.execute(text("SELECT id, image_url FROM services")).fetchall()
        for r in rows:
            sid, img_before = r[0], r[1]
            if img_before:
                img_after = _normalize_to_absolute(img_before)
                if img_after != img_before:
                    db.execute(text("UPDATE services SET image_url=:u WHERE id=:id"), {"u": img_after, "id": sid})
                    updated_counts["services"] += 1

        # Portfolio works
        rows = db.execute(text("SELECT id, image_url{} FROM portfolio_works".format(
            ", images" if has_pw_images else ""
        ))).fetchall()
        for r in rows:
            wid = r[0]
            img_before = r[1] if len(r) > 1 else None
            images_before = r[2] if (has_pw_images and len(r) > 2) else None
            changed = False
            img_after = _normalize_to_absolute(img_before) if img_before else img_before
            if img_before and img_after and img_after != img_before:
                db.execute(text("UPDATE portfolio_works SET image_url=:u WHERE id=:id"), {"u": img_after, "id": wid})
                changed = True
            if has_pw_images and isinstance(images_before, list) and images_before:
                normalized = [_normalize_to_absolute(u) if u else u for u in images_before]
                if normalized != images_before:
                    db.execute(text("UPDATE portfolio_works SET images=:arr WHERE id=:id"), {"arr": normalized, "id": wid})
                    changed = True
            if changed:
                updated_counts["portfolio_works"] += 1

        db.commit()
        return {"success": True, "updated": updated_counts, "base_url": _get_public_base_url()}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Normalization failed: {str(e)}")

@router.post("/maintenance/ensure-portfolio-images-column")
async def ensure_portfolio_images_column(db: Session = Depends(get_db)):
    """Ensure portfolio_works has an images TEXT[] column to store multiple image URLs."""
    try:
        from sqlalchemy import text
        db.execute(text(
            """
            DO $$
            BEGIN
              IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name='portfolio_works' AND column_name='images'
              ) THEN
                ALTER TABLE portfolio_works ADD COLUMN images TEXT[] DEFAULT ARRAY[]::TEXT[];
              END IF;
            END $$;
            """
        ))
        db.commit()
        return {"success": True}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

# ============================================
# Payment Settings Management Endpoints
# ============================================

def ensure_payment_settings_table(db: Session):
    """Ensure payment_settings table exists."""
    try:
        from models import PaymentSettings
        PaymentSettings.__table__.create(bind=db.bind, checkfirst=True)
    except Exception as exc:
        print(f"⚠️ Unable to ensure payment_settings table: {exc}")

@router.get("/payment-settings")
async def get_payment_settings_admin(db: Session = Depends(get_db)):
    """Get payment settings (admin view with full details)"""
    try:
        from models import PaymentSettings
        ensure_payment_settings_table(db)
        settings = db.query(PaymentSettings).filter(
            PaymentSettings.payment_method == "sham_cash"
        ).first()
        
        if not settings:
            return {
                "success": True,
                "settings": None,
                "message": "لم يتم إعداد الدفع بعد"
            }
        
        return {
            "success": True,
            "settings": {
                "id": settings.id,
                "payment_method": settings.payment_method,
                "account_name": settings.account_name,
                "account_number": settings.account_number,
                "phone_number": settings.phone_number,
                # لا نرسل api_key و api_secret لأسباب أمنية - محمية بكلمة مرور
                "api_key": "***" if settings.api_key else None,
                "api_secret": "***" if settings.api_secret else None,
                "is_active": settings.is_active,
                "created_at": settings.created_at.isoformat() if settings.created_at else None,
                "updated_at": settings.updated_at.isoformat() if settings.updated_at else None
            }
        }
    except Exception as e:
        print(f"Error fetching payment settings: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"خطأ في جلب إعدادات الدفع: {str(e)}")

@router.post("/payment-settings")
async def create_payment_settings_admin(settings_data: dict, db: Session = Depends(get_db)):
    """Create payment settings (admin)"""
    try:
        from models import PaymentSettings
        ensure_payment_settings_table(db)
        
        # التحقق من وجود إعدادات أخرى
        existing = db.query(PaymentSettings).filter(
            PaymentSettings.payment_method == settings_data.get("payment_method", "sham_cash")
        ).first()
        
        if existing:
            raise HTTPException(
                status_code=400,
                detail="توجد إعدادات موجودة بالفعل. يرجى تحديث الإعدادات الموجودة."
            )
        
        new_settings = PaymentSettings(
            payment_method=settings_data.get("payment_method", "sham_cash"),
            account_name=settings_data.get("account_name", ""),
            account_number=settings_data.get("account_number", ""),
            phone_number=settings_data.get("phone_number"),
            api_key=settings_data.get("api_key"),
            api_secret=settings_data.get("api_secret"),
            is_active=settings_data.get("is_active", True)
        )
        
        db.add(new_settings)
        db.commit()
        db.refresh(new_settings)
        
        return {
            "success": True,
            "settings": {
                "id": new_settings.id,
                "payment_method": new_settings.payment_method,
                "account_name": new_settings.account_name,
                "account_number": new_settings.account_number,
                "phone_number": new_settings.phone_number,
                "is_active": new_settings.is_active
            },
            "message": "تم إعداد الدفع بنجاح"
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Error creating payment settings: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"خطأ في إعداد الدفع: {str(e)}")

@router.put("/payment-settings/{settings_id}")
async def update_payment_settings_admin(settings_id: int, settings_data: dict, db: Session = Depends(get_db)):
    """Update payment settings (admin)"""
    try:
        from models import PaymentSettings
        ensure_payment_settings_table(db)
        
        settings = db.query(PaymentSettings).filter(
            PaymentSettings.id == settings_id
        ).first()
        
        if not settings:
            raise HTTPException(
                status_code=404,
                detail="إعدادات الدفع غير موجودة"
            )
        
        update_data = settings_data
        for key, value in update_data.items():
            if hasattr(settings, key):
                setattr(settings, key, value)
        
        db.commit()
        db.refresh(settings)
        
        return {
            "success": True,
            "settings": {
                "id": settings.id,
                "payment_method": settings.payment_method,
                "account_name": settings.account_name,
                "account_number": settings.account_number,
                "phone_number": settings.phone_number,
                "is_active": settings.is_active
            },
            "message": "تم تحديث إعدادات الدفع بنجاح"
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Error updating payment settings: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"خطأ في تحديث إعدادات الدفع: {str(e)}")

# ============================================
# Installment Payment Management
# ============================================

@router.put("/orders/{order_id}/payment")
async def update_order_payment(
    order_id: int,
    payment_data: dict,
    db: Session = Depends(get_db)
):
    """تحديث حالة الدفع للطلب (نظام التقسيط)"""
    try:
        from sqlalchemy import text
        
        order = db.query(Order).filter(Order.id == order_id).first()
        if not order:
            raise HTTPException(status_code=404, detail="الطلب غير موجود")
        
        paid_amount = float(payment_data.get("paid_amount", 0))
        final_amount = float(order.final_amount)
        
        # التأكد من أن المبلغ المدفوع لا يتجاوز المبلغ النهائي
        if paid_amount > final_amount:
            raise HTTPException(
                status_code=400,
                detail=f"المبلغ المدفوع ({paid_amount}) لا يمكن أن يتجاوز المبلغ النهائي ({final_amount})"
            )
        
        remaining_amount = final_amount - paid_amount
        
        # تحديث حالة الدفع بناءً على المبلغ المدفوع
        if paid_amount == 0:
            payment_status = "pending"
        elif paid_amount < final_amount:
            payment_status = "partial"
        else:
            payment_status = "paid"
        
        # التحقق من وجود الأعمدة
        from sqlalchemy import inspect
        inspector = inspect(db.bind)
        columns = [col['name'] for col in inspector.get_columns('orders')]
        
        updates = []
        params = {"id": order_id, "paid": paid_amount, "remaining": remaining_amount, "status": payment_status}
        
        if 'paid_amount' in columns:
            updates.append("paid_amount = :paid")
        else:
            db.execute(text("ALTER TABLE orders ADD COLUMN paid_amount DECIMAL(12, 2) DEFAULT 0"))
            db.commit()
            updates.append("paid_amount = :paid")
        
        if 'remaining_amount' in columns:
            updates.append("remaining_amount = :remaining")
        else:
            db.execute(text("ALTER TABLE orders ADD COLUMN remaining_amount DECIMAL(12, 2) DEFAULT 0"))
            db.commit()
            updates.append("remaining_amount = :remaining")
        
        updates.append("payment_status = :status")
        
        if updates:
            update_query = text(f"UPDATE orders SET {', '.join(updates)} WHERE id = :id")
            db.execute(update_query, params)
        
        db.commit()
        db.refresh(order)
        
        return {
            "success": True,
            "order": {
                "id": order.id,
                "order_number": getattr(order, 'order_number', None),
                "final_amount": float(final_amount),
                "paid_amount": paid_amount,
                "remaining_amount": remaining_amount,
                "payment_status": payment_status
            },
            "message": f"تم تحديث حالة الدفع: المدفوع {paid_amount}، المتبقي {remaining_amount}"
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Error updating order payment: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"خطأ في تحديث حالة الدفع: {str(e)}")
