from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import PortfolioWork

router = APIRouter()

@router.get("/")
async def get_portfolio_works(db: Session = Depends(get_db)):
    try:
        works = db.query(PortfolioWork).filter(PortfolioWork.is_visible == True).order_by(PortfolioWork.display_order).all()
        works_list = []
        for w in works:
            works_list.append({
                "id": w.id,
                "title_ar": w.title_ar,
                "title": w.title,
                "description_ar": w.description_ar or "",
                "image_url": w.image_url or "",
                "category_ar": w.category_ar or "",
                "is_featured": w.is_featured
            })
        return works_list
    except Exception as e:
        print(f"Error: {e}")
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
                "title_ar": w.title_ar,
                "title": w.title,
                "description_ar": w.description_ar or "",
                "image_url": w.image_url or "",
                "category_ar": w.category_ar or "",
                "is_featured": w.is_featured
            })
        return works_list
    except Exception as e:
        print(f"Error: {e}")
        return []