from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from database import get_db
from models import Product, Service, PortfolioWork, Order, OrderItem
from typing import Optional
from pydantic import BaseModel, Field, validator
from utils import handle_error, success_response, validate_price, validate_string
import os
import uuid
import requests

router = APIRouter()

# Pydantic models
class StaffNotesUpdate(BaseModel):
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
        return {"success": True, "service": existing_service}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/services/{service_id}")
async def delete_service(service_id: int, db: Session = Depends(get_db)):
    """Delete a service"""
    try:
        service = db.query(Service).filter(Service.id == service_id).first()
        if not service:
            raise HTTPException(status_code=404, detail="Service not found")
        
        db.delete(service)
        db.commit()
        return {"success": True, "message": "Service deleted"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

# ============================================
# Portfolio Works Management Endpoints
# ============================================

@router.get("/works/all")
async def get_all_works(db: Session = Depends(get_db)):
    """Get all portfolio works (admin view)"""
    try:
        # استخدام raw SQL لتجنب مشكلة العمود images إذا لم يكن موجوداً
        from sqlalchemy import text
        query = text("""
            SELECT 
                id, title, title_ar, description, description_ar,
                image_url, category, category_ar, is_featured, is_visible, display_order
            FROM portfolio_works 
            ORDER BY display_order
        """)
        result = db.execute(query)
        rows = result.fetchall()
        
        works_list = []
        for row in rows:
            # إرجاع image_url من قاعدة البيانات كما هو (base64 أو رابط مطلق)
            # إذا كانت مسار نسبي (مثل /images/... أو /uploads/... بدون http)، نُرجع "" لتجنب 404
            image_url = row.image_url or ""
            if image_url and not image_url.startswith('data:') and not image_url.startswith('http'):
                # مسار نسبي غير موجود على الخادم - تجاهله
                image_url = ""

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
    """Get all orders"""
    try:
        # Query orders directly
        orders = db.query(Order).order_by(Order.created_at.desc()).all()
        print(f"Found {len(orders)} orders in database")
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
                "payment_status": getattr(o, 'payment_status', 'pending'),
                "delivery_address": getattr(o, 'delivery_address', None),
                "notes": getattr(o, 'notes', None),
                "staff_notes": staff_notes,
                "created_at": o.created_at.isoformat() if o.created_at else None,
                "image_url": image_url
            })
        return orders_list
    except Exception as e:
        print(f"Error fetching orders: {e}")
        import traceback
        traceback.print_exc()
        return []

@router.get("/orders/{order_id}")
async def get_order_details(order_id: int, db: Session = Depends(get_db)):
    """Get order details with items"""
    try:
        order = db.query(Order).filter(Order.id == order_id).first()
        if not order:
            raise HTTPException(status_code=404, detail="الطلب غير موجود")
        
        items = db.query(OrderItem).filter(OrderItem.order_id == order_id).all()
        
        # Safely get customer info
        customer_name = ""
        customer_phone = ""
        customer_whatsapp = ""
        shop_name = ""
        delivery_type = "self"
        staff_notes = None
        
        try:
            customer_name = order.customer_name or ""
        except:
            pass
        try:
            customer_phone = order.customer_phone or ""
        except:
            pass
        try:
            customer_whatsapp = order.customer_whatsapp or order.customer_phone or ""
        except:
            customer_whatsapp = customer_phone
        try:
            shop_name = order.shop_name or ""
        except:
            pass
        try:
            delivery_type = order.delivery_type or "self"
        except:
            pass
        try:
            staff_notes = order.staff_notes
        except:
            pass
        
        return {
            "success": True,
            "order": {
                "id": order.id,
                "order_number": getattr(order, 'order_number', None),
                "customer_name": customer_name,
                "customer_phone": customer_phone,
                "customer_whatsapp": customer_whatsapp,
                "shop_name": shop_name,
                "status": getattr(order, 'status', 'pending'),
                "delivery_type": delivery_type,
                "total_amount": float(order.total_amount) if order.total_amount is not None else 0,
                "final_amount": float(order.final_amount) if order.final_amount is not None else 0,
                "payment_status": getattr(order, 'payment_status', 'pending'),
                "delivery_address": getattr(order, 'delivery_address', None),
                "notes": getattr(order, 'notes', None),
                "staff_notes": staff_notes,
                "created_at": order.created_at.isoformat() if order.created_at else None,
                "items": [
                    {
                        "id": item.id,
                        "product_name": item.product_name,
                        "quantity": item.quantity,
                        "unit_price": float(item.unit_price) if item.unit_price else 0,
                        "total_price": float(item.total_price) if item.total_price else 0,
                        "specifications": item.specifications,
                        "design_files": item.design_files or [],
                        "status": item.status
                    }
                    for item in items
                ]
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
async def update_order_status(order_id: int, status: str = None, db: Session = Depends(get_db)):
    """Update order status"""
    try:
        from fastapi import Query
        # Get status from query parameter
        if status is None:
            status = Query(..., description="Order status")
        
        # Validate status
        valid_statuses = ['pending', 'accepted', 'preparing', 'shipping', 'awaiting_pickup', 'completed', 'cancelled', 'rejected']
        if status not in valid_statuses:
            raise HTTPException(status_code=400, detail=f"حالة غير صحيحة. الحالات المتاحة: {', '.join(valid_statuses)}")
        
        order = db.query(Order).filter(Order.id == order_id).first()
        if not order:
            raise HTTPException(status_code=404, detail="الطلب غير موجود")
        
        order.status = status
        db.commit()
        db.refresh(order)
        
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

@router.post("/maintenance/add-order-columns")
async def add_order_columns(db: Session = Depends(get_db)):
    """Add new columns to orders table if they don't exist"""
    try:
        from sqlalchemy import text
        
        columns_to_add = [
            ("customer_name", "VARCHAR(100)"),
            ("customer_phone", "VARCHAR(20)"),
            ("customer_whatsapp", "VARCHAR(20)"),
            ("shop_name", "VARCHAR(200)"),
            ("delivery_type", "VARCHAR(20) DEFAULT 'self'"),
            ("staff_notes", "TEXT"),
        ]
        
        added_columns = []
        for column_name, column_type in columns_to_add:
            try:
                # Check if column exists using raw SQL
                check_query = text(f"""
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name='orders' AND column_name='{column_name}'
                """)
                result = db.execute(check_query).fetchone()
                
                if not result:
                    # Column doesn't exist, add it
                    alter_query = text(f"ALTER TABLE orders ADD COLUMN {column_name} {column_type}")
                    db.execute(alter_query)
                    added_columns.append(column_name)
                    print(f"✅ Added column: {column_name}")
                else:
                    print(f"ℹ️ Column {column_name} already exists")
            except Exception as e:
                print(f"⚠️ Error adding column {column_name}: {e}")
                continue
        
        db.commit()
        return {
            "success": True,
            "added_columns": added_columns,
            "message": f"تم إضافة {len(added_columns)} عمود جديد"
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
