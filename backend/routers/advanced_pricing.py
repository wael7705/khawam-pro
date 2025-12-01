"""
Router متقدم لإدارة الأسعار مع دعم:
- قياسات A1-A5 مع حساب تلقائي
- أنواع ورق متعددة
- طباعة فليكس بالمتر المربع
- ROLL UP مع سعر الهيكل
- زيادة/نقصان الأسعار بنسبة مئوية
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from database import get_db
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from decimal import Decimal
import json

router = APIRouter()

# أبعاد القياسات العالمية (بالمتر)
PAPER_SIZES = {
    'A1': {'width': 0.841, 'height': 0.594, 'area': 0.499},  # متر مربع
    'A2': {'width': 0.594, 'height': 0.420, 'area': 0.249},
    'A3': {'width': 0.420, 'height': 0.297, 'area': 0.125},
    'A4': {'width': 0.297, 'height': 0.210, 'area': 0.062},
    'A5': {'width': 0.210, 'height': 0.148, 'area': 0.031},
}

# أنواع الورق
PAPER_TYPES = {
    'normal': 'عادي',
    'cardboard_170': 'كرتون 170غ',
    'cardboard_250': 'كرتون 250غ',
    'glossy': 'غلاسي',
    'matte': 'معجن',
    'coated': 'مقشش',
}

# أنواع طباعة الفليكس
FLEX_TYPES = {
    'pvc': 'PVC',
    'uv': 'UV',
}

class AdvancedPricingRuleCreate(BaseModel):
    """نموذج إنشاء قاعدة سعر متقدمة"""
    name_ar: str
    name_en: Optional[str] = None
    description_ar: Optional[str] = None
    
    # نوع الحساب: page (صفحة), area (متر مربع), piece (قطعة)
    calculation_type: str  # "page", "area", "piece"
    
    # القياسات المدعومة (A1, A2, A3, A4, A5)
    paper_sizes: Optional[List[str]] = None  # ["A4", "A5"]
    
    # نوع الورق (اختياري - null يعني جميع الأنواع)
    paper_type: Optional[str] = None  # normal, cardboard_170, etc.
    
    # نوع الطباعة
    print_type: str  # "bw" (أبيض وأسود) أو "color" (ملون)
    
    # نوع الدقة (للملون فقط)
    quality_type: Optional[str] = None  # "standard" (عادية) أو "laser" (ليزرية)
    
    # السعر الأساسي
    base_price: float
    
    # الوحدة
    unit: Optional[str] = None
    
    # حالة التفعيل
    is_active: bool = True
    
    # ترتيب العرض
    display_order: int = 0

class AdvancedPricingRuleUpdate(BaseModel):
    """نموذج تحديث قاعدة سعر متقدمة"""
    name_ar: Optional[str] = None
    name_en: Optional[str] = None
    description_ar: Optional[str] = None
    calculation_type: Optional[str] = None
    paper_sizes: Optional[List[str]] = None
    paper_type: Optional[str] = None
    print_type: Optional[str] = None
    quality_type: Optional[str] = None
    base_price: Optional[float] = None
    unit: Optional[str] = None
    is_active: Optional[bool] = None
    display_order: Optional[int] = None

class FlexPricingRuleCreate(BaseModel):
    """نموذج قاعدة سعر للفليكس"""
    name_ar: str
    name_en: Optional[str] = None
    flex_type: str  # "pvc" أو "uv"
    price_per_square_meter: float
    is_active: bool = True
    display_order: int = 0

class RollUpPricingRuleCreate(BaseModel):
    """نموذج قاعدة سعر للـ ROLL UP"""
    name_ar: str
    name_en: Optional[str] = None
    frame_price: float  # سعر الهيكل
    flex_price_per_square_meter: float  # سعر الفليكس بالمتر المربع
    is_active: bool = True
    display_order: int = 0

class BulkPriceUpdateRequest(BaseModel):
    """طلب تحديث جماعي للأسعار بنسبة مئوية"""
    percentage: float  # النسبة المئوية (مثلاً 5 لزيادة 5%)
    operation: str  # "increase" أو "decrease"
    filter_criteria: Optional[Dict[str, Any]] = None  # معايير التصفية

def detect_paper_size(width_cm: float, height_cm: float) -> Optional[str]:
    """
    اكتشاف القياس بناءً على الأبعاد (بالسنتيمتر)
    يعيد أكبر قياس يطابق الأبعاد
    """
    width_m = width_cm / 100
    height_m = height_cm / 100
    
    # تحويل الأبعاد إلى متر
    # البحث عن القياس المناسب (مع هامش خطأ صغير)
    tolerance = 0.01  # 1 سم
    
    matched_sizes = []
    for size, dims in PAPER_SIZES.items():
        size_width = dims['width']
        size_height = dims['height']
        
        # التحقق من المطابقة (مع الأخذ بالاعتبار الدوران)
        if (abs(width_m - size_width) <= tolerance and abs(height_m - size_height) <= tolerance) or \
           (abs(width_m - size_height) <= tolerance and abs(height_m - size_width) <= tolerance):
            matched_sizes.append(size)
    
    if not matched_sizes:
        return None
    
    # ترتيب القياسات من الأكبر للأصغر
    size_order = ['A1', 'A2', 'A3', 'A4', 'A5']
    matched_sizes.sort(key=lambda x: size_order.index(x) if x in size_order else 999)
    
    # إرجاع أكبر قياس مطابق
    return matched_sizes[0]

def calculate_area_square_meters(width_cm: float, height_cm: float) -> float:
    """حساب المساحة بالمتر المربع"""
    width_m = width_cm / 100
    height_m = height_cm / 100
    return width_m * height_m

@router.get("/advanced-pricing-rules")
async def get_advanced_pricing_rules(
    calculation_type: Optional[str] = None,
    print_type: Optional[str] = None,
    paper_size: Optional[str] = None,
    is_active: Optional[bool] = True,
    db: Session = Depends(get_db)
):
    """الحصول على قواعد الأسعار المتقدمة"""
    try:
        query = """
            SELECT id, name_ar, name_en, description_ar, calculation_type,
                   paper_sizes, paper_type, print_type, quality_type,
                   base_price, unit, is_active, display_order
            FROM pricing_rules
            WHERE 1=1
        """
        params = {}
        
        if is_active is not None:
            query += " AND is_active = :is_active"
            params["is_active"] = is_active
        
        if calculation_type:
            query += " AND calculation_type = :calculation_type"
            params["calculation_type"] = calculation_type
        
        if print_type:
            query += " AND specifications->>'print_type' = :print_type"
            params["print_type"] = print_type
        
        query += " ORDER BY display_order, id"
        
        result = db.execute(text(query), params).fetchall()
        
        rules = []
        for row in result:
            paper_sizes_json = row[5]
            if isinstance(paper_sizes_json, str):
                try:
                    paper_sizes_json = json.loads(paper_sizes_json)
                except:
                    paper_sizes_json = []
            
            rules.append({
                "id": row[0],
                "name_ar": row[1],
                "name_en": row[2],
                "description_ar": row[3],
                "calculation_type": row[4],
                "paper_sizes": paper_sizes_json if isinstance(paper_sizes_json, list) else [],
                "paper_type": row[6],
                "print_type": row[7],
                "quality_type": row[8],
                "base_price": float(row[9]) if row[9] else 0.0,
                "unit": row[10],
                "is_active": row[11],
                "display_order": row[12]
            })
        
        return {"success": True, "rules": rules, "count": len(rules)}
    except Exception as e:
        print(f"Error getting advanced pricing rules: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"خطأ في جلب قواعد الأسعار: {str(e)}")

@router.post("/advanced-pricing-rules")
async def create_advanced_pricing_rule(
    rule_data: AdvancedPricingRuleCreate,
    db: Session = Depends(get_db)
):
    """إنشاء قاعدة سعر متقدمة"""
    try:
        # حفظ البيانات في specifications JSON
        specifications = {
            "paper_sizes": rule_data.paper_sizes or [],
            "paper_type": rule_data.paper_type,
            "print_type": rule_data.print_type,
            "quality_type": rule_data.quality_type,
        }
        
        result = db.execute(text("""
            INSERT INTO pricing_rules 
            (name_ar, name_en, description_ar, calculation_type, base_price,
             specifications, unit, is_active, display_order)
            VALUES 
            (:name_ar, :name_en, :description_ar, :calculation_type, :base_price,
             :specifications, :unit, :is_active, :display_order)
            RETURNING id
        """), {
            "name_ar": rule_data.name_ar,
            "name_en": rule_data.name_en,
            "description_ar": rule_data.description_ar,
            "calculation_type": rule_data.calculation_type,
            "base_price": rule_data.base_price,
            "specifications": json.dumps(specifications),
            "unit": rule_data.unit or "صفحة",
            "is_active": rule_data.is_active,
            "display_order": rule_data.display_order
        })
        
        rule_id = result.fetchone()[0]
        db.commit()
        
        return {
            "success": True,
            "message": "تم إنشاء قاعدة السعر بنجاح",
            "rule_id": rule_id
        }
    except Exception as e:
        db.rollback()
        print(f"Error creating advanced pricing rule: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"خطأ في إنشاء قاعدة السعر: {str(e)}")

@router.get("/calculate-price-advanced")
async def calculate_price_advanced(
    calculation_type: str,
    quantity: float,
    width_cm: Optional[float] = None,
    height_cm: Optional[float] = None,
    print_type: Optional[str] = None,
    quality_type: Optional[str] = None,
    paper_type: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    حساب السعر المتقدم بناءً على الأبعاد والمواصفات
    """
    try:
        # اكتشاف القياس إذا كانت الأبعاد متوفرة
        paper_size = None
        if width_cm and height_cm:
            paper_size = detect_paper_size(width_cm, height_cm)
        
        # البحث عن قاعدة السعر المناسبة
        query = """
            SELECT id, base_price, specifications, unit, name_ar
            FROM pricing_rules
            WHERE calculation_type = :calculation_type
            AND is_active = true
            AND specifications->>'print_type' = :print_type
        """
        params = {
            "calculation_type": calculation_type,
            "print_type": print_type
        }
        
        if paper_size:
            query += " AND (specifications->>'paper_sizes' LIKE :paper_size_pattern OR specifications->>'paper_sizes' = '[]')"
            params["paper_size_pattern"] = f'%"{paper_size}"%'
        
        if paper_type:
            query += " AND (specifications->>'paper_type' = :paper_type OR specifications->>'paper_type' IS NULL)"
            params["paper_type"] = paper_type
        
        if quality_type:
            query += " AND (specifications->>'quality_type' = :quality_type OR specifications->>'quality_type' IS NULL)"
            params["quality_type"] = quality_type
        
        query += " ORDER BY display_order, id LIMIT 1"
        
        result = db.execute(text(query), params).fetchone()
        
        if not result:
            return {
                "success": False,
                "message": "لم يتم العثور على قاعدة سعر مناسبة",
                "total_price": 0.0
            }
        
        rule_id, base_price, specifications_json, unit, name_ar = result
        
        # حساب السعر النهائي
        if calculation_type == "page":
            total_price = Decimal(str(base_price)) * Decimal(str(quantity))
        elif calculation_type == "area":
            if width_cm and height_cm:
                area = calculate_area_square_meters(width_cm, height_cm)
                total_price = Decimal(str(base_price)) * Decimal(str(area)) * Decimal(str(quantity))
            else:
                total_price = Decimal(str(base_price)) * Decimal(str(quantity))
        else:  # piece
            total_price = Decimal(str(base_price)) * Decimal(str(quantity))
        
        return {
            "success": True,
            "rule_id": rule_id,
            "rule_name": name_ar,
            "base_price": float(base_price),
            "quantity": quantity,
            "paper_size": paper_size,
            "total_price": float(total_price),
            "unit": unit
        }
    except Exception as e:
        print(f"Error calculating advanced price: {e}")
        import traceback
        traceback.print_exc()
        return {
            "success": False,
            "message": f"خطأ في حساب السعر: {str(e)}",
            "total_price": 0.0
        }

@router.post("/bulk-update-prices")
async def bulk_update_prices(
    request: BulkPriceUpdateRequest,
    db: Session = Depends(get_db)
):
    """تحديث جماعي للأسعار بنسبة مئوية"""
    try:
        multiplier = Decimal("1.0")
        if request.operation == "increase":
            multiplier = Decimal("1.0") + (Decimal(str(request.percentage)) / Decimal("100"))
        elif request.operation == "decrease":
            multiplier = Decimal("1.0") - (Decimal(str(request.percentage)) / Decimal("100"))
        else:
            raise HTTPException(status_code=400, detail="العملية يجب أن تكون 'increase' أو 'decrease'")
        
        # بناء query التحديث
        query = "UPDATE pricing_rules SET base_price = base_price * :multiplier, updated_at = NOW() WHERE 1=1"
        params = {"multiplier": float(multiplier)}
        
        # إضافة معايير التصفية إذا كانت موجودة
        if request.filter_criteria:
            if request.filter_criteria.get("calculation_type"):
                query += " AND calculation_type = :calculation_type"
                params["calculation_type"] = request.filter_criteria["calculation_type"]
            
            if request.filter_criteria.get("is_active") is not None:
                query += " AND is_active = :is_active"
                params["is_active"] = request.filter_criteria["is_active"]
        
        result = db.execute(text(query), params)
        db.commit()
        
        return {
            "success": True,
            "message": f"تم تحديث {result.rowcount} قاعدة سعر بنجاح",
            "updated_count": result.rowcount,
            "percentage": request.percentage,
            "operation": request.operation
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Error bulk updating prices: {e}")
        raise HTTPException(status_code=500, detail=f"خطأ في التحديث الجماعي: {str(e)}")

