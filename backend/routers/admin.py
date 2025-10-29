from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from database import get_db
from models import Product, Service, PortfolioWork, Order
from typing import Optional
from pydantic import BaseModel, Field, validator
from utils import handle_error, success_response, validate_price, validate_string
import os
import uuid

router = APIRouter()

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
            image_url=product.image_url,
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
            # التأكد من أن image_url يحتوي على المسار الكامل إذا كان نسبياً
            image_url = row.image_url or ""
            if image_url and not image_url.startswith('http') and not image_url.startswith('/'):
                image_url = f"/{image_url}" if image_url else ""
            
            works_list.append({
                "id": row.id,
                "title_ar": row.title_ar or "",
                "title": row.title or row.title_ar or "",
                "description_ar": row.description_ar or "",
                "image_url": image_url,
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
            image_url=work.image_url or "",
            images=work.images if work.images else [],  # الصور الثانوية
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
        existing_work = db.query(PortfolioWork).filter(PortfolioWork.id == work_id).first()
        if not existing_work:
            raise HTTPException(status_code=404, detail="Work not found")
        
        # تحديث الحقول يدوياً لضمان التوافق مع قاعدة البيانات
        if work.title_ar is not None:
            existing_work.title_ar = work.title_ar
        if work.title is not None:
            existing_work.title = work.title
        elif work.title_ar is not None:
            # إذا تم تحديث title_ar بدون title، استخدم title_ar كـ title
            existing_work.title = work.title_ar
        
        if work.description_ar is not None:
            existing_work.description = work.description_ar
            existing_work.description_ar = work.description_ar
        if work.image_url is not None:
            existing_work.image_url = work.image_url
        if work.images is not None:
            existing_work.images = work.images
        if work.category_ar is not None:
            existing_work.category = work.category_ar
            existing_work.category_ar = work.category_ar
        
        # الحقول الأخرى
        if hasattr(work, 'is_visible') and work.is_visible is not None:
            existing_work.is_visible = work.is_visible
        if hasattr(work, 'is_featured') and work.is_featured is not None:
            existing_work.is_featured = work.is_featured
        if hasattr(work, 'display_order') and work.display_order is not None:
            existing_work.display_order = work.display_order
        
        db.commit()
        db.refresh(existing_work)
        return {
            "success": True,
            "work": {
                "id": existing_work.id,
                "title_ar": existing_work.title_ar,
                "title": existing_work.title,
                "image_url": existing_work.image_url,
                "is_featured": existing_work.is_featured
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

# ============================================
# Orders Management Endpoints
# ============================================

@router.get("/orders/all")
async def get_all_orders(db: Session = Depends(get_db)):
    """Get all orders"""
    try:
        orders = db.query(Order).order_by(Order.created_at.desc()).all()
        orders_list = []
        for o in orders:
            orders_list.append({
                "id": o.id,
                "order_number": o.order_number,
                "status": o.status,
                "total": float(o.total) if o.total else 0,
                "created_at": o.created_at.isoformat() if o.created_at else None
            })
        return orders_list
    except Exception as e:
        print(f"Error: {e}")
        return []

@router.put("/orders/{order_id}/status")
async def update_order_status(order_id: int, status: str, db: Session = Depends(get_db)):
    """Update order status"""
    try:
        order = db.query(Order).filter(Order.id == order_id).first()
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        
        order.status = status
        db.commit()
        db.refresh(order)
        return {"success": True, "order": order}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

# ============================================
# Image Upload Endpoint
# ============================================

@router.post("/upload")
async def upload_image(file: UploadFile = File(...)):
    """Upload an image"""
    try:
        # Validate file type
        if not file.content_type or not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="File must be an image")
        
        upload_dir = "uploads/"
        os.makedirs(upload_dir, exist_ok=True)
        
        # Generate unique filename
        file_ext = os.path.splitext(file.filename)[1] or '.jpg'
        unique_filename = f"{uuid.uuid4()}{file_ext}"
        file_path = os.path.join(upload_dir, unique_filename)
        
        # Save file
        content = await file.read()
        with open(file_path, "wb") as buffer:
            buffer.write(content)
        
        # Return URL (relative path - will be served via StaticFiles)
        image_url = f"/uploads/{unique_filename}"
        return {
            "success": True,
            "url": image_url,
            "image_url": image_url,
            "filename": unique_filename
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"خطأ في رفع الصورة: {str(e)}")
