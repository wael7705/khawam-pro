"""
Router لإصلاح تسجيل الدخول - تحديث كلمة المرور مباشرة
"""
from fastapi import APIRouter
from database import engine
from sqlalchemy import text
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def normalize_phone(phone: str) -> str:
    """تطبيع رقم الهاتف"""
    if not phone:
        return ""
    phone_clean = ''.join(filter(str.isdigit, phone))
    if phone_clean.startswith('00'):
        phone_clean = phone_clean[2:]
    if phone_clean.startswith('0963'):
        return '+963' + phone_clean[4:]
    if phone_clean.startswith('963'):
        return '+963' + phone_clean[3:]
    if phone_clean.startswith('0'):
        if len(phone_clean) >= 10:
            return '+963' + phone_clean[2:]
    return '+963' + phone_clean

router = APIRouter()

@router.post("/fix-password")
async def fix_password(phone: str = None, email: str = None, password: str = None):
    """
    تحديث كلمة المرور مباشرة وإعادة hash
    """
    if not password:
        return {"error": "يجب إرسال password"}
    
    conn = None
    try:
        conn = engine.connect()
        
        # البحث عن المستخدم
        user = None
        if phone:
            # تطبيع الهاتف بجميع الأشكال الممكنة
            normalized = normalize_phone(phone)
            user = conn.execute(text("""
                SELECT id, name, phone, email, password_hash 
                FROM users 
                WHERE phone = :phone1 OR phone = :phone2 OR phone = :phone3
            """), {
                "phone1": normalized,
                "phone2": phone,
                "phone3": phone.replace('0', '963', 1) if phone.startswith('0') else None
            }).fetchone()
        elif email:
            user = conn.execute(text("""
                SELECT id, name, phone, email, password_hash 
                FROM users 
                WHERE email = :email1 OR email = :email2
            """), {
                "email1": email,
                "email2": email.lower()
            }).fetchone()
        else:
            conn.close()
            return {"error": "يجب إرسال phone أو email"}
        
        if not user:
            conn.close()
            return {"error": "المستخدم غير موجود"}
        
        user_id, user_name, user_phone, user_email, old_hash = user
        
        # إنشاء hash جديد
        new_hash = pwd_context.hash(password)
        
        # التحقق من أن hash يعمل
        test_verify = pwd_context.verify(password, new_hash)
        
        # تحديث hash في قاعدة البيانات
        if phone:
            conn.execute(text("""
                UPDATE users 
                SET password_hash = :hash
                WHERE id = :id
            """), {
                "hash": new_hash,
                "id": user_id
            })
        elif email:
            conn.execute(text("""
                UPDATE users 
                SET password_hash = :hash
                WHERE id = :id
            """), {
                "hash": new_hash,
                "id": user_id
            })
        
        conn.commit()
        conn.close()
        
        return {
            "success": True,
            "message": "تم تحديث كلمة المرور بنجاح",
            "user": {
                "id": user_id,
                "name": user_name,
                "phone": user_phone,
                "email": user_email
            },
            "hash_info": {
                "old_length": len(old_hash) if old_hash else 0,
                "new_length": len(new_hash),
                "new_preview": new_hash[:50] + "...",
                "test_verify": test_verify
            }
        }
        
    except Exception as e:
        if conn:
            try:
                conn.rollback()
                conn.close()
            except:
                pass
        return {"error": str(e)}


@router.post("/test-login")
async def test_login(phone: str = None, email: str = None, password: str = None):
    """
    اختبار تسجيل الدخول مباشرة
    """
    if not password:
        return {"error": "يجب إرسال password"}
    
    conn = None
    try:
        conn = engine.connect()
        
        # البحث عن المستخدم (بنفس منطق auth.py)
        user = None
        if email:
            user = conn.execute(text("""
                SELECT id, name, phone, email, password_hash, is_active
                FROM users 
                WHERE email = :email1 OR email = :email2
            """), {
                "email1": email,
                "email2": email.lower()
            }).fetchone()
        elif phone:
            normalized = normalize_phone(phone)
            user = conn.execute(text("""
                SELECT id, name, phone, email, password_hash, is_active
                FROM users 
                WHERE phone = :phone1 OR phone = :phone2 OR phone = :phone3
            """), {
                "phone1": normalized,
                "phone2": phone,
                "phone3": phone.replace('0', '963', 1) if phone.startswith('0') else None
            }).fetchone()
        else:
            conn.close()
            return {"error": "يجب إرسال phone أو email"}
        
        if not user:
            conn.close()
            return {"error": "المستخدم غير موجود"}
        
        user_id, user_name, user_phone, user_email, password_hash, is_active = user
        
        if not is_active:
            conn.close()
            return {"error": "الحساب غير نشط"}
        
        # التحقق من كلمة المرور
        verify_result = False
        verify_error = None
        try:
            verify_result = pwd_context.verify(password, password_hash)
        except Exception as e:
            verify_error = str(e)
        
        conn.close()
        
        return {
            "found": True,
            "user": {
                "id": user_id,
                "name": user_name,
                "phone": user_phone,
                "email": user_email,
                "is_active": is_active
            },
            "password_verify": {
                "result": verify_result,
                "error": verify_error,
                "hash_length": len(password_hash) if password_hash else 0,
                "hash_starts_with_$2b": password_hash.startswith('$2b') if password_hash else False
            }
        }
        
    except Exception as e:
        if conn:
            try:
                conn.close()
            except:
                pass
        return {"error": str(e)}

