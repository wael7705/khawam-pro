"""
Router بسيط جداً لإصلاح قاعدة البيانات - بدون أي تعقيدات
"""
from fastapi import APIRouter
from database import engine
from sqlalchemy import text
import bcrypt

def normalize_phone(phone: str) -> str:
    """تطبيع رقم الهاتف"""
    if not phone:
        return ""
    # إزالة المسافات والأحرف غير الرقمية
    phone = ''.join(filter(str.isdigit, phone))
    # التأكد من أن يبدأ بـ 963
    if phone.startswith('0'):
        phone = '963' + phone[1:]
    elif not phone.startswith('963'):
        phone = '963' + phone
    return phone

router = APIRouter()

@router.get("/fix-admin")
@router.post("/fix-admin")
async def fix_admin():
    """إضافة مدير بسيط - 0966320114 / admin123"""
    conn = None
    try:
        conn = engine.connect()
        
        # خطوة 1: الحصول على admin_type_id - بدون الاعتماد على name_en
        # جرب البحث بدون name_en أولاً
        result = conn.execute(text("SELECT id FROM user_types LIMIT 1")).fetchone()
        
        # إذا لم يوجد، أنشئ واحد
        if not result:
            try:
                with conn.begin():
                    # محاولة إنشاء بنوع مختلف حسب ما يدعمه الجدول
                    try:
                        conn.execute(text("INSERT INTO user_types (name_ar) VALUES ('مدير')"))
                    except:
                        # إذا name_ar غير موجود، جرب بدون أعمدة
                        conn.execute(text("INSERT INTO user_types DEFAULT VALUES"))
                result = conn.execute(text("SELECT id FROM user_types ORDER BY id DESC LIMIT 1")).fetchone()
            except:
                pass
        
        if not result:
            return {"success": False, "error": "لا يوجد user_types"}
        
        admin_type_id = result[0]
        
        # خطوة 2: تطبيع الهاتف وكلمة المرور
        phone = normalize_phone("0966320114")
        # استخدام bcrypt مباشرة
        salt = bcrypt.gensalt()
        password_hash = bcrypt.hashpw("admin123".encode('utf-8'), salt).decode('utf-8')
        
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

