"""
تحديث name_ar في user_types نهائياً
"""
from fastapi import APIRouter
from database import engine
from sqlalchemy import text

router = APIRouter()

@router.get("/update-user-types")
@router.post("/update-user-types")
async def update_user_types_final():
    """تحديث name_ar في user_types"""
    conn = None
    try:
        conn = engine.connect()
        
        # تحديث user_type id=1
        conn.execute(text("UPDATE user_types SET name_ar = 'مدير' WHERE id = 1"))
        conn.commit()
        
        # تحديث أو إنشاء user_type id=2
        # التحقق من وجود السجل أولاً
        existing = conn.execute(text("SELECT id FROM user_types WHERE id = 2")).fetchone()
        
        if existing:
            # تحديث السجل الموجود
            try:
                # جرب مع type_name
                conn.execute(text("""
                    UPDATE user_types 
                    SET name_ar = 'موظف', type_name = 'موظف' 
                    WHERE id = 2
                """))
                conn.commit()
            except Exception as e:
                # إذا فشل، جرب بدون type_name
                try:
                    conn.execute(text("""
                        UPDATE user_types 
                        SET name_ar = 'موظف' 
                        WHERE id = 2
                    """))
                    conn.commit()
                except:
                    pass
        else:
            # إنشاء سجل جديد
            try:
                # جرب مع type_name
                conn.execute(text("""
                    INSERT INTO user_types (id, name_ar, type_name) 
                    VALUES (2, 'موظف', 'موظف')
                """))
                conn.commit()
            except Exception as e:
                # إذا فشل، جرب بدون type_name
                try:
                    conn.execute(text("""
                        INSERT INTO user_types (id, name_ar) 
                        VALUES (2, 'موظف')
                    """))
                    conn.commit()
                except Exception as e2:
                    print(f"Error creating user_type 2: {e2}")
                    pass
        
        # التحقق
        result = conn.execute(text("SELECT id, name_ar FROM user_types ORDER BY id")).fetchall()
        
        conn.close()
        
        return {
            "success": True,
            "message": "تم تحديث أنواع المستخدمين",
            "user_types": [
                {"id": row[0], "name_ar": row[1]} for row in result
            ]
        }
    except Exception as e:
        if conn:
            try:
                conn.rollback()
                conn.close()
            except:
                pass
        return {"success": False, "error": str(e)}

