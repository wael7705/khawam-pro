"""
Router لإصلاح جدول user_types
"""
from fastapi import APIRouter
from database import engine
from sqlalchemy import text

router = APIRouter()

@router.post("/fix-user-types")
@router.get("/fix-user-types")
async def fix_user_types():
    """إضافة أعمدة name_ar و name_en إذا لم تكن موجودة"""
    conn = None
    try:
        conn = engine.connect()
        
        # التحقق من وجود name_ar
        result = conn.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'user_types' AND column_name = 'name_ar'
        """)).fetchone()
        
        if not result:
            conn.execute(text("ALTER TABLE user_types ADD COLUMN name_ar VARCHAR(50)"))
            conn.commit()
            name_ar_added = True
        else:
            name_ar_added = False
        
        # التحقق من وجود name_en
        result = conn.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'user_types' AND column_name = 'name_en'
        """)).fetchone()
        
        if not result:
            conn.execute(text("ALTER TABLE user_types ADD COLUMN name_en VARCHAR(50)"))
            conn.commit()
            name_en_added = True
        else:
            name_en_added = False
        
        conn.close()
        
        return {
            "success": True,
            "message": "تم إصلاح جدول user_types",
            "name_ar_added": name_ar_added,
            "name_en_added": name_en_added
        }
    except Exception as e:
        if conn:
            try:
                conn.rollback()
                conn.close()
            except:
                pass
        return {"success": False, "error": str(e)}

