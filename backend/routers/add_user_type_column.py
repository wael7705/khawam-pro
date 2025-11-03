"""
إضافة عمود name_ar إلى جدول user_types
"""
from database import engine
from sqlalchemy import text

def add_name_ar_column():
    """إضافة عمود name_ar إذا لم يكن موجوداً"""
    conn = engine.connect()
    try:
        # التحقق من وجود العمود
        result = conn.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'user_types' AND column_name = 'name_ar'
        """)).fetchone()
        
        if not result:
            # إضافة العمود
            conn.execute(text("ALTER TABLE user_types ADD COLUMN name_ar VARCHAR(50)"))
            conn.commit()
            print("✅ تم إضافة عمود name_ar")
        else:
            print("ℹ️ عمود name_ar موجود بالفعل")
        
        # نفس الشيء لـ name_en
        result = conn.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'user_types' AND column_name = 'name_en'
        """)).fetchone()
        
        if not result:
            conn.execute(text("ALTER TABLE user_types ADD COLUMN name_en VARCHAR(50)"))
            conn.commit()
            print("✅ تم إضافة عمود name_en")
        else:
            print("ℹ️ عمود name_en موجود بالفعل")
        
        conn.close()
        return True
    except Exception as e:
        print(f"❌ Error: {e}")
        conn.rollback()
        conn.close()
        return False

if __name__ == "__main__":
    add_name_ar_column()

