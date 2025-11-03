"""
Router بسيط جداً لإصلاح قاعدة البيانات - بدون أي تعقيدات
"""
from fastapi import APIRouter
from database import engine
from sqlalchemy import text
from routers.auth import get_password_hash, normalize_phone

router = APIRouter()

@router.get("/fix-admin")
@router.post("/fix-admin")
async def fix_admin():
    """إضافة مدير بسيط - 0966320114 / admin123"""
    conn = None
    try:
        conn = engine.connect()
        
        # خطوة 1: الحصول على admin_type_id
        result = conn.execute(text("SELECT id FROM user_types WHERE name_en = 'admin' LIMIT 1")).fetchone()
        if not result:
            result = conn.execute(text("SELECT id FROM user_types LIMIT 1")).fetchone()
        
        if not result:
            return {"success": False, "error": "لا يوجد user_types"}
        
        admin_type_id = result[0]
        
        # خطوة 2: تطبيع الهاتف وكلمة المرور
        phone = normalize_phone("0966320114")
        password_hash = get_password_hash("admin123")
        
        # خطوة 3: حذف القديم
        try:
            with conn.begin():
                conn.execute(text("DELETE FROM users WHERE phone = :p"), {"p": phone})
        except:
            pass
        
        # خطوة 4: إضافة الجديد
        with conn.begin():
            conn.execute(text("""
                INSERT INTO users (name, phone, password_hash, user_type_id, is_active)
                VALUES ('مدير 1', :p, :h, :t, true)
            """), {
                "p": phone,
                "h": password_hash,
                "t": admin_type_id
            })
        
        conn.close()
        return {
            "success": True,
            "message": "تم إضافة المدير بنجاح",
            "phone": phone,
            "password": "admin123"
        }
        
    except Exception as e:
        if conn:
            try:
                conn.close()
            except:
                pass
        return {"success": False, "error": str(e)}

