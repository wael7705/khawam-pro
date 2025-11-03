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
    try:
        conn = engine.connect()
        
        try:
            # الحصول على نوع المدير
            admin_type_result = conn.execute(text("SELECT id FROM user_types WHERE name_en = 'admin' OR name_ar = 'مدير'")).fetchone()
            
            if not admin_type_result:
                # إنشاء نوع المدير إذا لم يكن موجوداً
                try:
                    conn.execute(text("""
                        INSERT INTO user_types (name_en, permissions) 
                        VALUES ('admin', '{"all": true}'::jsonb)
                    """))
                    conn.commit()
                except:
                    pass
                admin_type_result = conn.execute(text("SELECT id FROM user_types WHERE name_en = 'admin'")).fetchone()
                if not admin_type_result:
                    # محاولة البحث بأي طريقة
                    admin_type_result = conn.execute(text("SELECT id FROM user_types LIMIT 1")).fetchone()
            
            if not admin_type_result:
                raise Exception("لا يمكن الحصول على أو إنشاء نوع المدير")
            
            admin_type_id = admin_type_result[0]
            
            # تطبيع رقم الهاتف
            phone = normalize_phone("0966320114")
            password_hash = get_password_hash("admin123")
            
            # حذف المستخدم إذا كان موجوداً (لتجنب التكرار)
            trans = conn.begin()
            try:
                conn.execute(text("DELETE FROM users WHERE phone = :phone"), {"phone": phone})
                trans.commit()
            except:
                trans.rollback()
            
            # إضافة المستخدم الجديد
            trans = conn.begin()
            try:
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
                trans.commit()
            except Exception as e:
                trans.rollback()
                raise Exception(f"خطأ في إضافة المستخدم: {str(e)}")
            
            conn.close()
            
            return {
                "success": True,
                "message": "تم إضافة الحساب بنجاح",
                "phone": phone,
                "password": "admin123"
            }
            
        except Exception as e:
            if 'conn' in locals():
                try:
                    conn.close()
                except:
                    pass
            import traceback
            error_msg = str(e) if str(e) else "خطأ غير معروف"
            traceback_str = traceback.format_exc()
            print(f"❌ ERROR in add_admin_account inner: {error_msg}")
            print(f"Traceback: {traceback_str[:500]}")
            raise HTTPException(status_code=500, detail=f"خطأ: {error_msg}")
            
    except Exception as e:
        import traceback
        error_msg = str(e) if str(e) else "خطأ غير معروف"
        traceback_str = traceback.format_exc()
        print(f"❌ ERROR in add_admin_account outer: {error_msg}")
        print(f"Traceback: {traceback_str[:500]}")
        raise HTTPException(status_code=500, detail=f"خطأ: {error_msg}")

@router.get("/add-password")
@router.post("/add-password")
async def add_password_to_admin(name: str = None, password: str = "khawam-p"):
    """
    إضافة كلمة مرور للمدير الموجود - حل بسيط جداً
    """
    try:
        conn = engine.connect()
        
        try:
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
                    trans = conn.begin()
                    conn.execute(text("""
                        UPDATE users 
                        SET password_hash = :password_hash
                        WHERE id = :user_id
                    """), {
                        'password_hash': password_hash,
                        'user_id': user_id
                    })
                    trans.commit()
                    updated_count += 1
                except Exception as e:
                    if 'trans' in locals():
                        trans.rollback()
            
            conn.close()
            
            return {
                "success": True,
                "updated_count": updated_count,
                "password": password,
                "users": [{"id": row[0], "name": row[1]} for row in result],
                "message": f"تم تحديث كلمة المرور لـ {updated_count} مستخدم - كلمة المرور: {password}"
            }
            
        except Exception as e:
            if 'conn' in locals():
                conn.close()
            raise HTTPException(status_code=500, detail=f"خطأ: {str(e)}")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"خطأ: {str(e)}")
