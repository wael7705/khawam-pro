from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import Service

router = APIRouter()

@router.get("/")
async def get_services(db: Session = Depends(get_db)):
    try:
        services = db.query(Service).filter(Service.is_visible == True).order_by(Service.display_order).all()
        services_list = []
        for s in services:
            services_list.append({
                "id": s.id,
                "name_ar": s.name_ar,
                "name_en": s.name_en,
                "description_ar": s.description_ar or "",
                "icon": s.icon or "📄",
                "base_price": float(s.base_price) if s.base_price else 0
            })
        return services_list
    except Exception as e:
        print(f"Error: {e}")
        return []

