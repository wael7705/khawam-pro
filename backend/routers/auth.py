from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm, HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from sqlalchemy import text
from database import get_db
from models import User, UserType
# UserType removed to avoid ORM column issues - using raw SQL instead
from pydantic import BaseModel, EmailStr, validator
from passlib.context import CryptContext
from passlib.hash import bcrypt_sha256 as legacy_bcrypt_sha256
from passlib.exc import UnknownHashError
# لا نستخدم legacy_bcrypt من passlib لأن bcrypt مباشرة أفضل ويتجنب مشاكل 72 بايت
from jose import JWTError, jwt
from datetime import datetime, timedelta
from typing import Optional
import re
import os
import bcrypt

router = APIRouter()

# Security configuration
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production-use-env-variable")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

# نظام Token مخصص للمستخدمين المصرح لهم (3 مستخدمين: مديرين وموظف)
# قائمة بأرقام الهواتف أو البريد الإلكتروني للمستخدمين المصرح لهم
AUTHORIZED_USERS = [
    "0966320114",  # المستخدم الأول
    "963966320114",  # نفس المستخدم بصيغة مختلفة
    "+963966320114",  # نفس المستخدم بصيغة مختلفة
    # أضف المستخدمين الآخرين هنا
    # "رقم_الهاتف_أو_البريد_الإلكتروني",
]

# Tokens مخصصة للمستخدمين المصرح لهم (يمكن استخدامها مباشرة)
CUSTOM_TOKENS = {
    "0966320114": "admin_token_1",
    "963966320114": "admin_token_1",
    "+963966320114": "admin_token_1",
    # أضف tokens أخرى للمستخدمين الآخرين
    # "رقم_الهاتف": "custom_token_here",
}

# استخدام pbkdf2_sha256 فقط للتشفير الجديد (يدعم أي طول لكلمة المرور)
# لا نستخدم bcrypt في pwd_context لأن bcrypt له حد 72 بايت
pwd_context = CryptContext(
    schemes=["pbkdf2_sha256"],
    default="pbkdf2_sha256",
    pbkdf2_sha256__rounds=320000
)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")
http_bearer_optional = HTTPBearer(auto_error=False)

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
    """التحقق من كلمة المرور - يدعم bcrypt مباشرة و passlib"""
    try:
        if not hashed_password or not plain_password:
            return False
        
        # إزالة المسافات الزائدة من كلمة المرور
        plain_password = plain_password.strip()
        
        # تحديد نوع hash والتحقق بالطريقة المناسبة
        # أولاً: إذا كان bcrypt hash ($2a$, $2b$, $2y$)، استخدم bcrypt مباشرة
        if hashed_password.startswith('$2'):
            try:
                # استخدام bcrypt مباشرة - هذا الأفضل والأسرع للتحقق من bcrypt hashes
                # تحويل password إلى bytes
                password_bytes = plain_password.encode('utf-8')
                
                # تحويل hash إلى bytes (bcrypt يحتاج bytes)
                if isinstance(hashed_password, str):
                    hashed_password_bytes = hashed_password.encode('utf-8')
                else:
                    hashed_password_bytes = hashed_password
                
                # التحقق من كلمة المرور باستخدام bcrypt مباشرة
                # هذا يتجاوز مشاكل passlib مع bcrypt
                result = bcrypt.checkpw(password_bytes, hashed_password_bytes)
                if result:
                    print(f"✅ bcrypt.checkpw verification succeeded")
                    return True
                else:
                    print(f"⚠️ bcrypt.checkpw verification failed (password mismatch)")
            except Exception as bcrypt_error:
                print(f"⚠️ Direct bcrypt.checkpw error: {bcrypt_error}")
                import traceback
                traceback.print_exc()
        
        # ثانياً: إذا كان bcrypt-sha256 hash (legacy)
        if hashed_password.startswith("$bcrypt-sha256$"):
            try:
                # استخدام bcrypt-sha256 من passlib لكن مع معالجة الأخطاء
                # هذا نادر الاستخدام لكن نبقيه للتوافق مع البيانات القديمة
                if legacy_bcrypt_sha256.verify(plain_password, hashed_password):
                    return True
            except Exception as legacy_sha_error:
                # إذا فشل، لا نطبع الخطأ لأن هذا قد يسبب مشاكل
                pass
        
        # ثالثاً: محاولة استخدام pbkdf2_sha256 (للكلمات المرور الجديدة)
        # هذا يدعم أي طول لكلمة المرور بدون مشاكل
        try:
            if pwd_context.verify(plain_password, hashed_password):
                return True
        except UnknownHashError:
            pass
        except Exception as context_error:
            # لا نطبع الخطأ هنا لأن هذا قد يسبب مشاكل
            pass
        
        return False
    except Exception as e:
        print(f"⚠️ Error verifying password: {e}")
        import traceback
        traceback.print_exc()
        return False

def get_password_hash(password: str) -> str:
    """تشفير كلمة المرور"""
    return pwd_context.hash(password)

def normalize_phone(phone: str) -> str:
    """تطبيع رقم الهاتف (مطابق لما في db_rebuild.py)"""
    if not phone:
        return ""
    # إزالة جميع الرموز غير الرقمية
    phone_clean = ''.join(filter(str.isdigit, phone))
    
    # إذا كان يبدأ بـ 0، استبدله بـ 963
    if phone_clean.startswith('0'):
        phone_clean = '963' + phone_clean[1:]
    # إذا لم يبدأ بـ 963، أضفه
    elif not phone_clean.startswith('963'):
        phone_clean = '963' + phone_clean
    
    # إرجاع بدون + (مطابق لقاعدة البيانات)
    return phone_clean

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

def is_authorized_user(username: str) -> bool:
    """التحقق من أن المستخدم من المستخدمين المصرح لهم"""
    username_clean = username.strip()
    
    # التحقق من رقم الهاتف
    if is_valid_phone(username_clean):
        normalized = normalize_phone(username_clean)
        variants = [username_clean, normalized, '+' + normalized]
        if username_clean.startswith('0'):
            variants.extend(['963' + username_clean[1:], '+963' + username_clean[1:]])
        if username_clean.startswith('+963'):
            variants.append(username_clean[1:])
        if username_clean.startswith('963') and not username_clean.startswith('+'):
            variants.append('+' + username_clean)
        
        for variant in variants:
            if variant in AUTHORIZED_USERS:
                return True
    
    # التحقق من البريد الإلكتروني
    if is_valid_email(username_clean):
        if username_clean.lower() in AUTHORIZED_USERS or username_clean in AUTHORIZED_USERS:
            return True
    
    return False

def get_custom_token(username: str) -> Optional[str]:
    """الحصول على token مخصص للمستخدم"""
    username_clean = username.strip()
    
    # التحقق من رقم الهاتف
    if is_valid_phone(username_clean):
        normalized = normalize_phone(username_clean)
        variants = [username_clean, normalized, '+' + normalized]
        if username_clean.startswith('0'):
            variants.extend(['963' + username_clean[1:], '+963' + username_clean[1:]])
        if username_clean.startswith('+963'):
            variants.append(username_clean[1:])
        if username_clean.startswith('963') and not username_clean.startswith('+'):
            variants.append('+' + username_clean)
        
        for variant in variants:
            if variant in CUSTOM_TOKENS:
                return CUSTOM_TOKENS[variant]
    
    # التحقق من البريد الإلكتروني
    if is_valid_email(username_clean):
        if username_clean.lower() in CUSTOM_TOKENS:
            return CUSTOM_TOKENS[username_clean.lower()]
        if username_clean in CUSTOM_TOKENS:
            return CUSTOM_TOKENS[username_clean]
    
    return None

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """إنشاء JWT token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_or_create_customer_user_type(db: Session) -> tuple[int, str]:
    """الحصول على معرف نوع المستخدم 'عميل' أو إنشاؤه إذا لم يكن موجوداً."""
    target_role_ar = "عميل"
    target_role_en = "customer"

    existing = db.execute(
        text(
            """
            SELECT id, name_ar, type_name
            FROM user_types
            WHERE lower(type_name) = :type_name OR name_ar = :name_ar
            ORDER BY id ASC
            LIMIT 1
        """
        ),
        {"type_name": target_role_en, "name_ar": target_role_ar},
    ).fetchone()

    if existing:
        user_type_id, existing_name_ar, existing_type_name = existing
        name_to_use = existing_name_ar or target_role_ar

        if existing_name_ar != name_to_use:
            db.execute(
                text("UPDATE user_types SET name_ar = :name_ar WHERE id = :id"),
                {"name_ar": name_to_use, "id": user_type_id},
            )
            db.commit()

        return user_type_id, name_to_use

    insert_result = db.execute(
        text(
            """
            INSERT INTO user_types (type_name, description, permissions, created_at, name_ar)
            VALUES (:type_name, :description, NULL, NOW(), :name_ar)
            RETURNING id, name_ar
        """
        ),
        {"type_name": target_role_en, "description": target_role_ar, "name_ar": target_role_ar},
    )

    try:
        db.commit()
    except Exception as commit_error:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"تعذر إنشاء نوع المستخدم الافتراضي: {commit_error}",
        )

    new_role = insert_result.fetchone()
    if not new_role:
        raise HTTPException(
            status_code=500,
            detail="تعذر إنشاء نوع المستخدم الافتراضي 'عميل'",
        )

    return new_role[0], new_role[1] or target_role_ar

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    """الحصول على المستخدم الحالي من الـ token - استخدام raw SQL مع دعم Token مخصص"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    # التحقق من Token مخصص أولاً
    if token in CUSTOM_TOKENS.values():
        # Token مخصص - البحث عن المستخدم المرتبط بهذا Token
        for username, custom_token in CUSTOM_TOKENS.items():
            if custom_token == token:
                # البحث عن المستخدم في قاعدة البيانات
                from sqlalchemy import text
                user_row = None
                
                if is_valid_phone(username):
                    normalized = normalize_phone(username)
                    variants = [username, normalized, '+' + normalized]
                    if username.startswith('0'):
                        variants.extend(['963' + username[1:], '+963' + username[1:]])
                    
                    for variant in variants:
                        user_row = db.execute(text("""
                            SELECT id, name, email, phone, password_hash, user_type_id, is_active
                            FROM users
                            WHERE phone = :phone
                        """), {"phone": variant}).fetchone()
                        if user_row:
                            break
                elif is_valid_email(username):
                    user_row = db.execute(text("""
                        SELECT id, name, email, phone, password_hash, user_type_id, is_active
                        FROM users
                        WHERE email = :email
                    """), {"email": username.lower()}).fetchone()
                
                if user_row:
                    user = User()
                    user.id, user.name, user.email, user.phone, user.password_hash, user.user_type_id, user.is_active = user_row
                    if user.is_active:
                        print(f"✅ Custom token validated for user: {user.name}")
                        return user
    
    # التحقق من JWT token
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: int = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    # استخدام raw SQL لتجنب مشكلة UserType ORM
    from sqlalchemy import text
    user_row = db.execute(text("""
        SELECT id, name, email, phone, password_hash, user_type_id, is_active
        FROM users
        WHERE id = :id
    """), {"id": user_id}).fetchone()
    
    if user_row is None:
        raise credentials_exception
    
    # إنشاء كائن User يدوياً (بدون ORM)
    user = User()
    user.id, user.name, user.email, user.phone, user.password_hash, user.user_type_id, user.is_active = user_row
    
    return user

async def get_current_active_user(
    current_user: User = Depends(get_current_user)
):
    """الحصول على المستخدم النشط الحالي"""
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(http_bearer_optional),
    db: Session = Depends(get_db)
) -> Optional[User]:
    """الحصول على المستخدم الحالي (اختياري) - لا يرمي خطأ إذا لم يكن هناك token - مع دعم Token مخصص"""
    if not credentials:
        return None
    
    token = credentials.credentials
    if not token:
        return None
    
    # التحقق من Token مخصص أولاً
    if token in CUSTOM_TOKENS.values():
        for username, custom_token in CUSTOM_TOKENS.items():
            if custom_token == token:
                from sqlalchemy import text
                user_row = None
                
                if is_valid_phone(username):
                    normalized = normalize_phone(username)
                    variants = [username, normalized, '+' + normalized]
                    if username.startswith('0'):
                        variants.extend(['963' + username[1:], '+963' + username[1:]])
                    
                    for variant in variants:
                        user_row = db.execute(text("""
                            SELECT id, name, email, phone, password_hash, user_type_id, is_active
                            FROM users
                            WHERE phone = :phone
                        """), {"phone": variant}).fetchone()
                        if user_row:
                            break
                elif is_valid_email(username):
                    user_row = db.execute(text("""
                        SELECT id, name, email, phone, password_hash, user_type_id, is_active
                        FROM users
                        WHERE email = :email
                    """), {"email": username.lower()}).fetchone()
                
                if user_row:
                    user = User()
                    user.id, user.name, user.email, user.phone, user.password_hash, user.user_type_id, user.is_active = user_row
                    if user.is_active:
                        return user
    
    # التحقق من JWT token
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: int = payload.get("sub")
        if user_id is None:
            return None
    except JWTError:
        return None
    
    try:
        from sqlalchemy import text
        user_row = db.execute(text("""
            SELECT id, name, email, phone, password_hash, user_type_id, is_active
            FROM users
            WHERE id = :id
        """), {"id": user_id}).fetchone()
        
        if user_row is None:
            return None
        
        user = User()
        user.id, user.name, user.email, user.phone, user.password_hash, user.user_type_id, user.is_active = user_row
        
        if not user.is_active:
            return None
        
        return user
    except Exception:
        return None

def require_role(allowed_roles: list[str]):
    """Decorator للتحقق من الصلاحيات"""
    async def role_checker(current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
        user_type = db.query(UserType).filter(UserType.id == current_user.user_type_id).first()
        if not user_type:
            raise HTTPException(status_code=403, detail="User type not found")
        
        role_name = getattr(user_type, 'name_ar', '').lower() if user_type and hasattr(user_type, 'name_ar') else ''
        if role_name not in allowed_roles:
            raise HTTPException(
                status_code=403,
                detail=f"Access denied. Required roles: {', '.join(allowed_roles)}"
            )
        return current_user
    return role_checker

# Endpoints
@router.post("/login")  # تمت إزالة response_model مؤقتاً لتجنب مشكلة serialization
async def login(login_data: LoginRequest, db: Session = Depends(get_db)):
    """تسجيل الدخول باستخدام الهاتف/البريد الإلكتروني وكلمة المرور"""
    try:
        username = login_data.username.strip()
        password = login_data.password
        
        # استخدام raw SQL لتجنب مشكلة UserType ORM
        from sqlalchemy import text
        
        # تحديد نوع المعرف (بريد إلكتروني أم رقم هاتف)
        user_row = None
        normalized_phone = None
        phone_variants = []
        
        if is_valid_email(username):
            # البحث بالبريد الإلكتروني
            user_row = db.execute(text("""
                SELECT id, name, email, phone, password_hash, user_type_id, is_active
                FROM users
                WHERE email = :email1 OR email = :email2
            """), {
                "email1": username.lower(),
                "email2": username
            }).fetchone()
            print(f"🔍 Login attempt with email: {username}, found: {user_row is not None}")
        elif is_valid_phone(username):
            # البحث برقم الهاتف - جرب جميع الأشكال الممكنة
            normalized_phone = normalize_phone(username)
            phone_variants = [username, normalized_phone, '+' + normalized_phone]
            
            if username.startswith('0'):
                phone_variants.extend(['963' + username[1:], '+963' + username[1:]])
            if username.startswith('+963'):
                phone_variants.append(username[1:])
            if username.startswith('963') and not username.startswith('+'):
                phone_variants.append('+' + username)
            
            print(f"🔍 Login attempt with phone: {username}")
            print(f"🔍 Phone variants to try: {phone_variants}")
            
            # البحث في جميع الأشكال
            for variant in phone_variants:
                if variant:
                    user_row = db.execute(text("""
                        SELECT id, name, email, phone, password_hash, user_type_id, is_active
                        FROM users
                        WHERE phone = :phone
                    """), {"phone": variant}).fetchone()
                    if user_row:
                        print(f"✅ Found user with phone variant: {variant}")
                        break
            
            if not user_row:
                # محاولة البحث بجزء من رقم الهاتف (في حالة وجود مسافات أو رموز)
                phone_clean = ''.join(filter(str.isdigit, username))
                if phone_clean:
                    # البحث بآخر 9 أرقام
                    if len(phone_clean) >= 9:
                        last_9_digits = phone_clean[-9:]
                        user_row = db.execute(text("""
                            SELECT id, name, email, phone, password_hash, user_type_id, is_active
                            FROM users
                            WHERE phone LIKE :pattern
                        """), {"pattern": f"%{last_9_digits}"}).fetchone()
                        if user_row:
                            print(f"✅ Found user with phone pattern: %{last_9_digits}")
        else:
            print(f"❌ Invalid username format: {username}")
            raise HTTPException(
                status_code=400,
                detail="الرجاء إدخال رقم هاتف صحيح أو بريد إلكتروني صحيح"
            )
        
        if not user_row:
            print(f"❌ User not found for username: {username}")
            print(f"   Tried phone variants: {phone_variants}")
            raise HTTPException(
                status_code=401,
                detail="اسم المستخدم أو كلمة المرور غير صحيحة"
            )
        
        user_id, user_name, user_email, user_phone, password_hash, user_type_id, is_active = user_row
        
        if not is_active:
            print(f"❌ User account is not active: {user_name}")
            raise HTTPException(
                status_code=403,
                detail="الحساب غير نشط"
            )
        
        # التحقق من كلمة المرور
        print(f"🔐 Verifying password for user: {user_name} (ID: {user_id})")
        print(f"🔐 Stored phone: {user_phone}")
        print(f"🔐 Password hash prefix: {password_hash[:30] if password_hash else 'None'}...")
        verify_result = verify_password(password, password_hash)
        print(f"🔐 Password verification result: {verify_result}")
        
        if not verify_result:
            print(f"❌ Password verification failed for user: {user_name}")
            print(f"   Input password length: {len(password)}")
            print(f"   Hash length: {len(password_hash) if password_hash else 0}")
            raise HTTPException(
                status_code=401,
                detail="اسم المستخدم أو كلمة المرور غير صحيحة"
            )
        
        print(f"✅ Password verified successfully for user: {user_name}")
        
        # الحصول على name_ar من user_types
        user_type_row = db.execute(text("""
            SELECT id, name_ar 
            FROM user_types 
            WHERE id = :id
        """), {"id": user_type_id}).fetchone()
        
        user_type_name_ar = None
        if user_type_row:
            _, user_type_name_ar = user_type_row
        
        # التحقق من أن المستخدم من المستخدمين المصرح لهم - استخدام Token مخصص
        custom_token = get_custom_token(username)
        if custom_token:
            print(f"✅ Using custom token for authorized user: {user_name}")
            access_token = custom_token
        else:
            # إنشاء JWT token عادي
            access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
            access_token = create_access_token(
                data={"sub": user_id},
                expires_delta=access_token_expires
            )
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": user_id,
                "name": user_name,
                "email": user_email,
                "phone": user_phone,
                "user_type": {
                    "id": user_type_id,
                    "name_ar": user_type_name_ar,  # الآن سيتم إرجاع القيمة الصحيحة
                    "name_en": None
                },
                "is_active": is_active
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
    # استخدام raw SQL للحصول على user_type لتجنب مشكلة name_en
    from sqlalchemy import text
    user_type_row = db.execute(text("""
        SELECT id, name_ar 
        FROM user_types 
        WHERE id = :id
    """), {"id": current_user.user_type_id}).fetchone()
    
    user_type_id = current_user.user_type_id
    user_type_name_ar = None
    if user_type_row:
        user_type_id, user_type_name_ar = user_type_row
    
    return {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "phone": current_user.phone,
        "user_type": {
            "id": user_type_id,
            "name_ar": user_type_name_ar,
            "name_en": None  # غير موجود في قاعدة البيانات
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
        
        if not register_data.password:
            raise HTTPException(
                status_code=400,
                detail="كلمة المرور مطلوبة"
            )
        try:
            register_data.password.encode("utf-8")
        except UnicodeEncodeError:
            raise HTTPException(
                status_code=400,
                detail="تنسيق كلمة المرور غير صالح. الرجاء استخدام أحرف صالحة."
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
        
        # الحصول على نوع المستخدم (عميل) أو إنشاؤه إذا لم يكن موجوداً
        user_type_id, user_type_name_ar = get_or_create_customer_user_type(db)
        
        # تشفير كلمة المرور
        password_hash = get_password_hash(register_data.password)
        
        # إنشاء المستخدم الجديد
        new_user = User(
            name=register_data.name,
            email=register_data.email.lower() if register_data.email else None,
            phone=normalize_phone(register_data.phone) if register_data.phone else None,
            password_hash=password_hash,
            user_type_id=user_type_id,
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
                    "id": user_type_id,
                    "name_ar": user_type_name_ar,
                    "name_en": None  # غير موجود في قاعدة البيانات
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
        user_type_id = user_type.id if user_type else current_user.user_type_id
        user_type_name_ar = getattr(user_type, "name_ar", None) if user_type else None
        
        return {
            "success": True,
            "message": "تم تحديث معلومات الحساب بنجاح",
            "user": {
                "id": current_user.id,
                "name": current_user.name,
                "email": current_user.email,
                "phone": current_user.phone,
                "user_type": {
                    "id": user_type_id,
                    "name_ar": user_type_name_ar,
                    "name_en": None
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
