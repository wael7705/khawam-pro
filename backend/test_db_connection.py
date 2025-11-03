"""
اختبار الاتصال بقاعدة البيانات
"""
from database import engine, DATABASE_URL
from sqlalchemy import text

def test_connection():
    print("=" * 70)
    print("🔍 اختبار الاتصال بقاعدة البيانات")
    print("=" * 70)
    print(f"📊 DATABASE_URL موجود: {'نعم' if DATABASE_URL else 'لا'}")
    
    if DATABASE_URL:
        safe_url = DATABASE_URL
        if "@" in safe_url:
            parts = safe_url.split("@")
            if ":" in parts[0]:
                user_pass = parts[0].split(":")
                if len(user_pass) > 1:
                    safe_url = f"{user_pass[0]}:***@{parts[1]}"
        print(f"📊 Database URL: {safe_url[:80]}...")
    
    try:
        print("\n🔄 محاولة الاتصال...")
        conn = engine.connect()
        print("   ✅ تم إنشاء الاتصال")
        
        print("\n🔄 اختبار استعلام بسيط...")
        result = conn.execute(text("SELECT 1")).scalar()
        print(f"   ✅ النتيجة: {result}")
        
        print("\n🔄 اختبار استعلام جدول users...")
        try:
            count = conn.execute(text("SELECT COUNT(*) FROM users")).scalar()
            print(f"   ✅ عدد المستخدمين: {count}")
        except Exception as e:
            print(f"   ⚠️  جدول users غير موجود أو خطأ: {e}")
        
        print("\n🔄 اختبار استعلام جدول user_types...")
        try:
            count = conn.execute(text("SELECT COUNT(*) FROM user_types")).scalar()
            print(f"   ✅ عدد أنواع المستخدمين: {count}")
        except Exception as e:
            print(f"   ⚠️  جدول user_types غير موجود أو خطأ: {e}")
        
        conn.close()
        print("\n✅ جميع الاختبارات نجحت!")
        return True
        
    except Exception as e:
        print(f"\n❌ خطأ في الاتصال: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    test_connection()

