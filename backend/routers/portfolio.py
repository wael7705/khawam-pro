from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import PortfolioWork

router = APIRouter()

@router.get("/")
async def get_portfolio_works(db: Session = Depends(get_db)):
    try:
        works = db.query(PortfolioWork).filter(
            PortfolioWork.is_visible == True,
            PortfolioWork.is_active == True
        ).order_by(PortfolioWork.display_order).all()
        works_list = []
        for w in works:
            works_list.append({
                "id": w.id,
                "title_ar": w.title_ar or "",
                "title": w.title_en or w.title_ar or "",
                "title_en": w.title_en or "",
                "description_ar": w.description_ar or "",
                "description_en": w.description_en or "",
                "image_url": w.image_url or "",
                "category_ar": w.category_ar or "",
                "category_en": w.category_en or "",
                "category": w.category_ar or "",
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
            PortfolioWork.is_active == True,
            PortfolioWork.is_featured == True
        ).order_by(PortfolioWork.display_order).all()
        works_list = []
        for w in works:
            works_list.append({
                "id": w.id,
                "title_ar": w.title_ar or "",
                "title": w.title_en or w.title_ar or "",
                "title_en": w.title_en or "",
                "description_ar": w.description_ar or "",
                "description_en": w.description_en or "",
                "image_url": w.image_url or "",
                "category_ar": w.category_ar or "",
                "category_en": w.category_en or "",
                "category": w.category_ar or "",
                "is_featured": True
            })
        return works_list
    except Exception as e:
        print(f"Error fetching featured works: {e}")
        import traceback
        traceback.print_exc()
        return []