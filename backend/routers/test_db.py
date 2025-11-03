"""
Router لاختبار الاتصال بقاعدة البيانات
"""
from fastapi import APIRouter
from database import engine, DATABASE_URL
from sqlalchemy import text

router = APIRouter()

@router.get("/test-db")
@router.post("/test-db")
async def test_database_connection():
    """
    اختبار الاتصال بقاعدة البيانات
    """
    try:
        results = {
            "database_url_exists": bool(DATABASE_URL),
            "connection": False,
            "query_test": False,
            "users_table": False,
            "user_types_table": False,
            "errors": []
        }
        
        if DATABASE_URL:
            safe_url = DATABASE_URL
            if "@" in safe_url:
                parts = safe_url.split("@")
                if ":" in parts[0]:
                    user_pass = parts[0].split(":")
                    if len(user_pass) > 1:
                        safe_url = f"{user_pass[0]}:***@{parts[1]}"
            results["database_url"] = safe_url[:100]
        
        # اختبار الاتصال
        try:
            conn = engine.connect()
            results["connection"] = True
            
            # اختبار استعلام بسيط
            try:
                result = conn.execute(text("SELECT 1")).scalar()
                results["query_test"] = True
                results["query_result"] = result
            except Exception as e:
                results["errors"].append(f"Query test error: {str(e)}")
            
            # اختبار جدول users
            try:
                count = conn.execute(text("SELECT COUNT(*) FROM users")).scalar()
                results["users_table"] = True
                results["users_count"] = count
            except Exception as e:
                results["errors"].append(f"Users table error: {str(e)}")
            
            # اختبار جدول user_types
            try:
                count = conn.execute(text("SELECT COUNT(*) FROM user_types")).scalar()
                results["user_types_table"] = True
                results["user_types_count"] = count
            except Exception as e:
                results["errors"].append(f"User types table error: {str(e)}")
            
            conn.close()
            
        except Exception as e:
            results["errors"].append(f"Connection error: {str(e)}")
        
        return {
            "success": results["connection"] and results["query_test"],
            **results
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

