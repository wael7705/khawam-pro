from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import PortfolioWork

router = APIRouter()

@router.get("/")
async def get_portfolio_works(db: Session = Depends(get_db)):
    try:
        works = db.query(PortfolioWork).filter(
            PortfolioWork.is_visible == True
        ).order_by(PortfolioWork.display_order).all()
        works_list = []
        for w in works:
            works_list.append({
                "id": w.id,
                "title_ar": w.title_ar or "",
                "title": w.title or w.title_ar or "",
                "title_en": w.title or "",
                "description_ar": w.description_ar or "",
                "description_en": w.description or "",
                "description": w.description or "",
                "image_url": w.image_url or "",
                "images": w.images if hasattr(w, 'images') and w.images else [],
                "category_ar": w.category_ar or "",
                "category_en": w.category or "",
                "category": w.category or w.category_ar or "",
                "is_featured": w.is_featured if hasattr(w, 'is_featured') else False,
                "is_visible": w.is_visible if hasattr(w, 'is_visible') else True
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
        works = db.query(PortfolioWork).filter(
            PortfolioWork.is_visible == True,
            PortfolioWork.is_featured == True
        ).order_by(PortfolioWork.display_order).all()
        works_list = []
        for w in works:
            works_list.append({
                "id": w.id,
                "title_ar": w.title_ar or "",
                "title": w.title or w.title_ar or "",
                "title_en": w.title or "",
                "description_ar": w.description_ar or "",
                "description_en": w.description or "",
                "description": w.description or "",
                "image_url": w.image_url or "",
                "images": w.images if hasattr(w, 'images') and w.images else [],
                "category_ar": w.category_ar or "",
                "category_en": w.category or "",
                "category": w.category or w.category_ar or "",
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
        work = db.query(PortfolioWork).filter(
            PortfolioWork.id == work_id,
            PortfolioWork.is_visible == True
        ).first()
        
        if not work:
            return {"error": "Work not found"}
        
        return {
            "id": work.id,
            "title_ar": work.title_ar or "",
            "title": work.title or work.title_ar or "",
            "title_en": work.title or "",
            "description_ar": work.description_ar or "",
            "description_en": work.description or "",
            "description": work.description or "",
            "image_url": work.image_url or "",
            "images": work.images if hasattr(work, 'images') and work.images else [],
            "category_ar": work.category_ar or "",
            "category_en": work.category or "",
            "category": work.category or work.category_ar or "",
            "is_featured": work.is_featured if hasattr(work, 'is_featured') else False,
            "is_visible": work.is_visible if hasattr(work, 'is_visible') else True,
            "created_at": work.created_at.isoformat() if work.created_at else None
        }
    except Exception as e:
        print(f"Error fetching work {work_id}: {e}")
        import traceback
        traceback.print_exc()
        return {"error": str(e)}