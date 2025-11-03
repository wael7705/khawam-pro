"""
Setup endpoints for initializing database with default users
"""
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import User, UserType
from routers.auth import get_password_hash, normalize_phone
import os

router = APIRouter()

# Secret key to protect this endpoint (should be set in environment)
SETUP_SECRET = os.getenv("SETUP_SECRET", "change-this-secret-key-in-production")

@router.post("/init-users")
async def init_users_endpoint(secret: str, db: Session = Depends(get_db)):
    """
    Initialize default users in database
    Requires SETUP_SECRET to prevent unauthorized access
    """
    if secret != SETUP_SECRET:
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    try:
        # Initialize user types
        user_types_data = [
            {"name_ar": "مدير", "name_en": "admin", "permissions": {"all": True}},
            {"name_ar": "موظف", "name_en": "employee", "permissions": {"orders": True, "products": True, "services": True}},
            {"name_ar": "عميل", "name_en": "customer", "permissions": {"orders": True, "view": True}}
        ]
        
        created_types = []
        for ut_data in user_types_data:
            existing = db.query(UserType).filter(UserType.name_ar == ut_data["name_ar"]).first()
            if not existing:
                user_type = UserType(**ut_data)
                db.add(user_type)
                created_types.append(ut_data["name_ar"])
        
        db.commit()
        
        # Refresh to get IDs
        db.refresh
        
        # Create default users
        created_users = []
        
        # Get user types
        admin_type = db.query(UserType).filter(UserType.name_ar == "مدير").first()
        employee_type = db.query(UserType).filter(UserType.name_ar == "موظف").first()
        customer_type = db.query(UserType).filter(UserType.name_ar == "عميل").first()
        
        if not admin_type or not employee_type or not customer_type:
            raise HTTPException(status_code=500, detail="User types not found")
        
        # Admin 1
        phone1 = normalize_phone("0966320114")
        existing = db.query(User).filter(User.phone == phone1).first()
        if not existing:
            user = User(
                name="مدير 1",
                phone=phone1,
                password_hash=get_password_hash("admin123"),
                user_type_id=admin_type.id,
                is_active=True
            )
            db.add(user)
            created_users.append(f"مدير 1 ({phone1})")
        
        # Admin 2
        phone2 = normalize_phone("+963955773227")
        existing = db.query(User).filter(User.phone == phone2).first()
        if not existing:
            user = User(
                name="مدير 2",
                phone=phone2,
                password_hash=get_password_hash("khawam-p"),
                user_type_id=admin_type.id,
                is_active=True
            )
            db.add(user)
            created_users.append(f"مدير 2 ({phone2})")
        
        # Employees
        for i in range(1, 4):
            email = f"khawam-{i}@gmail.com"
            existing = db.query(User).filter(User.email == email).first()
            if not existing:
                user = User(
                    name=f"موظف {i}",
                    email=email,
                    password_hash=get_password_hash(f"khawam-{i}"),
                    user_type_id=employee_type.id,
                    is_active=True
                )
                db.add(user)
                created_users.append(f"موظف {i} ({email})")
        
        # Customer
        existing = db.query(User).filter(User.email == "customer@gmail.com").first()
        if not existing:
            user = User(
                name="عميل تجريبي",
                email="customer@gmail.com",
                password_hash=get_password_hash("963214"),
                user_type_id=customer_type.id,
                is_active=True
            )
            db.add(user)
            created_users.append("عميل تجريبي (customer@gmail.com)")
        
        db.commit()
        
        return {
            "success": True,
            "created_user_types": created_types,
            "created_users": created_users,
            "message": f"تم إنشاء {len(created_types)} نوع مستخدم و {len(created_users)} مستخدم"
        }
    except Exception as e:
        db.rollback()
        print(f"Setup error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"خطأ في التهيئة: {str(e)}")

@router.get("/check-user/{phone_or_email}")
async def check_user_exists(phone_or_email: str, db: Session = Depends(get_db)):
    """Check if a user exists (for debugging)"""
    user = None
    
    # Try phone
    if phone_or_email.isdigit() or phone_or_email.startswith('+') or phone_or_email.startswith('0'):
        normalized = normalize_phone(phone_or_email)
        user = db.query(User).filter(User.phone == normalized).first()
        if user:
            return {
                "found": True,
                "method": "phone",
                "normalized_phone": normalized,
                "user": {
                    "id": user.id,
                    "name": user.name,
                    "phone": user.phone,
                    "email": user.email,
                    "has_password": bool(user.password_hash)
                }
            }
    else:
        # Try email
        user = db.query(User).filter(User.email == phone_or_email.lower()).first()
        if user:
            return {
                "found": True,
                "method": "email",
                "user": {
                    "id": user.id,
                    "name": user.name,
                    "phone": user.phone,
                    "email": user.email,
                    "has_password": bool(user.password_hash)
                }
            }
    
    return {
        "found": False,
        "message": "المستخدم غير موجود"
    }

