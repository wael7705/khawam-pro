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
    try:
        # خطوة 1: الحصول على أنواع المستخدمين
        conn1 = engine.connect()
        admin_type = conn1.execute(text("SELECT id FROM user_types LIMIT 1")).fetchone()
        if not admin_type:
            conn1.close()
            return {"success": False, "error": "لا يوجد user_types"}
        admin_type_id = admin_type[0]
        
        employee_type = conn1.execute(text("SELECT id FROM user_types ORDER BY id LIMIT 1 OFFSET 1")).fetchone()
        if not employee_type:
            employee_type_id = admin_type_id
        else:
            employee_type_id = employee_type[0]
        conn1.close()
        
        deleted_items = {}
        deleted_count = 0
        
        # خطوة 2: حذف البيانات المرتبطة - استخدام connections منفصلة
        # حذف studio_projects
        try:
            conn2 = engine.connect()
            trans = conn2.begin()
            result = conn2.execute(text("DELETE FROM studio_projects"))
            trans.commit()
            deleted_items["studio_projects"] = result.rowcount
            conn2.close()
        except Exception as e:
            try:
                conn2.close()
            except:
                pass
            deleted_items["studio_projects"] = 0
        
        # حذف order_items
        try:
            conn3 = engine.connect()
            trans = conn3.begin()
            result = conn3.execute(text("DELETE FROM order_items"))
            trans.commit()
            deleted_items["order_items"] = result.rowcount
            conn3.close()
        except Exception as e:
            try:
                conn3.close()
            except:
                pass
            deleted_items["order_items"] = 0
        
        # حذف orders
        try:
            conn4 = engine.connect()
            trans = conn4.begin()
            result = conn4.execute(text("DELETE FROM orders"))
            trans.commit()
            deleted_items["orders"] = result.rowcount
            conn4.close()
        except Exception as e:
            try:
                conn4.close()
            except:
                pass
            deleted_items["orders"] = 0
        
        # حذف users
        try:
            conn5 = engine.connect()
            trans = conn5.begin()
            result = conn5.execute(text("DELETE FROM users"))
            trans.commit()
            deleted_count = result.rowcount
            conn5.close()
        except Exception as e:
            try:
                conn5.close()
            except:
                pass
        
        # خطوة 3: إضافة المستخدمين الجدد - استخدام connection منفصل
        conn6 = engine.connect()
        trans = conn6.begin()
        
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
        
        try:
            for user in users_to_add:
                # إنشاء hash كلمة المرور
                salt = bcrypt.gensalt()
                password_hash = bcrypt.hashpw(user["password"].encode('utf-8'), salt).decode('utf-8')
                
                if "phone" in user:
                    conn6.execute(text("""
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
                    conn6.execute(text("""
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
            
            trans.commit()
            conn6.close()
            
            return {
                "success": True,
                "message": "تم إعادة بناء المستخدمين بنجاح",
                "deleted_items": deleted_items,
                "deleted_users_count": deleted_count,
                "added_count": added_count,
                "users": added_users
            }
            
        except Exception as e:
            trans.rollback()
            conn6.close()
            return {
                "success": False,
                "error": str(e),
                "deleted_items": deleted_items,
                "deleted_users_count": deleted_count
            }
            
    except Exception as e:
        return {"success": False, "error": str(e)}
