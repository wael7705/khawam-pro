"""
Router لإدارة الأسعار والخدمات المالية
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from database import get_db
from models import PricingRule
from pydantic import BaseModel
from typing import Optional, Dict, Any
from decimal import Decimal
from datetime import datetime

router = APIRouter()

# Pydantic models
class PricingRuleCreate(BaseModel):
    name_ar: str
    name_en: Optional[str] = None
    description_ar: Optional[str] = None
    description_en: Optional[str] = None
    calculation_type: str  # "piece", "area", "page"
    base_price: float
    price_multipliers: Optional[Dict[str, Any]] = None
    specifications: Optional[Dict[str, Any]] = None
    unit: Optional[str] = None
    is_active: bool = True
    display_order: int = 0

class PricingRuleUpdate(BaseModel):
    name_ar: Optional[str] = None
    name_en: Optional[str] = None
    description_ar: Optional[str] = None
    description_en: Optional[str] = None
    calculation_type: Optional[str] = None
    base_price: Optional[float] = None
    price_multipliers: Optional[Dict[str, Any]] = None
    specifications: Optional[Dict[str, Any]] = None
    unit: Optional[str] = None
    is_active: Optional[bool] = None
    display_order: Optional[int] = None

class CalculatePriceRequest(BaseModel):
    calculation_type: str  # "piece", "area", "page"
    quantity: float  # عدد القطع أو المساحة أو الصفحات
    specifications: Dict[str, Any]  # المواصفات مثل: paper_size, color, sides, etc.

# Helper function to calculate price
def calculate_price(
    calculation_type: str,
    quantity: float,
    base_price: Decimal,
    price_multipliers: Optional[Dict[str, Any]] = None,
    specifications: Optional[Dict[str, Any]] = None
) -> Decimal:
    """
    حساب السعر بناءً على نوع الحساب والمواصفات
    """
    price = Decimal(str(base_price))
    
    # تطبيق المعاملات الإضافية
    if price_multipliers and specifications:
        multiplier = Decimal("1.0")
        
        # معامل اللون
        if "color" in price_multipliers and "color" in specifications:
            color_type = specifications.get("color", "bw")
            if color_type in price_multipliers["color"]:
                multiplier *= Decimal(str(price_multipliers["color"][color_type]))
        
        # معامل الوجهين
        if "sides" in price_multipliers and "sides" in specifications:
            sides_type = specifications.get("sides", "single")
            if sides_type in price_multipliers["sides"]:
                multiplier *= Decimal(str(price_multipliers["sides"][sides_type]))
        
        price *= multiplier
    
    # حساب السعر النهائي
    if calculation_type == "piece":
        # السعر = السعر الأساسي × العدد
        total = price * Decimal(str(quantity))
    elif calculation_type == "area":
        # السعر = السعر الأساسي × المساحة (بالمتر المربع)
        total = price * Decimal(str(quantity))
    elif calculation_type == "page":
        # السعر = السعر الأساسي × عدد الصفحات
        # ملاحظة مهمة: السعر الأساسي هو سعر صفحة وجه واحد
        # طباعة وجهين = السعر الأساسي × 2
        if specifications and specifications.get("sides") == "double":
            # طباعة وجهين: السعر الأساسي × 2 × عدد الصفحات
            total = price * Decimal("2") * Decimal(str(quantity))
        else:
            # طباعة وجه واحد: السعر الأساسي × عدد الصفحات
            total = price * Decimal(str(quantity))
    else:
        total = price * Decimal(str(quantity))
    
    return total

# Endpoints
@router.get("/pricing-rules")
async def get_pricing_rules(
    is_active: Optional[bool] = None,
    calculation_type: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """الحصول على قائمة قواعد الأسعار"""
    try:
        from sqlalchemy import text
        
        query = "SELECT id, name_ar, name_en, description_ar, description_en, calculation_type, base_price, price_multipliers, specifications, unit, is_active, display_order FROM pricing_rules WHERE 1=1"
        params = {}
        
        if is_active is not None:
            query += " AND is_active = :is_active"
            params["is_active"] = is_active
        
        if calculation_type:
            query += " AND calculation_type = :calculation_type"
            params["calculation_type"] = calculation_type
        
        query += " ORDER BY display_order, id"
        
        result = db.execute(text(query), params).fetchall()
        
        rules = []
        for row in result:
            rules.append({
                "id": row[0],
                "name_ar": row[1],
                "name_en": row[2],
                "description_ar": row[3],
                "description_en": row[4],
                "calculation_type": row[5],
                "base_price": float(row[6]) if row[6] else 0.0,
                "price_multipliers": row[7],
                "specifications": row[8],
                "unit": row[9],
                "is_active": row[10],
                "display_order": row[11]
            })
        
        return {"success": True, "rules": rules, "count": len(rules)}
    except Exception as e:
        print(f"Error getting pricing rules: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"خطأ في جلب قواعد الأسعار: {str(e)}")

@router.get("/pricing-rules/{rule_id}")
async def get_pricing_rule(rule_id: int, db: Session = Depends(get_db)):
    """الحصول على قاعدة سعر محددة"""
    try:
        from sqlalchemy import text
        
        result = db.execute(text("""
            SELECT id, name_ar, name_en, description_ar, description_en, 
                   calculation_type, base_price, price_multipliers, specifications, 
                   unit, is_active, display_order
            FROM pricing_rules 
            WHERE id = :id
        """), {"id": rule_id}).fetchone()
        
        if not result:
            raise HTTPException(status_code=404, detail="قاعدة السعر غير موجودة")
        
        return {
            "success": True,
            "rule": {
                "id": result[0],
                "name_ar": result[1],
                "name_en": result[2],
                "description_ar": result[3],
                "description_en": result[4],
                "calculation_type": result[5],
                "base_price": float(result[6]) if result[6] else 0.0,
                "price_multipliers": result[7],
                "specifications": result[8],
                "unit": result[9],
                "is_active": result[10],
                "display_order": result[11]
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error getting pricing rule: {e}")
        raise HTTPException(status_code=500, detail=f"خطأ في جلب قاعدة السعر: {str(e)}")

@router.post("/pricing-rules")
async def create_pricing_rule(rule_data: PricingRuleCreate, db: Session = Depends(get_db)):
    """إنشاء قاعدة سعر جديدة"""
    try:
        from sqlalchemy import text
        
        # التحقق من صحة calculation_type
        if rule_data.calculation_type not in ["piece", "area", "page"]:
            raise HTTPException(
                status_code=400,
                detail="نوع الحساب يجب أن يكون: piece, area, أو page"
            )
        
        # إضافة قاعدة السعر
        result = db.execute(text("""
            INSERT INTO pricing_rules 
            (name_ar, name_en, description_ar, description_en, calculation_type, 
             base_price, price_multipliers, specifications, unit, is_active, display_order)
            VALUES 
            (:name_ar, :name_en, :description_ar, :description_en, :calculation_type,
             :base_price, :price_multipliers, :specifications, :unit, :is_active, :display_order)
            RETURNING id
        """), {
            "name_ar": rule_data.name_ar,
            "name_en": rule_data.name_en,
            "description_ar": rule_data.description_ar,
            "description_en": rule_data.description_en,
            "calculation_type": rule_data.calculation_type,
            "base_price": rule_data.base_price,
            "price_multipliers": rule_data.price_multipliers,
            "specifications": rule_data.specifications,
            "unit": rule_data.unit,
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
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Error creating pricing rule: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"خطأ في إنشاء قاعدة السعر: {str(e)}")

@router.put("/pricing-rules/{rule_id}")
async def update_pricing_rule(
    rule_id: int,
    rule_data: PricingRuleUpdate,
    db: Session = Depends(get_db)
):
    """تحديث قاعدة سعر"""
    try:
        from sqlalchemy import text
        
        # التحقق من وجود القاعدة
        existing = db.execute(text("SELECT id FROM pricing_rules WHERE id = :id"), {"id": rule_id}).fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="قاعدة السعر غير موجودة")
        
        # بناء query التحديث
        update_fields = []
        params = {"id": rule_id}
        
        if rule_data.name_ar is not None:
            update_fields.append("name_ar = :name_ar")
            params["name_ar"] = rule_data.name_ar
        
        if rule_data.name_en is not None:
            update_fields.append("name_en = :name_en")
            params["name_en"] = rule_data.name_en
        
        if rule_data.description_ar is not None:
            update_fields.append("description_ar = :description_ar")
            params["description_ar"] = rule_data.description_ar
        
        if rule_data.description_en is not None:
            update_fields.append("description_en = :description_en")
            params["description_en"] = rule_data.description_en
        
        if rule_data.calculation_type is not None:
            if rule_data.calculation_type not in ["piece", "area", "page"]:
                raise HTTPException(status_code=400, detail="نوع الحساب غير صحيح")
            update_fields.append("calculation_type = :calculation_type")
            params["calculation_type"] = rule_data.calculation_type
        
        if rule_data.base_price is not None:
            update_fields.append("base_price = :base_price")
            params["base_price"] = rule_data.base_price
        
        if rule_data.price_multipliers is not None:
            update_fields.append("price_multipliers = :price_multipliers")
            params["price_multipliers"] = rule_data.price_multipliers
        
        if rule_data.specifications is not None:
            update_fields.append("specifications = :specifications")
            params["specifications"] = rule_data.specifications
        
        if rule_data.unit is not None:
            update_fields.append("unit = :unit")
            params["unit"] = rule_data.unit
        
        if rule_data.is_active is not None:
            update_fields.append("is_active = :is_active")
            params["is_active"] = rule_data.is_active
        
        if rule_data.display_order is not None:
            update_fields.append("display_order = :display_order")
            params["display_order"] = rule_data.display_order
        
        if update_fields:
            update_fields.append("updated_at = NOW()")
            query = f"UPDATE pricing_rules SET {', '.join(update_fields)} WHERE id = :id"
            db.execute(text(query), params)
            db.commit()
        
        return {
            "success": True,
            "message": "تم تحديث قاعدة السعر بنجاح"
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Error updating pricing rule: {e}")
        raise HTTPException(status_code=500, detail=f"خطأ في تحديث قاعدة السعر: {str(e)}")

@router.delete("/pricing-rules/{rule_id}")
async def delete_pricing_rule(rule_id: int, db: Session = Depends(get_db)):
    """حذف قاعدة سعر"""
    try:
        from sqlalchemy import text
        
        result = db.execute(text("DELETE FROM pricing_rules WHERE id = :id"), {"id": rule_id})
        db.commit()
        
        if result.rowcount == 0:
            raise HTTPException(status_code=404, detail="قاعدة السعر غير موجودة")
        
        return {
            "success": True,
            "message": "تم حذف قاعدة السعر بنجاح"
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Error deleting pricing rule: {e}")
        raise HTTPException(status_code=500, detail=f"خطأ في حذف قاعدة السعر: {str(e)}")

@router.post("/calculate-price")
async def calculate_price_endpoint(
    request: CalculatePriceRequest,
    db: Session = Depends(get_db)
):
    """
    حساب السعر بناءً على المواصفات
    يستخدم قاعدة السعر المناسبة تلقائياً
    إذا لم يجد تطابق، يعيد السعر = 0
    """
    try:
        from sqlalchemy import text
        import json
        
        # البحث عن قاعدة السعر المناسبة
        # بناء query البحث الأساسي
        query = """
            SELECT id, base_price, price_multipliers, specifications, unit, name_ar
            FROM pricing_rules
            WHERE calculation_type = :calculation_type 
            AND is_active = true
        """
        params = {"calculation_type": request.calculation_type}
        
        # جلب جميع القواعد المطابقة لنوع الحساب
        query += " ORDER BY display_order, id"
        
        all_rules = db.execute(text(query), params).fetchall()
        
        if not all_rules:
            # لا توجد قواعد مالية - إرجاع 0
            print(f"Warning: No pricing rules found for calculation_type: {request.calculation_type}")
            return {
                "success": False,
                "message": f"لا توجد قاعدة سعر نشطة لنوع الحساب: {request.calculation_type}",
                "total_price": 0.0,
                "rule_id": None,
                "calculation_type": request.calculation_type
            }
        
        # البحث عن أفضل قاعدة تطابق بناءً على المواصفات
        best_match = None
        best_match_score = 0
        
        for rule in all_rules:
            rule_id, base_price, price_multipliers, rule_specifications, unit, name_ar = rule
            
            # حساب نقاط المطابقة
            match_score = 0
            
            # تحويل JSONB إلى dict إذا لزم الأمر
            if isinstance(rule_specifications, str):
                try:
                    rule_specifications = json.loads(rule_specifications)
                except:
                    rule_specifications = {}
            
            if isinstance(price_multipliers, str):
                try:
                    price_multipliers = json.loads(price_multipliers)
                except:
                    price_multipliers = {}
            
            # مطابقة المواصفات الأساسية
            if request.specifications:
                # مطابقة نوع اللون
                if 'color' in request.specifications and rule_specifications:
                    if 'color' in rule_specifications:
                        if request.specifications.get('color') == rule_specifications.get('color'):
                            match_score += 2
                
                # مطابقة عدد الوجوه
                if 'sides' in request.specifications and rule_specifications:
                    if 'sides' in rule_specifications:
                        if request.specifications.get('sides') == rule_specifications.get('sides'):
                            match_score += 2
                
                # مطابقة قياس الورق
                if 'paper_size' in request.specifications and rule_specifications:
                    if 'paper_size' in rule_specifications:
                        if request.specifications.get('paper_size') == rule_specifications.get('paper_size'):
                            match_score += 1
                
                # مطابقة نوع الوحدة
                if unit and request.specifications.get('unit'):
                    if unit == request.specifications.get('unit'):
                        match_score += 1
            
            # إذا كانت القاعدة لا تحتوي على مواصفات محددة، تعتبر قاعدة عامة
            if not rule_specifications or len(rule_specifications) == 0:
                match_score = 1  # قاعدة عامة - أقل أولوية
            
            # اختيار أفضل مطابقة
            if match_score > best_match_score:
                best_match_score = match_score
                best_match = rule
        
        # إذا لم نجد أي مطابقة، نستخدم أول قاعدة (القاعدة العامة)
        if not best_match or best_match_score == 0:
            best_match = all_rules[0]
            rule_id, base_price, price_multipliers, rule_specifications, unit, name_ar = best_match
            print(f"Using default rule: {name_ar} (ID: {rule_id})")
        else:
            rule_id, base_price, price_multipliers, rule_specifications, unit, name_ar = best_match
            print(f"Matched rule: {name_ar} (ID: {rule_id}, score: {best_match_score})")
        
        # تحويل JSONB إلى dict
        if isinstance(price_multipliers, str):
            try:
                price_multipliers = json.loads(price_multipliers)
            except:
                price_multipliers = {}
        
        # حساب السعر
        total_price = calculate_price(
            calculation_type=request.calculation_type,
            quantity=request.quantity,
            base_price=base_price,
            price_multipliers=price_multipliers,
            specifications=request.specifications
        )
        
        return {
            "success": True,
            "rule_id": rule_id,
            "rule_name": name_ar,
            "base_price": float(base_price),
            "quantity": request.quantity,
            "specifications": request.specifications,
            "total_price": float(total_price),
            "calculation_type": request.calculation_type,
            "unit": unit
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error calculating price: {e}")
        import traceback
        traceback.print_exc()
        # في حالة الخطأ، إرجاع 0 بدلاً من رفع استثناء
        return {
            "success": False,
            "message": f"خطأ في حساب السعر: {str(e)}",
            "total_price": 0.0,
            "rule_id": None,
            "calculation_type": request.calculation_type
        }

@router.post("/calculate-price-by-rule/{rule_id}")
async def calculate_price_by_rule(
    rule_id: int,
    request: CalculatePriceRequest,
    db: Session = Depends(get_db)
):
    """
    حساب السعر باستخدام قاعدة سعر محددة
    """
    try:
        from sqlalchemy import text
        
        # الحصول على قاعدة السعر
        result = db.execute(text("""
            SELECT calculation_type, base_price, price_multipliers, specifications
            FROM pricing_rules
            WHERE id = :id AND is_active = true
        """), {"id": rule_id}).fetchone()
        
        if not result:
            raise HTTPException(status_code=404, detail="قاعدة السعر غير موجودة أو غير نشطة")
        
        calc_type, base_price, price_multipliers, rule_specifications = result
        
        # حساب السعر
        total_price = calculate_price(
            calculation_type=calc_type,
            quantity=request.quantity,
            base_price=base_price,
            price_multipliers=price_multipliers,
            specifications=request.specifications
        )
        
        return {
            "success": True,
            "rule_id": rule_id,
            "base_price": float(base_price),
            "quantity": request.quantity,
            "specifications": request.specifications,
            "total_price": float(total_price),
            "calculation_type": calc_type
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error calculating price by rule: {e}")
        raise HTTPException(status_code=500, detail=f"خطأ في حساب السعر: {str(e)}")

