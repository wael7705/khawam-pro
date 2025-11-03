"""
Simple and direct setup endpoint that uses raw SQL to guarantee execution
"""
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from database import get_db, engine
from routers.auth import get_password_hash, normalize_phone
import os

router = APIRouter()

@router.get("/add-admin")
@router.post("/add-admin")
async def add_admin_account():
    """
    إضافة حساب مدير جديد - 0966320114 / admin123
    """
    conn = None
    try:
        conn = engine.connect()
        
        # الحصول على نوع المدير - استخدام نفس طريقة test_db
        admin_type_result = conn.execute(text("SELECT id FROM user_types WHERE name_en = 'admin' OR name_ar = 'مدير'")).fetchone()
        
        if not admin_type_result:
            # محاولة البحث بأي نوع موجود
            admin_type_result = conn.execute(text("SELECT id FROM user_types LIMIT 1")).fetchone()
        
        if not admin_type_result:
            # إنشاء نوع المدير
            try:
                with conn.begin():
                    conn.execute(text("""
                        INSERT INTO user_types (name_en, permissions) 
                        VALUES ('admin', '{"all": true}'::jsonb)
                    """))
                admin_type_result = conn.execute(text("SELECT id FROM user_types WHERE name_en = 'admin'")).fetchone()
            except Exception as e:
                # إذا فشل، جرب البحث مرة أخرى
                admin_type_result = conn.execute(text("SELECT id FROM user_types LIMIT 1")).fetchone()
        
        if not admin_type_result:
            return {
                "success": False,
                "message": "لا يمكن الحصول على نوع المدير"
            }
        
        admin_type_id = admin_type_result[0]
        
        # تطبيع رقم الهاتف
        phone = normalize_phone("0966320114")
        password_hash = get_password_hash("admin123")
        
        # حذف المستخدم إذا كان موجوداً (لتجنب التكرار)
        try:
            with conn.begin():
                conn.execute(text("DELETE FROM users WHERE phone = :phone"), {"phone": phone})
        except:
            pass  # لا مشكلة إذا لم يكن موجود
        
        # إضافة المستخدم الجديد
        with conn.begin():
            conn.execute(text("""
                INSERT INTO users (name, phone, password_hash, user_type_id, is_active)
                VALUES (:name, :phone, :password_hash, :user_type_id, :is_active)
            """), {
                'name': 'مدير 1',
                'phone': phone,
                'password_hash': password_hash,
                'user_type_id': admin_type_id,
                'is_active': True
            })
        
        conn.close()
        
        return {
            "success": True,
            "message": "تم إضافة الحساب بنجاح",
            "phone": phone,
            "password": "admin123",
            "admin_type_id": admin_type_id
        }
        
    except Exception as e:
        if conn:
            try:
                conn.close()
            except:
                pass
        error_msg = str(e) if str(e) else "خطأ غير معروف"
        import traceback
        traceback_str = traceback.format_exc()
        print(f"❌ ERROR: {error_msg}")
        print(f"Traceback: {traceback_str[:500]}")
        raise HTTPException(status_code=500, detail=f"خطأ: {error_msg}")

@router.get("/add-password")
@router.post("/add-password")
async def add_password_to_admin(name: str = None, password: str = "khawam-p"):
    """
    إضافة كلمة مرور للمدير الموجود - حل بسيط جداً
    """
    conn = None
    try:
        conn = engine.connect()
        
        # البحث البسيط عن المستخدمين - بدون JOIN
        if name:
            search_name = f"%{name}%"
            result = conn.execute(text("""
                SELECT id, name, phone, email 
                FROM users 
                WHERE name LIKE :name
                LIMIT 10
            """), {'name': search_name}).fetchall()
        else:
            # البحث عن أي مستخدم يحتوي على "خوام" أو "أياد" في الاسم
            result = conn.execute(text("""
                SELECT id, name, phone, email
                FROM users 
                WHERE name LIKE '%خوام%' OR name LIKE '%أياد%' OR name LIKE '%Khawam%' OR name LIKE '%ayad%'
                LIMIT 10
            """)).fetchall()
        
        if not result:
            conn.close()
            return {
                "success": False,
                "message": "لم يتم العثور على مستخدمين"
            }
        
        # تحديث كلمة المرور
        password_hash = get_password_hash(password)
        updated_count = 0
        
        for row in result:
            user_id = row[0]
            try:
                with conn.begin():
                    conn.execute(text("""
                        UPDATE users 
                        SET password_hash = :password_hash
                        WHERE id = :user_id
                    """), {
                        'password_hash': password_hash,
                        'user_id': user_id
                    })
                updated_count += 1
            except Exception as e:
                print(f"⚠️  خطأ في تحديث المستخدم ID {user_id}: {e}")
        
        conn.close()
        
        return {
            "success": True,
            "updated_count": updated_count,
            "password": password,
            "users": [{"id": row[0], "name": row[1]} for row in result],
            "message": f"تم تحديث كلمة المرور لـ {updated_count} مستخدم - كلمة المرور: {password}"
        }
        
    except Exception as e:
        if conn:
            try:
                conn.close()
            except:
                pass
        error_msg = str(e) if str(e) else "خطأ غير معروف"
        raise HTTPException(status_code=500, detail=f"خطأ: {error_msg}")
