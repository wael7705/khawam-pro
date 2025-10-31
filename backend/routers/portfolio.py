from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import PortfolioWork
from sqlalchemy import text

router = APIRouter()

@router.get("/")
async def get_portfolio_works(db: Session = Depends(get_db)):
    try:
        # استخدام raw SQL لتجنب مشكلة العمود images إذا لم يكن موجوداً
        query = text("""
            SELECT 
                id, title, title_ar, description, description_ar,
                image_url, category, category_ar, is_featured, is_visible, display_order
            FROM portfolio_works 
            WHERE is_visible = true 
            ORDER BY display_order
        """)
        result = db.execute(query)
        rows = result.fetchall()
        
        works_list = []
        for row in rows:
            # استخدام الصورة الرئيسية فقط (image_url) لتجنب التضارب
            image_url = row.image_url or ""
            # إذا كانت مسار نسبي (مثل /images/... أو /uploads/... بدون http)، نُرجع "" لتجنب 404
            if image_url and not image_url.startswith('data:') and not image_url.startswith('http'):
                image_url = ""
            
            works_list.append({
                "id": row.id,
                "title_ar": row.title_ar or "",
                "title": row.title or row.title_ar or "",
                "title_en": row.title or "",
                "description_ar": row.description_ar or "",
                "description_en": row.description or "",
                "description": row.description or "",
                "image_url": image_url,  # base64 أو http فقط
                "images": [],  # إزالة الصور الثانوية لتجنب التضارب
                "category_ar": row.category_ar or "",
                "category_en": row.category or "",
                "category": row.category or row.category_ar or "",
                "is_featured": row.is_featured if hasattr(row, 'is_featured') else False,
                "is_visible": True
            })
        return works_list
    except Exception as e:
        print(f"Error fetching portfolio works: {e}")
        import traceback
        traceback.print_exc()
        return []

@router.get("/featured")
async def get_featured_works(db: Session = Depends(get_db)):
    try:
        # استخدام raw SQL لتجنب مشكلة العمود images
        query = text("""
            SELECT 
                id, title, title_ar, description, description_ar,
                image_url, category, category_ar, is_featured, is_visible, display_order
            FROM portfolio_works 
            WHERE is_visible = true AND is_featured = true 
            ORDER BY display_order
        """)
        result = db.execute(query)
        rows = result.fetchall()
        
        works_list = []
        for row in rows:
            # استخدام الصورة الرئيسية فقط (image_url) لتجنب التضارب
            image_url = row.image_url or ""
            # إذا كانت مسار نسبي (مثل /images/... أو /uploads/... بدون http)، نُرجع "" لتجنب 404
            if image_url and not image_url.startswith('data:') and not image_url.startswith('http'):
                image_url = ""
            
            works_list.append({
                "id": row.id,
                "title_ar": row.title_ar or "",
                "title": row.title or row.title_ar or "",
                "title_en": row.title or "",
                "description_ar": row.description_ar or "",
                "description_en": row.description or "",
                "description": row.description or "",
                "image_url": image_url,  # base64 أو http فقط
                "images": [],  # إزالة الصور الثانوية لتجنب التضارب
                "category_ar": row.category_ar or "",
                "category_en": row.category or "",
                "category": row.category or row.category_ar or "",
                "is_featured": True
            })
        return works_list
    except Exception as e:
        print(f"Error fetching featured works: {e}")
        import traceback
        traceback.print_exc()
        return []

@router.get("/{work_id}")
async def get_work_by_id(work_id: int, db: Session = Depends(get_db)):
    """الحصول على تفاصيل عمل محدد"""
    try:
        query = text("""
            SELECT 
                id, title, title_ar, description, description_ar,
                image_url, category, category_ar, is_featured, is_visible, created_at
            FROM portfolio_works 
            WHERE id = :work_id AND is_visible = true
        """)
        result = db.execute(query, {"work_id": work_id})
        row = result.fetchone()
        
        if not row:
            return {"error": "Work not found"}
        
        # استخدام الصورة الرئيسية فقط (image_url) لتجنب التضارب
        image_url = row.image_url or ""
        # إذا كانت مسار نسبي (مثل /images/... أو /uploads/... بدون http)، نُرجع "" لتجنب 404
        if image_url and not image_url.startswith('data:') and not image_url.startswith('http'):
            image_url = ""
        
        return {
            "id": row.id,
            "title_ar": row.title_ar or "",
            "title": row.title or row.title_ar or "",
            "title_en": row.title or "",
            "description_ar": row.description_ar or "",
            "description_en": row.description or "",
            "description": row.description or "",
            "image_url": image_url,  # base64 أو http فقط
            "images": [],  # إزالة الصور الثانوية لتجنب التضارب
            "category_ar": row.category_ar or "",
            "category_en": row.category or "",
            "category": row.category or row.category_ar or "",
            "is_featured": row.is_featured if hasattr(row, 'is_featured') else False,
            "is_visible": True,
            "created_at": row.created_at.isoformat() if row.created_at else None
        }
    except Exception as e:
        print(f"Error fetching work {work_id}: {e}")
        import traceback
        traceback.print_exc()
        return {"error": str(e)}
