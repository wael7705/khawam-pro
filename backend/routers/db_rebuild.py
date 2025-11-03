"""
Router لإعادة بناء المستخدمين - حذف وإضافة (حل نهائي بسيط)
"""
from fastapi import APIRouter
from database import engine
from sqlalchemy import text
import bcrypt

def normalize_phone(phone: str) -> str:
    """تطبيع رقم الهاتف"""
    if not phone:
        return ""
    phone = ''.join(filter(str.isdigit, phone))
    if phone.startswith('+'):
        phone = phone[1:]
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
    try:
        # استخدام connection مع autocommit لتجنب مشاكل transactions
        conn = engine.connect()
        
        # خطوة 1: الحصول على أنواع المستخدمين
        admin_type = conn.execute(text("SELECT id FROM user_types LIMIT 1")).fetchone()
        if not admin_type:
            conn.close()
            return {"success": False, "error": "لا يوجد user_types"}
        admin_type_id = admin_type[0]
        
        employee_type = conn.execute(text("SELECT id FROM user_types ORDER BY id LIMIT 1 OFFSET 1")).fetchone()
        employee_type_id = employee_type[0] if employee_type else admin_type_id
        
        deleted_items = {}
        
        # خطوة 2: حذف البيانات المرتبطة (باستخدام autocommit)
        try:
            result = conn.execute(text("DELETE FROM studio_projects"))
            conn.commit()
            deleted_items["studio_projects"] = result.rowcount
        except Exception as e:
            conn.rollback()
            deleted_items["studio_projects"] = 0
        
        try:
            result = conn.execute(text("DELETE FROM order_items"))
            conn.commit()
            deleted_items["order_items"] = result.rowcount
        except Exception as e:
            conn.rollback()
            deleted_items["order_items"] = 0
        
        try:
            result = conn.execute(text("DELETE FROM orders"))
            conn.commit()
            deleted_items["orders"] = result.rowcount
        except Exception as e:
            conn.rollback()
            deleted_items["orders"] = 0
        
        # حذف users
        try:
            result = conn.execute(text("DELETE FROM users"))
            conn.commit()
            deleted_count = result.rowcount
        except Exception as e:
            conn.rollback()
            deleted_count = 0
        
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
        added_count = 0
        
        for user in users_to_add:
            try:
                salt = bcrypt.gensalt()
                password_hash = bcrypt.hashpw(user["password"].encode('utf-8'), salt).decode('utf-8')
                
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
                    added_count += 1
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
                conn.commit()
            except Exception as e:
                conn.rollback()
                added_users.append({
                    "name": user.get("name", "unknown"),
                    "error": str(e)
                })
        
        conn.close()
        
        return {
            "success": True,
            "message": "تم إعادة بناء المستخدمين بنجاح",
            "deleted_items": deleted_items,
            "deleted_users_count": deleted_count,
            "added_count": added_count,
            "users": added_users
        }
        
    except Exception as e:
        return {"success": False, "error": str(e)}
