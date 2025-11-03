"""
تحديث بيانات user_types في قاعدة البيانات
"""
from fastapi import APIRouter
from database import engine
from sqlalchemy import text

router = APIRouter()

@router.get("/fix-user-types-data")
@router.post("/fix-user-types-data")
async def fix_user_types_data():
    """تحديث name_ar في user_types"""
    conn = None
    try:
        conn = engine.connect()
        
        # تحديث user_type id=1 ليكون "مدير"
        try:
            conn.execute(text("""
                UPDATE user_types 
                SET name_ar = 'مدير' 
                WHERE id = 1
            """))
            conn.commit()
            type1_updated = True
        except Exception as e:
            conn.rollback()
            type1_updated = False
            error1 = str(e)
        
        # تحديث user_type id=2 ليكون "موظف" (إذا كان موجود)
        try:
            result = conn.execute(text("SELECT id FROM user_types WHERE id = 2")).fetchone()
            if result:
                conn.execute(text("""
                    UPDATE user_types 
                    SET name_ar = 'موظف' 
                    WHERE id = 2
                """))
                conn.commit()
                type2_updated = True
            else:
                # إنشاء user_type جديد للموظف
                conn.execute(text("""
                    INSERT INTO user_types (id, name_ar) 
                    VALUES (2, 'موظف')
                    ON CONFLICT (id) DO UPDATE SET name_ar = 'موظف'
                """))
                conn.commit()
                type2_updated = True
        except Exception as e:
            conn.rollback()
            type2_updated = False
            error2 = str(e)
        
        # التحقق من النتائج
        result = conn.execute(text("SELECT id, name_ar FROM user_types ORDER BY id")).fetchall()
        
        conn.close()
        
        return {
            "success": True,
            "message": "تم تحديث أنواع المستخدمين",
            "type1_updated": type1_updated,
            "type2_updated": type2_updated,
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

