"""
Router لاختبار التحقق من كلمة المرور
"""
from fastapi import APIRouter
from database import engine
from sqlalchemy import text
from routers.auth import verify_password, get_password_hash

router = APIRouter()

@router.get("/test-password")
@router.post("/test-password")
async def test_password(email: str = None, password: str = None):
    """اختبار التحقق من كلمة المرور"""
    try:
        conn = engine.connect()
        
        if not email or not password:
            return {"error": "يجب إرسال email و password"}
        
        # البحث عن المستخدم
        user = conn.execute(text("""
            SELECT id, name, email, phone, password_hash 
            FROM users 
            WHERE email = :email OR email = :email_lower
        """), {
            "email": email,
            "email_lower": email.lower()
        }).fetchone()
        
        if not user:
            conn.close()
            return {"error": "المستخدم غير موجود"}
        
        user_id, user_name, user_email, user_phone, password_hash = user
        
        # إنشاء hash جديد للاختبار
        new_hash = get_password_hash(password)
        
        # اختبار verify
        verify_result = False
        verify_error = None
        try:
            verify_result = verify_password(password, password_hash)
        except Exception as e:
            verify_error = str(e)
        
        conn.close()
        
        return {
            "success": True,
            "user": {
                "id": user_id,
                "name": user_name,
                "email": user_email,
                "phone": user_phone
            },
            "password_hash": {
                "exists": bool(password_hash),
                "length": len(password_hash) if password_hash else 0,
                "starts_with_$2b": password_hash.startswith('$2b') if password_hash else False,
                "preview": password_hash[:50] + "..." if password_hash and len(password_hash) > 50 else password_hash
            },
            "verify": {
                "result": verify_result,
                "error": verify_error
            },
            "new_hash": {
                "length": len(new_hash),
                "preview": new_hash[:50] + "..."
            }
        }
        
    except Exception as e:
        return {"error": str(e)}

