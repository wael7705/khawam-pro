"""
Router لإدارة النظام الهرمي للأسعار
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from database import get_db, engine
from models import PricingCategory, PricingConfig
from pydantic import BaseModel
from typing import Optional, List
from decimal import Decimal

router = APIRouter()

# Pydantic Models
class PricingCategoryCreate(BaseModel):
    name_ar: str
    name_en: Optional[str] = None
    description_ar: Optional[str] = None
    description_en: Optional[str] = None
    icon: Optional[str] = None
    is_active: bool = True
    display_order: int = 0

class PricingConfigCreate(BaseModel):
    category_id: int
    paper_size: str  # A1, A2, A3, A4, A5, B1, B2, B3, B4, B5
    paper_type: Optional[str] = None  # normal, glossy, etc.
    print_type: str  # "bw" or "color"
    quality_type: Optional[str] = None  # "standard" or "laser" (only for color)
    price_per_page: float
    unit: str = "صفحة"
    is_active: bool = True
    display_order: int = 0

class CalculateHierarchicalPriceRequest(BaseModel):
    category_id: int
    paper_size: str
    paper_type: Optional[str] = None
    print_type: str  # "bw" or "color"
    quality_type: Optional[str] = None  # "standard" or "laser" (only for color)
    quantity: int  # عدد الصفحات

@router.get("/categories")
async def get_categories(db: Session = Depends(get_db)):
    """الحصول على جميع الفئات"""
    try:
        categories = db.query(PricingCategory).filter(
            PricingCategory.is_active == True
        ).order_by(PricingCategory.display_order).all()
        
        result = []
        for cat in categories:
            result.append({
                "id": cat.id,
                "name_ar": cat.name_ar,
                "name_en": cat.name_en,
                "description_ar": cat.description_ar,
                "description_en": cat.description_en,
                "icon": cat.icon,
                "display_order": cat.display_order
            })
        
        return {"success": True, "categories": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/categories")
async def create_category(data: PricingCategoryCreate, db: Session = Depends(get_db)):
    """إنشاء فئة جديدة"""
    try:
        category = PricingCategory(**data.dict())
        db.add(category)
        db.commit()
        db.refresh(category)
        
        return {
            "success": True,
            "category": {
                "id": category.id,
                "name_ar": category.name_ar,
                "name_en": category.name_en
            }
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/configs")
async def get_configs(
    category_id: Optional[int] = None,
    paper_size: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """الحصول على إعدادات التسعير"""
    try:
        query = db.query(PricingConfig)
        
        if category_id:
            query = query.filter(PricingConfig.category_id == category_id)
        if paper_size:
            query = query.filter(PricingConfig.paper_size == paper_size)
        
        configs = query.filter(
            PricingConfig.is_active == True
        ).order_by(PricingConfig.display_order).all()
        
        result = []
        for config in configs:
            result.append({
                "id": config.id,
                "category_id": config.category_id,
                "paper_size": config.paper_size,
                "paper_type": config.paper_type,
                "print_type": config.print_type,
                "quality_type": config.quality_type,
                "price_per_page": float(config.price_per_page),
                "unit": config.unit,
                "is_active": config.is_active
            })
        
        return {"success": True, "configs": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/configs")
async def create_config(data: PricingConfigCreate, db: Session = Depends(get_db)):
    """إنشاء إعداد تسعير جديد"""
    try:
        # التحقق من وجود الفئة
        category = db.query(PricingCategory).filter(
            PricingCategory.id == data.category_id
        ).first()
        
        if not category:
            raise HTTPException(status_code=404, detail="الفئة غير موجودة")
        
        # التحقق من أن quality_type موجود فقط للملون
        if data.print_type == "bw" and data.quality_type:
            raise HTTPException(
                status_code=400,
                detail="نوع الدقة غير مطلوب للطباعة بالأبيض والأسود"
            )
        
        config = PricingConfig(**data.dict())
        db.add(config)
        db.commit()
        db.refresh(config)
        
        return {
            "success": True,
            "config": {
                "id": config.id,
                "category_id": config.category_id,
                "paper_size": config.paper_size,
                "print_type": config.print_type,
                "price_per_page": float(config.price_per_page)
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/calculate-price")
async def calculate_hierarchical_price(
    data: CalculateHierarchicalPriceRequest,
    db: Session = Depends(get_db)
):
    """حساب السعر بناءً على الاختيارات"""
    try:
        # البحث عن الإعداد المناسب
        query = db.query(PricingConfig).filter(
            PricingConfig.category_id == data.category_id,
            PricingConfig.paper_size == data.paper_size,
            PricingConfig.print_type == data.print_type,
            PricingConfig.is_active == True
        )
        
        # إذا كان هناك paper_type محدد، استخدمه
        if data.paper_type:
            query = query.filter(PricingConfig.paper_type == data.paper_type)
        else:
            # إذا لم يكن محدداً، ابحث عن config بدون paper_type (عام)
            query = query.filter(PricingConfig.paper_type.is_(None))
        
        # إذا كان ملون، تحقق من quality_type
        if data.print_type == "color" and data.quality_type:
            query = query.filter(PricingConfig.quality_type == data.quality_type)
        elif data.print_type == "color":
            # إذا لم يكن محدداً، استخدم standard كافتراضي
            query = query.filter(
                (PricingConfig.quality_type == "standard") |
                (PricingConfig.quality_type.is_(None))
            )
        
        config = query.first()
        
        if not config:
            raise HTTPException(
                status_code=404,
                detail="لم يتم العثور على سعر لهذه المواصفات"
            )
        
        total_price = float(config.price_per_page) * data.quantity
        
        return {
            "success": True,
            "price_per_page": float(config.price_per_page),
            "quantity": data.quantity,
            "total_price": total_price,
            "unit": config.unit,
            "config_id": config.id
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/configs/{config_id}")
async def delete_config(config_id: int, db: Session = Depends(get_db)):
    """حذف إعداد تسعير"""
    try:
        config = db.query(PricingConfig).filter(PricingConfig.id == config_id).first()
        if not config:
            raise HTTPException(status_code=404, detail="الإعداد غير موجود")
        
        db.delete(config)
        db.commit()
        
        return {"success": True, "message": "تم الحذف بنجاح"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

