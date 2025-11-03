# حل جذري لإصلاح قاعدة البيانات - PowerShell Script
# استخدم DATABASE_URL من Railway Variables

Write-Host "=" * 70 -ForegroundColor Cyan
Write-Host "🔥 حل جذري لإصلاح قاعدة البيانات" -ForegroundColor Cyan
Write-Host "=" * 70 -ForegroundColor Cyan
Write-Host ""

# الخطوة 1: الحصول على DATABASE_URL
Write-Host "1️⃣ نحتاج DATABASE_URL من Railway..." -ForegroundColor Yellow
Write-Host ""
Write-Host "   اذهب إلى Railway Dashboard:" -ForegroundColor White
Write-Host "   → Postgres Service → Variables tab" -ForegroundColor White
Write-Host "   → انسخ قيمة DATABASE_URL" -ForegroundColor White
Write-Host ""
Write-Host "   أو أدخل DATABASE_URL هنا:" -ForegroundColor Yellow
$DATABASE_URL = Read-Host "   DATABASE_URL"

if ([string]::IsNullOrWhiteSpace($DATABASE_URL)) {
    Write-Host ""
    Write-Host "❌ خطأ: DATABASE_URL مطلوب!" -ForegroundColor Red
    exit 1
}

# إصلاح postgres:// إلى postgresql://
if ($DATABASE_URL -like "postgres://*") {
    $DATABASE_URL = $DATABASE_URL -replace "postgres://", "postgresql://"
}

Write-Host ""
Write-Host "✅ تم الحصول على DATABASE_URL" -ForegroundColor Green
Write-Host ""

# الخطوة 2: إنشاء سكريبت Python مؤقت
$pythonScript = @"
import sys
import os
from sqlalchemy import create_engine, text

DATABASE_URL = "$DATABASE_URL"

print("=" * 70)
print("🔥 بدء عملية الإصلاح...")
print("=" * 70)

try:
    engine = create_engine(DATABASE_URL, pool_pre_ping=True)
    
    # اختبار الاتصال
    with engine.connect() as test_conn:
        test_conn.execute(text("SELECT 1"))
    print("✅ تم الاتصال بقاعدة البيانات")
    
    print("\n🗑️  حذف جميع البيانات المرتبطة...")
    
    with engine.begin() as conn:
        # حذف order_items
        print("\n1️⃣ حذف order_items...")
        conn.execute(text("DELETE FROM order_items"))
        print("   ✅ تم")
        
        # حذف orders
        print("\n2️⃣ حذف orders...")
        result = conn.execute(text("DELETE FROM orders"))
        print(f"   ✅ تم حذف {result.rowcount} طلب")
        
        # حذف studio_projects إذا كان موجوداً
        print("\n3️⃣ حذف studio_projects...")
        try:
            result = conn.execute(text("DELETE FROM studio_projects"))
            print(f"   ✅ تم حذف {result.rowcount} مشروع استديو")
        except Exception as e:
            print(f"   ⚠️  لا يوجد جدول studio_projects")
        
        # حذف users
        print("\n4️⃣ حذف users...")
        result = conn.execute(text("DELETE FROM users"))
        users_deleted = result.rowcount
        print(f"   ✅ تم حذف {users_deleted} مستخدم")
        
        print("\n✅ تم مسح قاعدة البيانات بنجاح!")
    
    # إنشاء المستخدمين الجدد
    print("\n" + "=" * 70)
    print("🆕 إنشاء المستخدمين الجدد...")
    print("=" * 70)
    
    # استيراد
    sys.path.insert(0, 'backend')
    from models import User, UserType
    from routers.auth import get_password_hash, normalize_phone
    from sqlalchemy.orm import sessionmaker
    
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    try:
        # إنشاء UserTypes
        admin_type = db.query(UserType).filter(UserType.name_ar == "مدير").first()
        if not admin_type:
            admin_type = UserType(name_ar="مدير", name_en="admin", permissions={"all": True})
            db.add(admin_type)
        employee_type = db.query(UserType).filter(UserType.name_ar == "موظف").first()
        if not employee_type:
            employee_type = UserType(name_ar="موظف", name_en="employee", permissions={"orders": True, "products": True, "services": True})
            db.add(employee_type)
        customer_type = db.query(UserType).filter(UserType.name_ar == "عميل").first()
        if not customer_type:
            customer_type = UserType(name_ar="عميل", name_en="customer", permissions={"orders": True, "view": True})
            db.add(customer_type)
        db.commit()
        
        admin_type = db.query(UserType).filter(UserType.name_ar == "مدير").first()
        employee_type = db.query(UserType).filter(UserType.name_ar == "موظف").first()
        customer_type = db.query(UserType).filter(UserType.name_ar == "عميل").first()
        
        # إنشاء المستخدمين
        users_to_create = [
            ("مدير 1", normalize_phone("0966320114"), None, "admin123", admin_type.id),
            ("مدير 2", normalize_phone("+963955773227"), None, "khawam-p", admin_type.id),
            ("موظف 1", None, "khawam-1@gmail.com", "khawam-1", employee_type.id),
            ("موظف 2", None, "khawam-2@gmail.com", "khawam-2", employee_type.id),
            ("موظف 3", None, "khawam-3@gmail.com", "khawam-3", employee_type.id),
            ("عميل تجريبي", None, "customer@gmail.com", "963214", customer_type.id),
        ]
        
        created = 0
        for name, phone, email, password, user_type_id in users_to_create:
            user = User(
                name=name,
                phone=phone,
                email=email,
                password_hash=get_password_hash(password),
                user_type_id=user_type_id,
                is_active=True
            )
            db.add(user)
            created += 1
            identifier = phone or email
            print(f"   ✅ تم إنشاء: {name} ({identifier})")
        
        db.commit()
        
        # التحقق
        all_users = db.query(User).all()
        users_without_password = [u for u in all_users if not u.password_hash]
        
        print("\n" + "=" * 70)
        print("📊 النتيجة:")
        print(f"   ✅ تم حذف {users_deleted} مستخدم قديم")
        print(f"   ✅ تم إنشاء {created} مستخدم جديد")
        print(f"   📈 العدد الإجمالي: {len(all_users)}")
        if len(users_without_password) == 0:
            print(f"   ✅ جميع المستخدمين لديهم كلمات مرور مشفرة!")
        print("=" * 70)
        print("\n✅ تم إصلاح قاعدة البيانات بنجاح!")
        
    finally:
        db.close()
        
except Exception as e:
    print(f"\n❌ خطأ: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
"@

# حفظ السكريبت المؤقت
$tempScript = "temp_fix_db.py"
$pythonScript | Out-File -FilePath $tempScript -Encoding UTF8

Write-Host ""
Write-Host "2️⃣ تشغيل سكريبت الإصلاح..." -ForegroundColor Yellow
Write-Host ""

# تشغيل السكريبت
python $tempScript

# حذف السكريبت المؤقت
Remove-Item $tempScript -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "=" * 70 -ForegroundColor Cyan
Write-Host "✅ تم الانتهاء!" -ForegroundColor Green
Write-Host "=" * 70 -ForegroundColor Cyan
Write-Host ""
Write-Host "الآن يمكنك تسجيل الدخول باستخدام:" -ForegroundColor White
Write-Host "  - مدير 1: 0966320114 / admin123" -ForegroundColor Cyan
Write-Host "  - مدير 2: +963955773227 / khawam-p" -ForegroundColor Cyan
Write-Host "  - موظف 1: khawam-1@gmail.com / khawam-1" -ForegroundColor Cyan
Write-Host "  - موظف 2: khawam-2@gmail.com / khawam-2" -ForegroundColor Cyan
Write-Host "  - موظف 3: khawam-3@gmail.com / khawam-3" -ForegroundColor Cyan
Write-Host "  - عميل: customer@gmail.com / 963214" -ForegroundColor Cyan
Write-Host ""

