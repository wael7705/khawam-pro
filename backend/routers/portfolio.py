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
            # محاولة الحصول على images إذا كان العمود موجوداً
            images_value = []
            try:
                images_query = text("""
                    SELECT images FROM portfolio_works WHERE id = :work_id
                """)
                img_result = db.execute(images_query, {"work_id": row.id})
                img_row = img_result.fetchone()
                if img_row and img_row[0] is not None:
                    images_value = img_row[0] if isinstance(img_row[0], list) else []
            except Exception:
                # إذا كان العمود غير موجود، تجاهل الخطأ
                pass
            
            # التأكد من أن image_url يحتوي على المسار الكامل
            image_url = row.image_url or ""
            # Normalize to a publicly served path
            if image_url:
                image_url = image_url.replace('\\', '/')
                if image_url.startswith('http'):
                    pass
                else:
                    # If it's just a bare filename (no slash), serve it from /uploads/
                    if '/' not in image_url:
                        image_url = f"/uploads/{image_url}"
                    else:
                        # Ensure it starts with slash
                        if not image_url.startswith('/'):
                            image_url = f"/{image_url}"
            
            works_list.append({
                "id": row.id,
                "title_ar": row.title_ar or "",
                "title": row.title or row.title_ar or "",
                "title_en": row.title or "",
                "description_ar": row.description_ar or "",
                "description_en": row.description or "",
                "description": row.description or "",
                "image_url": image_url,
                "images": images_value,
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
            # محاولة الحصول على images إذا كان العمود موجوداً
            images_value = []
            try:
                images_query = text("""
                    SELECT images FROM portfolio_works WHERE id = :work_id
                """)
                img_result = db.execute(images_query, {"work_id": row.id})
                img_row = img_result.fetchone()
                if img_row and img_row[0] is not None:
                    images_value = img_row[0] if isinstance(img_row[0], list) else []
            except Exception:
                pass
            
            # التأكد من أن image_url يحتوي على المسار الكامل
            image_url = row.image_url or ""
            if image_url:
                image_url = image_url.replace('\\', '/')
                if image_url.startswith('http'):
                    pass
                else:
                    if '/' not in image_url:
                        image_url = f"/uploads/{image_url}"
                    else:
                        if not image_url.startswith('/'):
                            image_url = f"/{image_url}"
            
            works_list.append({
                "id": row.id,
                "title_ar": row.title_ar or "",
                "title": row.title or row.title_ar or "",
                "title_en": row.title or "",
                "description_ar": row.description_ar or "",
                "description_en": row.description or "",
                "description": row.description or "",
                "image_url": image_url,
                "images": images_value,
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
        
        # محاولة الحصول على images
        images_value = []
        try:
            images_query = text("""
                SELECT images FROM portfolio_works WHERE id = :work_id
            """)
            img_result = db.execute(images_query, {"work_id": work_id})
            img_row = img_result.fetchone()
            if img_row and img_row[0] is not None:
                images_value = img_row[0] if isinstance(img_row[0], list) else []
        except Exception:
            pass
        
        # التأكد من أن image_url يحتوي على المسار الكامل
        image_url = row.image_url or ""
        if image_url:
            image_url = image_url.replace('\\', '/')
            if image_url.startswith('http'):
                pass
            else:
                if '/' not in image_url:
                    image_url = f"/uploads/{image_url}"
                else:
                    if not image_url.startswith('/'):
                        image_url = f"/{image_url}"
        
        return {
            "id": row.id,
            "title_ar": row.title_ar or "",
            "title": row.title or row.title_ar or "",
            "title_en": row.title or "",
            "description_ar": row.description_ar or "",
            "description_en": row.description or "",
            "description": row.description or "",
            "image_url": image_url,
            "images": images_value,
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
