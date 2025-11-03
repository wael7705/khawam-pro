"""
تحديث name_ar مباشرة في قاعدة البيانات
"""
from database import engine
from sqlalchemy import text

def update_user_types():
    conn = engine.connect()
    try:
        # تحديث user_type id=1
        conn.execute(text("UPDATE user_types SET name_ar = 'مدير' WHERE id = 1"))
        conn.commit()
        print("✅ تم تحديث user_type 1 إلى 'مدير'")
        
        # تحديث أو إنشاء user_type id=2
        conn.execute(text("""
            INSERT INTO user_types (id, name_ar) 
            VALUES (2, 'موظف')
            ON CONFLICT (id) DO UPDATE SET name_ar = 'موظف'
        """))
        conn.commit()
        print("✅ تم تحديث/إنشاء user_type 2 إلى 'موظف'")
        
        # التحقق
        result = conn.execute(text("SELECT id, name_ar FROM user_types ORDER BY id")).fetchall()
        print("\n📋 أنواع المستخدمين الحالية:")
        for row in result:
            print(f"  - ID {row[0]}: {row[1]}")
        
        conn.close()
        return True
    except Exception as e:
        print(f"❌ Error: {e}")
        if conn:
            conn.rollback()
            conn.close()
        return False

if __name__ == "__main__":
    update_user_types()

