from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import PaymentSettings
from routers.auth import get_current_active_user, require_role, User
from pydantic import BaseModel
from typing import Optional

router = APIRouter()

# Pydantic models
class PaymentSettingsCreate(BaseModel):
    payment_method: str = "sham_cash"
    account_name: str
    account_number: str
    phone_number: Optional[str] = None
    api_key: Optional[str] = None
    api_secret: Optional[str] = None
    is_active: bool = True

class PaymentSettingsUpdate(BaseModel):
    payment_method: Optional[str] = None
    account_name: Optional[str] = None
    account_number: Optional[str] = None
    phone_number: Optional[str] = None
    api_key: Optional[str] = None
    api_secret: Optional[str] = None
    is_active: Optional[bool] = None

# Endpoints
@router.get("/settings")
async def get_payment_settings(
    current_user: User = Depends(require_role(["مدير"])),
    db: Session = Depends(get_db)
):
    """الحصول على إعدادات الدفع (مدير فقط)"""
    try:
        settings = db.query(PaymentSettings).filter(
            PaymentSettings.payment_method == "sham_cash"
        ).first()
        
        if not settings:
            return {
                "success": True,
                "settings": None,
                "message": "لم يتم إعداد الدفع بعد"
            }
        
        return {
            "success": True,
            "settings": {
                "id": settings.id,
                "payment_method": settings.payment_method,
                "account_name": settings.account_name,
                "account_number": settings.account_number,
                "phone_number": settings.phone_number,
                "is_active": settings.is_active,
                "created_at": settings.created_at.isoformat() if settings.created_at else None,
                "updated_at": settings.updated_at.isoformat() if settings.updated_at else None
                # لا نرسل api_key و api_secret لأسباب أمنية
            }
        }
    except Exception as e:
        print(f"Error fetching payment settings: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"خطأ في جلب إعدادات الدفع: {str(e)}"
        )

@router.post("/settings")
async def create_payment_settings(
    settings_data: PaymentSettingsCreate,
    current_user: User = Depends(require_role(["مدير"])),
    db: Session = Depends(get_db)
):
    """إنشاء إعدادات الدفع (مدير فقط)"""
    try:
        # التحقق من وجود إعدادات أخرى لنفس طريقة الدفع
        existing = db.query(PaymentSettings).filter(
            PaymentSettings.payment_method == settings_data.payment_method
        ).first()
        
        if existing:
            raise HTTPException(
                status_code=400,
                detail=f"توجد إعدادات موجودة بالفعل لطريقة الدفع {settings_data.payment_method}. يرجى تحديث الإعدادات الموجودة."
            )
        
        new_settings = PaymentSettings(
            payment_method=settings_data.payment_method,
            account_name=settings_data.account_name,
            account_number=settings_data.account_number,
            phone_number=settings_data.phone_number,
            api_key=settings_data.api_key,
            api_secret=settings_data.api_secret,
            is_active=settings_data.is_active
        )
        
        db.add(new_settings)
        db.commit()
        db.refresh(new_settings)
        
        return {
            "success": True,
            "settings": {
                "id": new_settings.id,
                "payment_method": new_settings.payment_method,
                "account_name": new_settings.account_name,
                "account_number": new_settings.account_number,
                "phone_number": new_settings.phone_number,
                "is_active": new_settings.is_active
            },
            "message": "تم إعداد الدفع بنجاح"
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Error creating payment settings: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"خطأ في إعداد الدفع: {str(e)}"
        )

@router.put("/settings/{settings_id}")
async def update_payment_settings(
    settings_id: int,
    settings_data: PaymentSettingsUpdate,
    current_user: User = Depends(require_role(["مدير"])),
    db: Session = Depends(get_db)
):
    """تحديث إعدادات الدفع (مدير فقط)"""
    try:
        settings = db.query(PaymentSettings).filter(
            PaymentSettings.id == settings_id
        ).first()
        
        if not settings:
            raise HTTPException(
                status_code=404,
                detail="إعدادات الدفع غير موجودة"
            )
        
        update_data = settings_data.dict(exclude_unset=True)
        for key, value in update_data.items():
            setattr(settings, key, value)
        
        db.commit()
        db.refresh(settings)
        
        return {
            "success": True,
            "settings": {
                "id": settings.id,
                "payment_method": settings.payment_method,
                "account_name": settings.account_name,
                "account_number": settings.account_number,
                "phone_number": settings.phone_number,
                "is_active": settings.is_active
            },
            "message": "تم تحديث إعدادات الدفع بنجاح"
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Error updating payment settings: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"خطأ في تحديث إعدادات الدفع: {str(e)}"
        )

@router.get("/settings/public")
async def get_public_payment_info(db: Session = Depends(get_db)):
    """الحصول على معلومات الدفع العامة (للعرض للعملاء)"""
    try:
        settings = db.query(PaymentSettings).filter(
            PaymentSettings.payment_method == "sham_cash",
            PaymentSettings.is_active == True
        ).first()
        
        if not settings:
            return {
                "success": True,
                "payment_info": None,
                "message": "الدفع غير متاح حالياً"
            }
        
        return {
            "success": True,
            "payment_info": {
                "payment_method": settings.payment_method,
                "account_name": settings.account_name,
                "account_number": settings.account_number,
                "phone_number": settings.phone_number
            }
        }
    except Exception as e:
        print(f"Error fetching public payment info: {e}")
        return {
            "success": True,
            "payment_info": None
        }


