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
SETUP_SECRET = os.getenv("SETUP_SECRET", "khawam-init-secret-2024")

@router.post("/init-users")
@router.get("/init-users")
async def init_users_endpoint(secret: str = None, reset: bool = False, db: Session = Depends(get_db)):
    """
    Initialize default users in database
    Can be called without secret for initial setup (change in production)
    Supports both GET and POST methods for easy browser access
    
    Args:
        secret: Secret key (optional for initial setup)
        reset: If True, delete all existing users before creating new ones
    """
    # Allow without secret for initial setup for easier testing
    if secret and secret != SETUP_SECRET and secret != "khawam-init-secret-2024":
        print(f"⚠️ Warning: Invalid setup secret provided, but allowing for setup")
    
    print("🚀 Starting user initialization...")
    
    # إذا كان reset=True، مسح جميع المستخدمين أولاً
    deleted_count = 0
    if reset:
        print("🗑️ Resetting: Deleting all existing users...")
        all_users = db.query(User).all()
        deleted_count = len(all_users)
        for user in all_users:
            db.delete(user)
        db.commit()
        print(f"✅ Deleted {deleted_count} existing user(s)")
    
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
        
        # Refresh to get IDs by querying again
        admin_type = db.query(UserType).filter(UserType.name_ar == "مدير").first()
        employee_type = db.query(UserType).filter(UserType.name_ar == "موظف").first()
        customer_type = db.query(UserType).filter(UserType.name_ar == "عميل").first()
        
        # Create default users
        created_users = []
        
        # User types should already be queried above
        if not admin_type or not employee_type or not customer_type:
            raise HTTPException(status_code=500, detail="User types not found. Please create user types first.")
        
        # Admin 1
        phone1 = normalize_phone("0966320114")
        print(f"📱 Admin 1 - Normalized phone: {phone1}")
        
        # إذا كان reset=True، أنشئ المستخدم مباشرة، وإلا تحقق من وجوده
        if reset:
            # أنشئ المستخدم مباشرة
            user = User(
                name="مدير 1",
                phone=phone1,
                password_hash=get_password_hash("admin123"),
                user_type_id=admin_type.id,
                is_active=True
            )
            db.add(user)
            created_users.append(f"مدير 1 ({phone1})")
            print(f"✅ Created Admin 1: {phone1} / admin123")
        else:
            # تحقق من وجود المستخدم أولاً
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
                print(f"✅ Created Admin 1: {phone1} / admin123")
            else:
                # تحديث المستخدم الموجود (خاصة password_hash إذا كان NULL)
                if not existing.password_hash:
                    existing.password_hash = get_password_hash("admin123")
                    print(f"🔑 Updated password for Admin 1: {phone1}")
                print(f"ℹ️ Admin 1 already exists: {phone1}")
        
        # Admin 2
        phone2 = normalize_phone("+963955773227")
        print(f"📱 Admin 2 - Normalized phone: {phone2}")
        
        if reset:
            user = User(
                name="مدير 2",
                phone=phone2,
                password_hash=get_password_hash("khawam-p"),
                user_type_id=admin_type.id,
                is_active=True
            )
            db.add(user)
            created_users.append(f"مدير 2 ({phone2})")
            print(f"✅ Created Admin 2: {phone2} / khawam-p")
        else:
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
                print(f"✅ Created Admin 2: {phone2} / khawam-p")
            else:
                if not existing.password_hash:
                    existing.password_hash = get_password_hash("khawam-p")
                    print(f"🔑 Updated password for Admin 2: {phone2}")
                print(f"ℹ️ Admin 2 already exists: {phone2}")
        
        # Employees
        for i in range(1, 4):
            email = f"khawam-{i}@gmail.com"
            
            if reset:
                user = User(
                    name=f"موظف {i}",
                    email=email,
                    password_hash=get_password_hash(f"khawam-{i}"),
                    user_type_id=employee_type.id,
                    is_active=True
                )
                db.add(user)
                created_users.append(f"موظف {i} ({email})")
                print(f"✅ Created Employee {i}: {email} / khawam-{i}")
            else:
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
                    print(f"✅ Created Employee {i}: {email} / khawam-{i}")
                else:
                    if not existing.password_hash:
                        existing.password_hash = get_password_hash(f"khawam-{i}")
                        print(f"🔑 Updated password for Employee {i}: {email}")
                    print(f"ℹ️ Employee {i} already exists: {email}")
        
        # Customer
        if reset:
            user = User(
                name="عميل تجريبي",
                email="customer@gmail.com",
                password_hash=get_password_hash("963214"),
                user_type_id=customer_type.id,
                is_active=True
            )
            db.add(user)
            created_users.append("عميل تجريبي (customer@gmail.com)")
            print(f"✅ Created Customer: customer@gmail.com / 963214")
        else:
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
                print(f"✅ Created Customer: customer@gmail.com / 963214")
            else:
                if not existing.password_hash:
                    existing.password_hash = get_password_hash("963214")
                    print(f"🔑 Updated password for Customer: customer@gmail.com")
                print(f"ℹ️ Customer already exists: customer@gmail.com")
        
        db.commit()
        print(f"💾 All changes committed to database")
        
        result = {
            "success": True,
            "reset": reset,
            "deleted_users": deleted_count if reset else 0,
            "created_user_types": created_types,
            "created_users": created_users,
            "message": f"تم {'إعادة إنشاء' if reset else 'إنشاء'} {len(created_users)} مستخدم" + (f" بعد مسح {deleted_count} مستخدم قديم" if reset and deleted_count > 0 else ""),
            "summary": {
                "total_user_types": len(user_types_data),
                "new_user_types": len(created_types),
                "total_users": len(created_users),
                "deleted_users": deleted_count if reset else 0
            }
        }
        print(f"✅ Setup completed successfully: {result['message']}")
        return result
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
    search_attempts = []
    
    # Try phone
    if phone_or_email.isdigit() or phone_or_email.startswith('+') or phone_or_email.startswith('0'):
        normalized = normalize_phone(phone_or_email)
        search_attempts.append(f"phone (normalized: {normalized})")
        user = db.query(User).filter(User.phone == normalized).first()
        if user:
            return {
                "found": True,
                "method": "phone",
                "normalized_phone": normalized,
                "search_attempts": search_attempts,
                "user": {
                    "id": user.id,
                    "name": user.name,
                    "phone": user.phone,
                    "email": user.email,
                    "has_password": bool(user.password_hash),
                    "user_type": user.user_type.name_ar if user.user_type else None
                }
            }
    else:
        # Try email
        search_attempts.append(f"email ({phone_or_email.lower()})")
        user = db.query(User).filter(User.email == phone_or_email.lower()).first()
        if user:
            return {
                "found": True,
                "method": "email",
                "search_attempts": search_attempts,
                "user": {
                    "id": user.id,
                    "name": user.name,
                    "phone": user.phone,
                    "email": user.email,
                    "has_password": bool(user.password_hash),
                    "user_type": user.user_type.name_ar if user.user_type else None
                }
            }
    
    return {
        "found": False,
        "search_attempts": search_attempts,
        "message": "المستخدم غير موجود"
    }

@router.get("/list-all-users")
async def list_all_users(db: Session = Depends(get_db)):
    """List all users in database (for debugging)"""
    users = db.query(User).all()
    return {
        "total": len(users),
        "users": [
            {
                "id": u.id,
                "name": u.name,
                "phone": u.phone,
                "email": u.email,
                "user_type": u.user_type.name_ar if u.user_type else None,
                "is_active": u.is_active,
                "has_password": bool(u.password_hash),
                "password_hash_length": len(u.password_hash) if u.password_hash else 0
            }
            for u in users
        ]
    }

@router.delete("/reset-users")
@router.post("/reset-users")
async def reset_users_endpoint(secret: str = None, db: Session = Depends(get_db)):
    """
    Delete all users and recreate default users
    WARNING: This will delete ALL users in the database!
    """
    if secret and secret != SETUP_SECRET and secret != "khawam-init-secret-2024":
        print(f"⚠️ Warning: Invalid setup secret provided, but allowing for setup")
    
    print("⚠️ RESET MODE: Deleting all users...")
    
    try:
        all_users = db.query(User).all()
        deleted_count = len(all_users)
        for user in all_users:
            db.delete(user)
        db.commit()
        
        print(f"✅ Deleted {deleted_count} user(s)")
        
        # الآن أنشئ المستخدمين الجدد
        return await init_users_endpoint(secret=secret, reset=True, db=db)
    except Exception as e:
        db.rollback()
        print(f"Reset error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"خطأ في إعادة التعيين: {str(e)}")

