"""
Script to initialize user types and create default users
Run this script once to set up the initial user structure
"""
from database import SessionLocal, engine
from models import Base, UserType, User, PaymentSettings
from routers.auth import get_password_hash, normalize_phone
from sqlalchemy import text

def init_user_types(db):
    """إنشاء أنواع المستخدمين"""
    user_types_data = [
        {"name_ar": "مدير", "name_en": "admin", "permissions": {"all": True}},
        {"name_ar": "موظف", "name_en": "employee", "permissions": {"orders": True, "products": True, "services": True}},
        {"name_ar": "عميل", "name_en": "customer", "permissions": {"orders": True, "view": True}}
    ]
    
    for ut_data in user_types_data:
        existing = db.query(UserType).filter(UserType.name_ar == ut_data["name_ar"]).first()
        if not existing:
            user_type = UserType(**ut_data)
            db.add(user_type)
            print(f"✅ Created user type: {ut_data['name_ar']}")
        else:
            print(f"ℹ️ User type already exists: {ut_data['name_ar']}")
    
    db.commit()

def create_user(db, name, email=None, phone=None, password, user_type_name_ar):
    """إنشاء مستخدم جديد"""
    user_type = db.query(UserType).filter(UserType.name_ar == user_type_name_ar).first()
    if not user_type:
        print(f"❌ User type not found: {user_type_name_ar}")
        return
    
    # تطبيع رقم الهاتف إذا كان موجوداً
    if phone:
        phone = normalize_phone(phone)
        # التحقق من عدم وجود مستخدم آخر بنفس الرقم
        existing = db.query(User).filter(User.phone == phone).first()
        if existing:
            print(f"ℹ️ User with phone {phone} already exists, skipping...")
            return
    
    # التحقق من عدم وجود مستخدم آخر بنفس البريد الإلكتروني
    if email:
        email_lower = email.lower()
        existing = db.query(User).filter(User.email == email_lower).first()
        if existing:
            print(f"ℹ️ User with email {email} already exists, skipping...")
            return
    
    # التحقق من وجود إما هاتف أو بريد إلكتروني
    if not phone and not email:
        print(f"❌ User must have either phone or email: {name}")
        return
    
    password_hash = get_password_hash(password)
    
    user = User(
        name=name,
        email=email.lower() if email else None,
        phone=phone if phone else None,
        password_hash=password_hash,
        user_type_id=user_type.id,
        is_active=True
    )
    
    db.add(user)
    print(f"✅ Created user: {name} ({user_type_name_ar})")

def init_default_users(db):
    """إنشاء المستخدمين الافتراضيين"""
    
    # المديرون
    create_user(db, 
                name="مدير 1",
                phone="0966320114",
                password="admin123",
                user_type_name_ar="مدير")
    
    create_user(db,
                name="مدير 2", 
                phone="+963955773227",
                password="khawam-p",
                user_type_name_ar="مدير")
    
    # الموظفون
    create_user(db,
                name="موظف 1",
                email="khawam-1@gmail.com",
                password="khawam-1",
                user_type_name_ar="موظف")
    
    create_user(db,
                name="موظف 2",
                email="khawam-2@gmail.com",
                password="khawam-2",
                user_type_name_ar="موظف")
    
    create_user(db,
                name="موظف 3",
                email="khawam-3@gmail.com",
                password="khawam-3",
                user_type_name_ar="موظف")
    
    # العميل
    create_user(db,
                name="عميل تجريبي",
                email="customer@gmail.com",
                password="963214",
                user_type_name_ar="عميل")
    
    db.commit()

def ensure_tables():
    """التأكد من إنشاء الجداول"""
    try:
        # إنشاء جداول جديدة فقط
        try:
            Base.metadata.create_all(bind=engine, tables=[
                UserType.__table__,
                PaymentSettings.__table__
            ])
        except Exception as e:
            print(f"ℹ️ Tables might already exist: {e}")
        
        # إضافة الأعمدة الجديدة إلى جدول users إذا لم تكن موجودة
        db = SessionLocal()
        try:
            from sqlalchemy import inspect, text
            inspector = inspect(engine)
            
            # التحقق من وجود الأعمدة في جدول users
            if 'users' in inspector.get_table_names():
                columns = [col['name'] for col in inspector.get_columns('users')]
                
                # إضافة user_type_id إذا لم يكن موجوداً (لكن قد يكون موجوداً بالفعل)
                if 'user_type_id' not in columns:
                    db.execute(text("ALTER TABLE users ADD COLUMN user_type_id INTEGER"))
                    db.commit()
                    print("✅ Added user_type_id column to users table")
                
                # جعل phone و email nullable
                try:
                    db.execute(text("ALTER TABLE users ALTER COLUMN phone DROP NOT NULL"))
                    db.execute(text("ALTER TABLE users ALTER COLUMN email DROP NOT NULL"))
                    db.commit()
                    print("✅ Made phone and email nullable")
                except Exception as e:
                    print(f"ℹ️ Could not modify phone/email columns (might already be nullable): {e}")
        finally:
            db.close()
        
        # إضافة الأعمدة الجديدة إلى جدول orders
        db = SessionLocal()
        try:
            from sqlalchemy import inspect, text
            inspector = inspect(engine)
            
            if 'orders' in inspector.get_table_names():
                columns = [col['name'] for col in inspector.get_columns('orders')]
                
                if 'paid_amount' not in columns:
                    db.execute(text("ALTER TABLE orders ADD COLUMN paid_amount DECIMAL(12, 2) DEFAULT 0"))
                    print("✅ Added paid_amount column")
                
                if 'remaining_amount' not in columns:
                    db.execute(text("ALTER TABLE orders ADD COLUMN remaining_amount DECIMAL(12, 2) DEFAULT 0"))
                    print("✅ Added remaining_amount column")
                
                if 'payment_method' not in columns:
                    db.execute(text("ALTER TABLE orders ADD COLUMN payment_method VARCHAR(50) DEFAULT 'sham_cash'"))
                    print("✅ Added payment_method column")
                
                # تحديث payment_status للسماح بـ partial
                db.commit()
        except Exception as e:
            print(f"ℹ️ Could not modify orders table: {e}")
            db.rollback()
        finally:
            db.close()
            
    except Exception as e:
        print(f"⚠️ Error ensuring tables: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    print("🚀 Initializing user types and default users...")
    
    # إنشاء الجداول
    ensure_tables()
    
    db = SessionLocal()
    try:
        # إنشاء أنواع المستخدمين
        init_user_types(db)
        
        # إنشاء المستخدمين الافتراضيين
        init_default_users(db)
        
        print("\n✅ Initialization complete!")
        print("\n📋 Default users created:")
        print("   Managers:")
        print("   - Phone: 0966320114, Password: admin123")
        print("   - Phone: +963955773227, Password: khawam-p")
        print("\n   Employees:")
        print("   - Email: khawam-1@gmail.com, Password: khawam-1")
        print("   - Email: khawam-2@gmail.com, Password: khawam-2")
        print("   - Email: khawam-3@gmail.com, Password: khawam-3")
        print("\n   Customer:")
        print("   - Email: customer@gmail.com, Password: 963214")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()

