"""
سكريبت لاختبار تسجيل الدخول والتحقق من وجود المستخدمين
"""
from database import SessionLocal
from models import User, UserType
from routers.auth import normalize_phone, get_password_hash, verify_password
from sqlalchemy import text

def test_normalize_phone():
    """اختبار تطبيع رقم الهاتف"""
    test_cases = [
        ("0966320114", "+96366320114"),
        ("+963955773227", "+963955773227"),
        ("963955773227", "+963955773227"),
        ("0096366320114", "+96366320114"),
    ]
    
    print("اختبار تطبيع أرقام الهاتف:")
    for input_phone, expected in test_cases:
        result = normalize_phone(input_phone)
        status = "✅" if result == expected else "❌"
        print(f"{status} {input_phone} -> {result} (متوقع: {expected})")

def check_users(db):
    """التحقق من وجود المستخدمين في قاعدة البيانات"""
    print("\nالتحقق من وجود المستخدمين:")
    
    # المدير الأول
    phone1 = normalize_phone("0966320114")
    user1 = db.query(User).filter(User.phone == phone1).first()
    print(f"المدير 1 ({phone1}): {'✅ موجود' if user1 else '❌ غير موجود'}")
    if user1:
        print(f"  - الاسم: {user1.name}")
        print(f"  - كلمة المرور: {'✅ موجودة' if user1.password_hash else '❌ غير موجودة'}")
        if user1.password_hash:
            test_password = verify_password("admin123", user1.password_hash)
            print(f"  - التحقق من كلمة المرور: {'✅ صحيحة' if test_password else '❌ غير صحيحة'}")
    
    # المدير الثاني
    phone2 = normalize_phone("+963955773227")
    user2 = db.query(User).filter(User.phone == phone2).first()
    print(f"المدير 2 ({phone2}): {'✅ موجود' if user2 else '❌ غير موجود'}")
    
    # الموظفون
    user3 = db.query(User).filter(User.email == "khawam-1@gmail.com").first()
    print(f"الموظف 1 (khawam-1@gmail.com): {'✅ موجود' if user3 else '❌ غير موجود'}")
    
    # العميل
    user4 = db.query(User).filter(User.email == "customer@gmail.com").first()
    print(f"العميل (customer@gmail.com): {'✅ موجود' if user4 else '❌ غير موجود'}")

def test_login_attempt(db):
    """محاولة تسجيل الدخول"""
    print("\nاختبار تسجيل الدخول:")
    
    username = "0966320114"
    password = "admin123"
    
    # تطبيع رقم الهاتف
    normalized = normalize_phone(username)
    print(f"رقم الهاتف المدخل: {username}")
    print(f"رقم الهاتف المطبيع: {normalized}")
    
    # البحث عن المستخدم
    user = db.query(User).filter(User.phone == normalized).first()
    
    if not user:
        print("❌ المستخدم غير موجود في قاعدة البيانات")
        print(f"بحث عن رقم: {normalized}")
        
        # محاولة البحث بطرق أخرى
        print("\nمحاولة البحث بطرق أخرى:")
        all_users = db.query(User).all()
        print(f"إجمالي المستخدمين في قاعدة البيانات: {len(all_users)}")
        for u in all_users:
            print(f"  - {u.name}: phone={u.phone}, email={u.email}")
        return False
    
    print(f"✅ المستخدم موجود: {user.name}")
    print(f"  - كلمة المرور موجودة: {'✅' if user.password_hash else '❌'}")
    
    if user.password_hash:
        is_valid = verify_password(password, user.password_hash)
        print(f"  - التحقق من كلمة المرور: {'✅ صحيحة' if is_valid else '❌ غير صحيحة'}")
        return is_valid
    
    return False

if __name__ == "__main__":
    db = SessionLocal()
    try:
        test_normalize_phone()
        check_users(db)
        test_login_attempt(db)
        
        print("\n" + "="*50)
        print("التوصية: إذا كان المستخدم غير موجود، قم بتشغيل:")
        print("python backend/init_users.py")
        print("="*50)
    finally:
        db.close()

