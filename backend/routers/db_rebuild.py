"""
Router لإعادة بناء المستخدمين - حذف وإضافة
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
    # إزالة + من البداية
    if phone.startswith('+'):
        phone = phone[1:]
    # التأكد من أن يبدأ بـ 963
    if phone.startswith('0'):
        phone = '963' + phone[1:]
    elif not phone.startswith('963'):
        phone = '963' + phone
    return phone

router = APIRouter()

@router.get("/rebuild-users")
@router.post("/rebuild-users")
async def rebuild_users():
    """
    حذف جميع المستخدمين وإضافة مستخدمين جدد
    """
    conn = None
    try:
        conn = engine.connect()
        
        # خطوة 1: الحصول على أنواع المستخدمين
        admin_type = conn.execute(text("SELECT id FROM user_types LIMIT 1")).fetchone()
        if not admin_type:
            return {"success": False, "error": "لا يوجد user_types"}
        admin_type_id = admin_type[0]
        
        # البحث عن employee type
        employee_type = conn.execute(text("SELECT id FROM user_types ORDER BY id LIMIT 1 OFFSET 1")).fetchone()
        if not employee_type:
            employee_type_id = admin_type_id  # استخدام نفس ID إذا لم يوجد
        else:
            employee_type_id = employee_type[0]
        
        deleted_count = 0
        added_count = 0
        
        # خطوة 2: حذف جميع المستخدمين
        try:
            with conn.begin():
                result = conn.execute(text("DELETE FROM users"))
                deleted_count = result.rowcount
        except Exception as e:
            print(f"⚠️ خطأ في الحذف: {e}")
        
        # خطوة 3: إضافة المستخدمين الجدد
        users_to_add = [
            {
                "name": "وائل ناصر",
                "phone": normalize_phone("0966320114"),
                "password": "admin123",
                "user_type_id": admin_type_id
            },
            {
                "name": "اياد خوام",
                "phone": normalize_phone("+963955773227"),
                "password": "khawam-pmrx",
                "user_type_id": admin_type_id
            },
            {
                "name": "نسرين",
                "email": "khawam-1@gmail.com",
                "password": "khawam-1",
                "user_type_id": employee_type_id
            }
        ]
        
        added_users = []
        
        for user in users_to_add:
            try:
                # إنشاء hash كلمة المرور
                salt = bcrypt.gensalt()
                password_hash = bcrypt.hashpw(user["password"].encode('utf-8'), salt).decode('utf-8')
                
                with conn.begin():
                    if "phone" in user:
                        conn.execute(text("""
                            INSERT INTO users (name, phone, password_hash, user_type_id, is_active)
                            VALUES (:name, :phone, :hash, :type_id, true)
                        """), {
                            "name": user["name"],
                            "phone": user["phone"],
                            "hash": password_hash,
                            "type_id": user["user_type_id"]
                        })
                        added_users.append({
                            "name": user["name"],
                            "phone": user["phone"],
                            "password": user["password"]
                        })
                    elif "email" in user:
                        conn.execute(text("""
                            INSERT INTO users (name, email, password_hash, user_type_id, is_active)
                            VALUES (:name, :email, :hash, :type_id, true)
                        """), {
                            "name": user["name"],
                            "email": user["email"],
                            "hash": password_hash,
                            "type_id": user["user_type_id"]
                        })
                        added_users.append({
                            "name": user["name"],
                            "email": user["email"],
                            "password": user["password"]
                        })
                added_count += 1
            except Exception as e:
                print(f"⚠️ خطأ في إضافة {user['name']}: {e}")
        
        conn.close()
        
        return {
            "success": True,
            "message": "تم إعادة بناء المستخدمين بنجاح",
            "deleted_count": deleted_count,
            "added_count": added_count,
            "users": added_users
        }
        
    except Exception as e:
        if conn:
            try:
                conn.close()
            except:
                pass
        return {"success": False, "error": str(e)}

