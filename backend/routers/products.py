from fastapi import APIRouter, HTTPException, Query, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import Product
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
            products_list.append({
                "id": p.id,
                "name_ar": p.name_ar,
                "name": p.name,
                "price": float(p.price) if p.price else 0,
                "image_url": p.image_url or ""
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