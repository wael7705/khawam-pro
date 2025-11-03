"""
سكريبت لإصلاح قاعدة البيانات مباشرة
تشغيل: python fix_db.py
"""
import sys
import os

# إضافة backend إلى المسار
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, sessionmaker
from dotenv import load_dotenv

# تحميل متغيرات البيئة
load_dotenv()

# الحصول على DATABASE_URL من Railway أو .env
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    print("❌ خطأ: DATABASE_URL غير موجود!")
    print("تأكد من:")
    print("1. وجود ملف .env مع DATABASE_URL")
    print("2. أو وجود متغير البيئة DATABASE_URL")
    sys.exit(1)

# إصلاح postgres:// إلى postgresql://
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

print("=" * 70)
print("🔥 سكريبت إصلاح قاعدة البيانات")
print("=" * 70)
print(f"📊 الاتصال بقاعدة البيانات...")

try:
    # إنشاء اتصال
    engine = create_engine(DATABASE_URL, pool_pre_ping=True)
    
    # اختبار الاتصال
    with engine.connect() as test_conn:
        test_conn.execute(text("SELECT 1"))
    
    print("✅ تم الاتصال بقاعدة البيانات بنجاح")
    
    # بدء العملية
    print("\n" + "=" * 70)
    print("🗑️  حذف البيانات القديمة...")
    print("=" * 70)
    
    with engine.begin() as conn:  # begin() = transaction تلقائية
        # 1. حذف order_items
        print("\n1️⃣ حذف order_items...")
        result = conn.execute(text("DELETE FROM order_items"))
        print(f"   ✅ تم حذف {result.rowcount} عنصر طلب")
        
        # 2. حذف orders
        print("\n2️⃣ حذف orders...")
        result = conn.execute(text("DELETE FROM orders"))
        orders_deleted = result.rowcount
        print(f"   ✅ تم حذف {orders_deleted} طلب")
        
        # 3. حذف users
        print("\n3️⃣ حذف users...")
        result = conn.execute(text("DELETE FROM users"))
        users_deleted = result.rowcount
        print(f"   ✅ تم حذف {users_deleted} مستخدم")
        
        print("\n✅ تم مسح قاعدة البيانات بنجاح!")
    
    # إنشاء المستخدمين الجدد
    print("\n" + "=" * 70)
    print("🆕 إنشاء المستخدمين الجدد...")
    print("=" * 70)
    
    # استيراد Models
    from models import User, UserType
    from routers.auth import get_password_hash, normalize_phone
    
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    try:
        # إنشاء UserTypes إذا لم تكن موجودة
        print("\n📋 التحقق من أنواع المستخدمين...")
        admin_type = db.query(UserType).filter(UserType.name_ar == "مدير").first()
        if not admin_type:
            admin_type = UserType(name_ar="مدير", name_en="admin", permissions={"all": True})
            db.add(admin_type)
            print("   ✅ تم إنشاء نوع 'مدير'")
        
        employee_type = db.query(UserType).filter(UserType.name_ar == "موظف").first()
        if not employee_type:
            employee_type = UserType(name_ar="موظف", name_en="employee", permissions={"orders": True, "products": True, "services": True})
            db.add(employee_type)
            print("   ✅ تم إنشاء نوع 'موظف'")
        
        customer_type = db.query(UserType).filter(UserType.name_ar == "عميل").first()
        if not customer_type:
            customer_type = UserType(name_ar="عميل", name_en="customer", permissions={"orders": True, "view": True})
            db.add(customer_type)
            print("   ✅ تم إنشاء نوع 'عميل'")
        
        db.commit()
        
        # تحديث الاستعلام
        admin_type = db.query(UserType).filter(UserType.name_ar == "مدير").first()
        employee_type = db.query(UserType).filter(UserType.name_ar == "موظف").first()
        customer_type = db.query(UserType).filter(UserType.name_ar == "عميل").first()
        
        # إنشاء المستخدمين
        created_users = []
        
        # مدير 1
        print("\n👤 إنشاء المديرين...")
        phone1 = normalize_phone("0966320114")
        user1 = User(
            name="مدير 1",
            phone=phone1,
            password_hash=get_password_hash("admin123"),
            user_type_id=admin_type.id,
            is_active=True
        )
        db.add(user1)
        created_users.append(f"مدير 1 ({phone1})")
        print(f"   ✅ مدير 1: {phone1} / admin123")
        
        # مدير 2
        phone2 = normalize_phone("+963955773227")
        user2 = User(
            name="مدير 2",
            phone=phone2,
            password_hash=get_password_hash("khawam-p"),
            user_type_id=admin_type.id,
            is_active=True
        )
        db.add(user2)
        created_users.append(f"مدير 2 ({phone2})")
        print(f"   ✅ مدير 2: {phone2} / khawam-p")
        
        # الموظفون
        print("\n👥 إنشاء الموظفين...")
        for i in range(1, 4):
            email = f"khawam-{i}@gmail.com"
            user = User(
                name=f"موظف {i}",
                email=email,
                password_hash=get_password_hash(f"khawam-{i}"),
                user_type_id=employee_type.id,
                is_active=True
            )
            db.add(user)
            created_users.append(f"موظف {i} ({email})")
            print(f"   ✅ موظف {i}: {email} / khawam-{i}")
        
        # العميل
        print("\n👤 إنشاء العميل...")
        customer_user = User(
            name="عميل تجريبي",
            email="customer@gmail.com",
            password_hash=get_password_hash("963214"),
            user_type_id=customer_type.id,
            is_active=True
        )
        db.add(customer_user)
        created_users.append("عميل تجريبي (customer@gmail.com)")
        print(f"   ✅ عميل: customer@gmail.com / 963214")
        
        # حفظ التغييرات
        db.commit()
        print(f"\n💾 تم حفظ {len(created_users)} مستخدم في قاعدة البيانات")
        
        # التحقق النهائي
        print("\n" + "=" * 70)
        print("🔍 التحقق من النتيجة...")
        print("=" * 70)
        
        all_users = db.query(User).all()
        users_without_password = [u for u in all_users if not u.password_hash]
        
        print(f"\n📊 الملخص:")
        print(f"   ✅ تم حذف {orders_deleted} طلب")
        print(f"   ✅ تم حذف {users_deleted} مستخدم قديم")
        print(f"   ✅ تم إنشاء {len(created_users)} مستخدم جديد")
        print(f"   📈 العدد الإجمالي للمستخدمين الآن: {len(all_users)}")
        
        if users_without_password:
            print(f"\n⚠️  تحذير: يوجد {len(users_without_password)} مستخدم بدون كلمة مرور!")
        else:
            print(f"\n✅ نجاح: جميع المستخدمين لديهم كلمات مرور مشفرة!")
        
        print("\n" + "=" * 70)
        print("✅ تم إصلاح قاعدة البيانات بنجاح!")
        print("=" * 70)
        print("\nيمكنك الآن تسجيل الدخول باستخدام:")
        print("  - مدير 1: 0966320114 / admin123")
        print("  - مدير 2: +963955773227 / khawam-p")
        print("  - موظف 1: khawam-1@gmail.com / khawam-1")
        print("  - موظف 2: khawam-2@gmail.com / khawam-2")
        print("  - موظف 3: khawam-3@gmail.com / khawam-3")
        print("  - عميل: customer@gmail.com / 963214")
        print("\n")
        
    finally:
        db.close()
    
except Exception as e:
    print(f"\n❌ خطأ: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

