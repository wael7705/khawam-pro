from fastapi import APIRouter, HTTPException, Query, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import Product
import os
router = APIRouter()

@router.get("/")
async def get_products(
    featured: bool = Query(None),
    category_id: int = Query(None),
    db: Session = Depends(get_db)
):
    try:
        query = db.query(Product).filter(Product.is_visible == True)
        
        if featured is not None:
            query = query.filter(Product.is_featured == featured)
        if category_id:
            query = query.filter(Product.category_id == category_id)
        
        products = query.order_by(Product.display_order).all()
        # تحويل إلى list للتحقق
        products_list = []
        for p in products:
            # اختر صورة مناسبة: image_url أو أول صورة من images
            img = p.image_url or (p.images[0] if isinstance(p.images, list) and p.images else "")
            # تطبيع الرابط إلى رابط مطلق:
            # - إذا http/https: اتركه كما هو
            # - إذا اسم ملف فقط أو مسار نسبي: حوّله إلى رابط مطلق
            if img and not str(img).startswith('http'):
                # إذا اسم ملف فقط بدون مسار
                if '/' not in str(img):
                    img = f"/uploads/{img}"
                elif not str(img).startswith('/'):
                    img = f"/{img}"
                # الآن img إما مسار نسبي يبدأ بـ / أو رابط http
                # إذا كان مسار نسبي، حوّله إلى رابط مطلق
                if img.startswith('/') and not img.startswith('http'):
                    # تحقق من وجود الملف فعلياً على الخادم
                    # إذا كان المسار /uploads/filename، افحص uploads/filename
                    local_path = None
                    if img.startswith('/uploads/'):
                        local_path = img[1:]  # إزالة / الأولى
                    elif img.startswith('/'):
                        local_path = img[1:]
                    
                    if local_path and os.path.exists(local_path):
                        # الملف موجود، حوّله إلى رابط مطلق
                        from routers.admin import _get_public_base_url
                        base = _get_public_base_url()
                        img = f"{base}{img}"
                    else:
                        # الملف غير موجود، لا نرجّع رابطاً له
                        img = ""
                elif img.startswith('http'):
                    # رابط خارجي، اتركه كما هو
                    pass
            products_list.append({
                "id": p.id,
                "name_ar": p.name_ar,
                "name": p.name,
                "price": float(p.price) if p.price else 0,
                "image_url": img or ""
            })
        return products_list
    except Exception as e:
        print(f"Error: {e}")
        return []

@router.get("/{product_id}")
async def get_product(product_id: int, db: Session = Depends(get_db)):
    try:
        product = db.query(Product).filter(Product.id == product_id).first()
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        return product
    except:
        raise HTTPException(status_code=404, detail="Product not found")