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
        # التحقق من وجود العمود type_name أولاً
        try:
            conn.execute(text("""
                UPDATE user_types 
                SET name_ar = 'موظف' 
                WHERE id = 2
            """))
            if conn.execute(text("SELECT COUNT(*) FROM user_types WHERE id = 2")).scalar() == 0:
                # إذا لم يوجد، أنشئه مع جميع الأعمدة المطلوبة
                conn.execute(text("""
                    INSERT INTO user_types (id, name_ar, type_name) 
                    VALUES (2, 'موظف', 'موظف')
                    ON CONFLICT (id) DO UPDATE SET name_ar = 'موظف', type_name = 'موظف'
                """))
            conn.commit()
        except Exception as e:
            # إذا فشل بسبب type_name، جرب بدونها
            try:
                conn.execute(text("""
                    UPDATE user_types 
                    SET name_ar = 'موظف' 
                    WHERE id = 2
                """))
                if conn.execute(text("SELECT COUNT(*) FROM user_types WHERE id = 2")).scalar() == 0:
                    conn.execute(text("""
                        INSERT INTO user_types (id, name_ar) 
                        VALUES (2, 'موظف')
                        ON CONFLICT (id) DO UPDATE SET name_ar = 'موظف'
                    """))
                conn.commit()
            except:
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

