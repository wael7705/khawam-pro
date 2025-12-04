from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session
from sqlalchemy import text
from database import get_db
from models import Service
from cache import get_cache_key, get_from_cache, set_cache, CACHE_TTL, clear_cache

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
        
        # استخدام raw SQL للتحقق من جميع الخدمات
        # ملاحظة: هذا endpoint للواجهة العامة - يعرض فقط الخدمات النشطة والظاهرة
        result = db.execute(text("""
            SELECT id, name_ar, name_en, description_ar, icon, base_price, is_visible, is_active, display_order
            FROM services
            WHERE is_visible = true AND is_active = true
            ORDER BY display_order ASC, id ASC
        """))
        
        services_list = []
        for row in result:
            services_list.append({
                "id": row[0],
                "name_ar": row[1],
                "name_en": row[2] or "",
                "description_ar": row[3] or "",
                "icon": row[4] or "📄",
                "base_price": float(row[5]) if row[5] else 0
            })
        
        # حفظ في cache
        set_cache(cache_key, services_list, CACHE_TTL['services'])
        if response:
            response.headers["X-Cache"] = "MISS"
        
        return services_list
    except Exception as e:
        print(f"Error getting services: {e}")
        import traceback
        traceback.print_exc()
        return []

@router.get("/debug/all")
async def get_all_services_debug(db: Session = Depends(get_db)):
    """Endpoint للتحقق من جميع الخدمات في قاعدة البيانات (للتصحيح)"""
    try:
        result = db.execute(text("""
            SELECT id, name_ar, name_en, description_ar, icon, base_price, is_visible, is_active, display_order, created_at
            FROM services
            ORDER BY id ASC
        """))
        
        services_list = []
        for row in result:
            services_list.append({
                "id": row[0],
                "name_ar": row[1],
                "name_en": row[2] or "",
                "description_ar": row[3] or "",
                "icon": row[4] or "📄",
                "base_price": float(row[5]) if row[5] else 0,
                "is_visible": row[6],
                "is_active": row[7],
                "display_order": row[8],
                "created_at": str(row[9]) if row[9] else None
            })
        
        return {
            "success": True,
            "count": len(services_list),
            "services": services_list
        }
    except Exception as e:
        print(f"Error getting all services: {e}")
        import traceback
        traceback.print_exc()
        return {
            "success": False,
            "error": str(e),
            "services": []
        }

@router.post("/clear-cache")
async def clear_services_cache():
    """مسح cache الخدمات"""
    try:
        cache_key = get_cache_key('services')
        clear_cache(cache_key)
        return {
            "success": True,
            "message": "تم مسح cache الخدمات بنجاح"
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

@router.post("/fix-visibility")
async def fix_services_visibility(db: Session = Depends(get_db)):
    """تفعيل جميع الخدمات وجعلها مرئية"""
    try:
        # تحديث جميع الخدمات لتكون مرئية ونشطة
        result = db.execute(text("""
            UPDATE services
            SET is_visible = true, is_active = true
            WHERE is_visible = false OR is_active = false
            RETURNING id, name_ar
        """))
        
        updated_services = []
        for row in result:
            updated_services.append({
                "id": row[0],
                "name_ar": row[1]
            })
        
        db.commit()
        
        # مسح cache
        cache_key = get_cache_key('services')
        clear_cache(cache_key)
        
        return {
            "success": True,
            "message": f"تم تفعيل {len(updated_services)} خدمة",
            "updated_services": updated_services
        }
    except Exception as e:
        db.rollback()
        print(f"Error fixing services visibility: {e}")
        import traceback
        traceback.print_exc()
        return {
            "success": False,
            "error": str(e)
        }

@router.post("/ensure-default-services")
async def ensure_default_services(db: Session = Depends(get_db)):
    """التأكد من وجود الخدمات الأساسية في قاعدة البيانات"""
    try:
        default_services = [
            {
                "name_ar": "طباعة محاضرات",
                "name_en": "Lecture Printing",
                "description_ar": "خدمة طباعة المحاضرات مع خيارات متعددة للقياس والجودة",
                "icon": "📚",
                "display_order": 1
            },
            {
                "name_ar": "طباعة فليكس",
                "name_en": "Flex Printing",
                "description_ar": "طباعة فليكس حسب القياس (متر مربع)",
                "icon": "🖨️",
                "display_order": 2
            },
            {
                "name_ar": "طباعة فينيل",
                "name_en": "Vinyl Printing",
                "description_ar": "طباعة فينيل لاصق بجميع الأنواع",
                "icon": "🎨",
                "display_order": 3
            },
            {
                "name_ar": "طباعة كلك بولستر",
                "name_en": "Sticker Printing",
                "description_ar": "طباعة ملصقات لاصقة بجميع الأشكال والأحجام",
                "icon": "🏷️",
                "display_order": 4
            },
            {
                "name_ar": "طباعة البوسترات",
                "name_en": "Poster Printing",
                "description_ar": "طباعة بوسترات عالية الجودة بجميع المقاسات",
                "icon": "📄",
                "display_order": 5
            },
            {
                "name_ar": "البانرات الإعلانية",
                "name_en": "Advertising Banners",
                "description_ar": "طباعة بانرات إعلانية بجميع المقاسات",
                "icon": "📢",
                "display_order": 6
            }
        ]
        
        created_services = []
        updated_services = []
        
        for service in default_services:
            # التحقق من وجود الخدمة
            existing = db.execute(text("""
                SELECT id, is_visible, is_active FROM services 
                WHERE name_ar = :name_ar
            """), {"name_ar": service["name_ar"]}).fetchone()
            
            if existing:
                # تحديث الخدمة الموجودة
                if not existing[1] or not existing[2]:  # is_visible or is_active is False
                    db.execute(text("""
                        UPDATE services
                        SET is_visible = true, is_active = true, 
                            display_order = :display_order,
                            icon = :icon,
                            description_ar = :description_ar
                        WHERE id = :id
                    """), {
                        "id": existing[0],
                        "display_order": service["display_order"],
                        "icon": service["icon"],
                        "description_ar": service["description_ar"]
                    })
                    updated_services.append(service["name_ar"])
            else:
                # إنشاء خدمة جديدة
                db.execute(text("""
                    INSERT INTO services 
                    (name_ar, name_en, description_ar, icon, base_price, is_visible, is_active, display_order)
                    VALUES 
                    (:name_ar, :name_en, :description_ar, :icon, 0, true, true, :display_order)
                """), {
                    "name_ar": service["name_ar"],
                    "name_en": service["name_en"],
                    "description_ar": service["description_ar"],
                    "icon": service["icon"],
                    "display_order": service["display_order"]
                })
                created_services.append(service["name_ar"])
        
        db.commit()
        
        # مسح cache
        cache_key = get_cache_key('services')
        clear_cache(cache_key)
        
        return {
            "success": True,
            "message": f"تم إنشاء {len(created_services)} خدمة وتحديث {len(updated_services)} خدمة",
            "created_services": created_services,
            "updated_services": updated_services
        }
    except Exception as e:
        db.rollback()
        print(f"Error ensuring default services: {e}")
        import traceback
        traceback.print_exc()
        return {
            "success": False,
            "error": str(e)
        }

