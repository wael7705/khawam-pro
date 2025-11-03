from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from database import get_db
from models import User, UserType
from pydantic import BaseModel, EmailStr, validator
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
from typing import Optional
import re
import os

router = APIRouter()

# Security configuration
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production-use-env-variable")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

# Pydantic models
class LoginRequest(BaseModel):
    username: str  # يمكن أن يكون رقم هاتف أو بريد إلكتروني
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: dict

class UserResponse(BaseModel):
    id: int
    name: str
    email: Optional[str]
    phone: Optional[str]
    user_type: dict
    is_active: bool

class RegisterRequest(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    password: str
    user_type: str = "عميل"  # Default to customer

class UpdateProfileRequest(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

# Helper functions
def verify_password(plain_password: str, hashed_password: str) -> bool:
    """التحقق من كلمة المرور"""
    try:
        # التحقق من أن hashed_password ليس فارغاً أو None
        if not hashed_password:
            return False
        # التحقق من أن plain_password ليس فارغاً أو None
        if not plain_password:
            return False
        # التحقق من أن hashed_password يبدو كـ hash (يبدأ بـ $2b$ أو $2a$)
        if not hashed_password.startswith('$2'):
            # إذا لم يكن hash، جرب verify مع bcrypt مباشرة أو رجع False
            return False
        # استخدم passlib للتحقق
        return pwd_context.verify(plain_password, hashed_password)
    except Exception as e:
        print(f"⚠️ Error verifying password: {e}")
        return False

def get_password_hash(password: str) -> str:
    """تشفير كلمة المرور"""
    return pwd_context.hash(password)

def normalize_phone(phone: str) -> str:
    """تطبيع رقم الهاتف (إزالة المسافات والرموز)"""
    # إزالة جميع الرموز غير الرقمية (بما في ذلك +)
    phone_clean = re.sub(r'[^\d]', '', phone)
    
    # إذا كان يبدأ بـ 00، نزيله
    if phone_clean.startswith('00'):
        phone_clean = phone_clean[2:]
    
    # إذا كان يبدأ بـ 0963 (رقم سوري مع الصفر وكود البلد)
    if phone_clean.startswith('0963'):
        # مثال: 0966320114 -> 66320114 (نزيل 0963 ونحتفظ بالباقي)
        return '+963' + phone_clean[4:]
    
    # إذا كان يبدأ بـ 963 (كود سوريا بدون صفر)
    if phone_clean.startswith('963'):
        # مثال: 96366320114 -> 66320114 (نزيل 963 ونحتفظ بالباقي)
        return '+963' + phone_clean[3:]
    
    # إذا كان يبدأ بـ 0 (رقم سوري محلي بدون كود البلد)
    if phone_clean.startswith('0'):
        # مثال: 0966320114 -> 66320114 (نزيل الصفر وأول رقم)
        # الرقم السوري: 0 + رقم المنطقة (1 رقم) + الرقم
        if len(phone_clean) >= 10:
            # نزيل الصفر وأول رقم (مثل 09 أو 05)
            return '+963' + phone_clean[2:]
    
    # إذا لم يبدأ بأي من السابق، نضيف +963 في المقدمة
    return '+963' + phone_clean

def is_valid_email(email: str) -> bool:
    """التحقق من صحة البريد الإلكتروني"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email))

def is_valid_phone(phone: str) -> bool:
    """التحقق من صحة رقم الهاتف"""
    # تطبيع الرقم أولاً
    normalized = normalize_phone(phone)
    # التحقق من أن الرقم يحتوي على أرقام كافية
    digits_only = re.sub(r'[^\d]', '', normalized)
    return len(digits_only) >= 9

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """إنشاء JWT token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    """الحصول على المستخدم الحالي من الـ token"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: int = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_exception
    
    return user

async def get_current_active_user(
    current_user: User = Depends(get_current_user)
):
    """الحصول على المستخدم النشط الحالي"""
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

def require_role(allowed_roles: list[str]):
    """Decorator للتحقق من الصلاحيات"""
    async def role_checker(current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
        user_type = db.query(UserType).filter(UserType.id == current_user.user_type_id).first()
        if not user_type:
            raise HTTPException(status_code=403, detail="User type not found")
        
        role_name = user_type.name_ar.lower()
        if role_name not in allowed_roles:
            raise HTTPException(
                status_code=403,
                detail=f"Access denied. Required roles: {', '.join(allowed_roles)}"
            )
        return current_user
    return role_checker

# Endpoints
@router.post("/login", response_model=Token)
async def login(login_data: LoginRequest, db: Session = Depends(get_db)):
    """تسجيل الدخول باستخدام الهاتف/البريد الإلكتروني وكلمة المرور"""
    try:
        username = login_data.username.strip()
        password = login_data.password
        
        # تحديد نوع المعرف (بريد إلكتروني أم رقم هاتف)
        user = None
        normalized_phone = None
        if is_valid_email(username):
            # البحث بالبريد الإلكتروني - جرب مع lower وبدون
            user = db.query(User).filter(User.email == username.lower()).first()
            if not user:
                # جرب البحث بدون lower أيضاً
                user = db.query(User).filter(User.email == username).first()
            print(f"🔍 Searching for email: {username}, found: {user.id if user else 'None'}")
        elif is_valid_phone(username):
            # البحث برقم الهاتف (مطبيع)
            normalized_phone = normalize_phone(username)
            user = db.query(User).filter(User.phone == normalized_phone).first()
            
            # إذا لم يُوجد، جرب البحث بصيغ مختلفة
            if not user:
                # جرب البحث بالرقم كما هو
                user = db.query(User).filter(User.phone == username).first()
                
                # جرب البحث بصيغ مختلفة للرقم السوري
                if not user and username.startswith('0'):
                    # إذا كان يبدأ بـ 0، جرب بدون الصفر
                    try_no_zero = username[1:] if len(username) > 1 else username
                    # جرب +963 + الرقم بدون 0 وأول رقم
                    if len(try_no_zero) >= 9:
                        try_without_area = '+963' + try_no_zero[1:]  # إزالة أول رقم (رقم المنطقة)
                        user = db.query(User).filter(User.phone == try_without_area).first()
        else:
            raise HTTPException(
                status_code=400,
                detail="الرجاء إدخال رقم هاتف صحيح أو بريد إلكتروني صحيح"
            )
        
        if not user:
            # إرجاع رسالة خطأ أكثر وضوحاً
            error_msg = "اسم المستخدم أو كلمة المرور غير صحيحة"
            if normalized_phone:
                error_msg += f" (بحث عن: {normalized_phone})"
            # إضافة رسالة توضيحية إذا كان المستخدم غير موجود
            print(f"❌ Login failed: username={username}, normalized_phone={normalized_phone}")
            raise HTTPException(
                status_code=401,
                detail=error_msg
            )
        
        if not user.is_active:
            raise HTTPException(
                status_code=403,
                detail="الحساب غير نشط"
            )
        
        # التحقق من كلمة المرور
        print(f"🔍 Verifying password for user {user.id}")
        print(f"   Password hash exists: {bool(user.password_hash)}")
        print(f"   Hash starts with $2b: {user.password_hash.startswith('$2b') if user.password_hash else False}")
        print(f"   Hash length: {len(user.password_hash) if user.password_hash else 0}")
        
        try:
            verify_result = verify_password(password, user.password_hash)
            print(f"   Verify result: {verify_result}")
            if not verify_result:
                raise HTTPException(
                    status_code=401,
                    detail="اسم المستخدم أو كلمة المرور غير صحيحة"
                )
        except HTTPException:
            raise
        except Exception as e:
            print(f"⚠️ Error in password verification: {e}")
            raise HTTPException(
                status_code=401,
                detail="اسم المستخدم أو كلمة المرور غير صحيحة"
            )
        
        # الحصول على نوع المستخدم
        user_type = db.query(UserType).filter(UserType.id == user.user_type_id).first()
        
        # إنشاء token
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user.id},
            expires_delta=access_token_expires
        )
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": user.id,
                "name": user.name,
                "email": user.email,
                "phone": user.phone,
                "user_type": {
                    "id": user_type.id,
                    "name_ar": user_type.name_ar,
                    "name_en": user_type.name_en
                },
                "is_active": user.is_active
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Login error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"خطأ في تسجيل الدخول: {str(e)}"
        )

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """الحصول على معلومات المستخدم الحالي"""
    user_type = db.query(UserType).filter(UserType.id == current_user.user_type_id).first()
    return {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "phone": current_user.phone,
        "user_type": {
            "id": user_type.id,
            "name_ar": user_type.name_ar,
            "name_en": user_type.name_en
        },
        "is_active": current_user.is_active
    }

@router.post("/logout")
async def logout():
    """تسجيل الخروج (على العميل حذف الـ token من التخزين المحلي)"""
    return {"message": "تم تسجيل الخروج بنجاح"}

@router.post("/register")
async def register(register_data: RegisterRequest, db: Session = Depends(get_db)):
    """تسجيل حساب جديد"""
    try:
        # التحقق من أن إما البريد الإلكتروني أو الهاتف موجود
        if not register_data.email and not register_data.phone:
            raise HTTPException(
                status_code=400,
                detail="يجب إدخال البريد الإلكتروني أو رقم الهاتف"
            )
        
        # التحقق من صحة البيانات
        if register_data.email and not is_valid_email(register_data.email):
            raise HTTPException(
                status_code=400,
                detail="البريد الإلكتروني غير صحيح"
            )
        
        # التحقق من عدم وجود مستخدم بنفس البريد الإلكتروني
        if register_data.email:
            existing = db.query(User).filter(User.email == register_data.email.lower()).first()
            if existing:
                raise HTTPException(
                    status_code=400,
                    detail="البريد الإلكتروني مستخدم بالفعل"
                )
        
        # التحقق من عدم وجود مستخدم بنفس رقم الهاتف
        if register_data.phone:
            normalized_phone = normalize_phone(register_data.phone)
            existing = db.query(User).filter(User.phone == normalized_phone).first()
            if existing:
                raise HTTPException(
                    status_code=400,
                    detail="رقم الهاتف مستخدم بالفعل"
                )
        
        # الحصول على نوع المستخدم (افتراضي: عميل)
        user_type = db.query(UserType).filter(UserType.name_ar == register_data.user_type).first()
        if not user_type:
            # إذا لم يوجد نوع المستخدم المحدد، استخدم عميل
            user_type = db.query(UserType).filter(UserType.name_ar == "عميل").first()
            if not user_type:
                raise HTTPException(
                    status_code=500,
                    detail="نوع المستخدم 'عميل' غير موجود في النظام"
                )
        
        # تشفير كلمة المرور
        password_hash = get_password_hash(register_data.password)
        
        # إنشاء المستخدم الجديد
        new_user = User(
            name=register_data.name,
            email=register_data.email.lower() if register_data.email else None,
            phone=normalize_phone(register_data.phone) if register_data.phone else None,
            password_hash=password_hash,
            user_type_id=user_type.id,
            is_active=True
        )
        
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        
        return {
            "success": True,
            "message": "تم إنشاء الحساب بنجاح",
            "user": {
                "id": new_user.id,
                "name": new_user.name,
                "email": new_user.email,
                "phone": new_user.phone,
                "user_type": {
                    "id": user_type.id,
                    "name_ar": user_type.name_ar,
                    "name_en": user_type.name_en
                }
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Registration error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"خطأ في إنشاء الحساب: {str(e)}"
        )

@router.put("/profile")
async def update_profile(
    profile_data: UpdateProfileRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """تحديث معلومات الحساب"""
    try:
        update_data = profile_data.dict(exclude_unset=True)
        
        # التحقق من البريد الإلكتروني إذا كان موجوداً
        if "email" in update_data and update_data["email"]:
            if not is_valid_email(update_data["email"]):
                raise HTTPException(
                    status_code=400,
                    detail="البريد الإلكتروني غير صحيح"
                )
            
            # التحقق من عدم استخدام البريد من قبل مستخدم آخر
            existing = db.query(User).filter(
                User.email == update_data["email"].lower(),
                User.id != current_user.id
            ).first()
            if existing:
                raise HTTPException(
                    status_code=400,
                    detail="البريد الإلكتروني مستخدم بالفعل من قبل مستخدم آخر"
                )
            update_data["email"] = update_data["email"].lower()
        
        # التحقق من رقم الهاتف إذا كان موجوداً
        if "phone" in update_data and update_data["phone"]:
            normalized_phone = normalize_phone(update_data["phone"])
            # التحقق من عدم استخدام الرقم من قبل مستخدم آخر
            existing = db.query(User).filter(
                User.phone == normalized_phone,
                User.id != current_user.id
            ).first()
            if existing:
                raise HTTPException(
                    status_code=400,
                    detail="رقم الهاتف مستخدم بالفعل من قبل مستخدم آخر"
                )
            update_data["phone"] = normalized_phone
        
        # تحديث البيانات
        for key, value in update_data.items():
            setattr(current_user, key, value)
        
        db.commit()
        db.refresh(current_user)
        
        # الحصول على نوع المستخدم
        user_type = db.query(UserType).filter(UserType.id == current_user.user_type_id).first()
        
        return {
            "success": True,
            "message": "تم تحديث معلومات الحساب بنجاح",
            "user": {
                "id": current_user.id,
                "name": current_user.name,
                "email": current_user.email,
                "phone": current_user.phone,
                "user_type": {
                    "id": user_type.id,
                    "name_ar": user_type.name_ar,
                    "name_en": user_type.name_en
                },
                "is_active": current_user.is_active
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Profile update error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"خطأ في تحديث الحساب: {str(e)}"
        )

@router.put("/change-password")
async def change_password(
    password_data: ChangePasswordRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """تغيير كلمة المرور"""
    try:
        # التحقق من كلمة المرور الحالية
        if not verify_password(password_data.current_password, current_user.password_hash):
            raise HTTPException(
                status_code=400,
                detail="كلمة المرور الحالية غير صحيحة"
            )
        
        # التحقق من أن كلمة المرور الجديدة مختلفة
        if verify_password(password_data.new_password, current_user.password_hash):
            raise HTTPException(
                status_code=400,
                detail="كلمة المرور الجديدة يجب أن تكون مختلفة عن الحالية"
            )
        
        # تحديث كلمة المرور
        current_user.password_hash = get_password_hash(password_data.new_password)
        db.commit()
        
        return {
            "success": True,
            "message": "تم تغيير كلمة المرور بنجاح"
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Password change error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"خطأ في تغيير كلمة المرور: {str(e)}"
        )
