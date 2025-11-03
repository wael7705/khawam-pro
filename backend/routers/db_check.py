"""
Router للتحقق من قاعدة البيانات
"""
from fastapi import APIRouter
from database import engine
from sqlalchemy import text

router = APIRouter()

@router.get("/check-users")
async def check_users():
    """التحقق من المستخدمين الموجودين"""
    conn = None
    try:
        conn = engine.connect()
        
        # جلب جميع المستخدمين
        users = conn.execute(text("""
            SELECT id, name, phone, email, 
                   LENGTH(password_hash) as hash_length,
                   password_hash as full_hash
            FROM users
            ORDER BY id
        """)).fetchall()
        
        result = []
        for u in users:
            hash_preview = u[5][:50] + "..." if u[5] and len(u[5]) > 50 else u[5]
            result.append({
                "id": u[0],
                "name": u[1],
                "phone": u[2],
                "email": u[3],
                "hash_length": u[4],
                "hash_preview": hash_preview,
                "hash_full": u[5] if u[5] else None
            })
        
        conn.close()
        return {"success": True, "users": result, "count": len(result)}
        
    except Exception as e:
        if conn:
            try:
                conn.close()
            except:
                pass
        return {"success": False, "error": str(e)}

