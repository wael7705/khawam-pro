from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session
from database import get_db
from models import Service
from cache import get_cache_key, get_from_cache, set_cache, CACHE_TTL

router = APIRouter()

@router.get("/")
async def get_services(db: Session = Depends(get_db), response: Response = None):
    try:
        # إنشاء مفتاح cache
        cache_key = get_cache_key('services')
        
        # محاولة جلب من cache
        cached_result = get_from_cache(cache_key)
        if cached_result is not None:
            if response:
                response.headers["X-Cache"] = "HIT"
            return cached_result
        
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
        
        # حفظ في cache
        set_cache(cache_key, services_list, CACHE_TTL['services'])
        if response:
            response.headers["X-Cache"] = "MISS"
        
        return services_list
    except Exception as e:
        print(f"Error: {e}")
        return []

