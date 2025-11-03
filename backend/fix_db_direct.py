"""
سكريبت Python مباشر لإصلاح قاعدة البيانات
يمكن تشغيله عبر PowerShell: python backend/fix_db_direct.py
"""
import os
import sys
from sqlalchemy import create_engine, text
from passlib.context import CryptContext
import re
from dotenv import load_dotenv

# تحميل متغيرات البيئة
load_dotenv()

# استخدام نفس منطق database.py للحصول على DATABASE_URL
DATABASE_URL_FROM_ENV = os.environ.get("DATABASE_URL")
if not DATABASE_URL_FROM_ENV:
    DATABASE_URL_FROM_ENV = os.getenv("DATABASE_URL", "")
if not DATABASE_URL_FROM_ENV:
    DATABASE_URL_FROM_ENV = "postgresql://postgres@localhost:5432/khawam_local"

# إعداد تشفير كلمات المرور
pwd_context = CryptContext(schemes=['bcrypt'], deprecated='auto')

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def normalize_phone(phone: str) -> str:
    """تطبيع رقم الهاتف"""
    phone_clean = re.sub(r'[^\d]', '', phone)
    if phone_clean.startswith('00'):
        phone_clean = phone_clean[2:]
    if phone_clean.startswith('0963'):
        return '+963' + phone_clean[4:]
    if phone_clean.startswith('963'):
        return '+963' + phone_clean[3:]
    if phone_clean.startswith('0') and len(phone_clean) >= 10:
        return '+963' + phone_clean[2:]
    return '+963' + phone_clean

def main():
    # الحصول على DATABASE_URL - أولوية لسطر الأوامر، ثم من متغيرات البيئة، ثم من DATABASE_URL_FROM_ENV
    DATABASE_URL = None
    
    if len(sys.argv) > 1:
        DATABASE_URL = sys.argv[1]
    elif os.environ.get('DATABASE_URL'):
        DATABASE_URL = os.environ.get('DATABASE_URL')
    elif os.getenv('DATABASE_URL'):
        DATABASE_URL = os.getenv('DATABASE_URL')
    else:
        DATABASE_URL = DATABASE_URL_FROM_ENV
    
    if not DATABASE_URL:
        print('❌ DATABASE_URL غير موجود')
        print('')
        print('يرجى توفير DATABASE_URL بإحدى الطرق التالية:')
        print('  1. كمعامل: python fix_db_direct.py "postgresql://..."')
        print('  2. متغير بيئة PowerShell: $env:DATABASE_URL="postgresql://..."')
        print('  3. ملف .env في مجلد backend: DATABASE_URL=postgresql://...')
        print('')
        sys.exit(1)

    # إصلاح postgres:// إلى postgresql://
    if DATABASE_URL.startswith('postgres://'):
        DATABASE_URL = DATABASE_URL.replace('postgres://', 'postgresql://', 1)

    print('=' * 70)
    print('🔧 إصلاح قاعدة البيانات مباشرة')
    print('=' * 70)
    print(f'📊 الاتصال بقاعدة البيانات...')

    # إنشاء الاتصال
    try:
        engine = create_engine(DATABASE_URL, pool_pre_ping=True)
        conn = engine.connect()
        print('   ✅ تم الاتصال بنجاح')
    except Exception as e:
        print(f'   ❌ خطأ في الاتصال: {e}')
        sys.exit(1)

    try:
        print('\n' + '=' * 70)
        print('🔥 بدء إصلاح قاعدة البيانات')
        print('=' * 70)
        
        # الخطوة 1: الحصول على أنواع المستخدمين أو إنشاؤها
        print('\n1️⃣ الحصول على أنواع المستخدمين...')
        admin_result = conn.execute(text("SELECT id FROM user_types WHERE name_ar = 'مدير'")).fetchone()
        employee_result = conn.execute(text("SELECT id FROM user_types WHERE name_ar = 'موظف'")).fetchone()
        
        if not admin_result:
            print('   ⚠️  نوع المستخدم "مدير" غير موجود، جاري إنشائه...')
            conn.execute(text("""
                INSERT INTO user_types (name_ar, name_en, permissions) 
                VALUES ('مدير', 'admin', '{"all": true}'::json)
            """))
            conn.commit()
            admin_result = conn.execute(text("SELECT id FROM user_types WHERE name_ar = 'مدير'")).fetchone()
            print('   ✅ تم إنشاء نوع المستخدم "مدير"')
        
        if not employee_result:
            print('   ⚠️  نوع المستخدم "موظف" غير موجود، جاري إنشائه...')
            conn.execute(text("""
                INSERT INTO user_types (name_ar, name_en, permissions) 
                VALUES ('موظف', 'employee', '{"orders": true, "products": true, "services": true}'::json)
            """))
            conn.commit()
            employee_result = conn.execute(text("SELECT id FROM user_types WHERE name_ar = 'موظف'")).fetchone()
            print('   ✅ تم إنشاء نوع المستخدم "موظف"')
        
        admin_id = admin_result[0]
        employee_id = employee_result[0]
        
        print(f'   ✅ مدير ID: {admin_id}, موظف ID: {employee_id}')
        
        # الخطوة 2: الحصول على IDs للمديرين والموظفين
        print('\n2️⃣ الحصول على المديرين والموظفين...')
        users_to_delete = conn.execute(text("""
            SELECT id FROM users 
            WHERE user_type_id IN (:admin_id, :employee_id)
        """), {'admin_id': admin_id, 'employee_id': employee_id}).fetchall()
        
        user_ids_to_delete = [row[0] for row in users_to_delete]
        
        if not user_ids_to_delete:
            print('   ℹ️  لا يوجد مديرين أو موظفين للحذف')
            users_deleted = 0
            studio_deleted = 0
            orders_deleted = 0
            order_items_deleted = 0
        else:
            print(f'   📋 وجد {len(user_ids_to_delete)} مستخدم للحذف: {user_ids_to_delete}')
            
            # الخطوة 3: حذف studio_projects
            print('\n3️⃣ حذف studio_projects المرتبطة...')
            studio_deleted = 0
            for uid in user_ids_to_delete:
                try:
                    result = conn.execute(text("DELETE FROM studio_projects WHERE user_id = :uid"), {'uid': uid})
                    studio_deleted += result.rowcount
                except Exception as e:
                    # الجدول قد لا يكون موجوداً أو لا يوجد سجلات
                    pass
            if studio_deleted > 0:
                conn.commit()
                print(f'   ✅ تم حذف {studio_deleted} مشروع استيديو')
            else:
                print('   ℹ️  لا يوجد مشاريع استيديو للحذف')
            
            # الخطوة 4: الحصول على الطلبات المرتبطة
            print('\n4️⃣ الحصول على الطلبات المرتبطة...')
            order_ids = []
            for uid in user_ids_to_delete:
                try:
                    orders = conn.execute(text("SELECT id FROM orders WHERE customer_id = :uid"), {'uid': uid}).fetchall()
                    order_ids.extend([row[0] for row in orders])
                except Exception as e:
                    pass
            
            print(f'   📋 وجد {len(order_ids)} طلب للحذف')
            
            # الخطوة 5: حذف order_items
            if order_ids:
                print('\n5️⃣ حذف order_items...')
                order_items_deleted = 0
                for oid in order_ids:
                    try:
                        conn.execute(text("DELETE FROM order_items WHERE order_id = :oid"), {'oid': oid})
                        order_items_deleted += 1
                    except:
                        pass
                conn.commit()
                print(f'   ✅ تم حذف {order_items_deleted} عنصر طلب')
            else:
                print('\n5️⃣ لا يوجد order_items للحذف')
                order_items_deleted = 0
            
            # الخطوة 6: حذف orders
            if order_ids:
                print('\n6️⃣ حذف orders...')
                orders_deleted = 0
                for oid in order_ids:
                    try:
                        conn.execute(text("DELETE FROM orders WHERE id = :oid"), {'oid': oid})
                        orders_deleted += 1
                    except:
                        pass
                conn.commit()
                print(f'   ✅ تم حذف {orders_deleted} طلب')
            else:
                print('\n6️⃣ لا يوجد orders للحذف')
                orders_deleted = 0
            
            # الخطوة 7: حذف المستخدمين
            print('\n7️⃣ حذف المديرين والموظفين...')
            users_deleted = 0
            for uid in user_ids_to_delete:
                try:
                    conn.execute(text("DELETE FROM users WHERE id = :uid"), {'uid': uid})
                    users_deleted += 1
                except Exception as e:
                    print(f'   ⚠️  خطأ في حذف المستخدم {uid}: {e}')
            conn.commit()
            print(f'   ✅ تم حذف {users_deleted} مستخدم')
        
        # الخطوة 8: إنشاء المستخدمين الجدد
        print('\n8️⃣ إنشاء المستخدمين الجدد...')
        created_users = []
        
        # Admin 1
        phone1 = normalize_phone('0966320114')
        password_hash1 = get_password_hash('admin123')
        try:
            # حذف المستخدم إذا كان موجوداً
            conn.execute(text("DELETE FROM users WHERE phone = :phone"), {'phone': phone1})
            conn.execute(text("""
                INSERT INTO users (name, phone, password_hash, user_type_id, is_active)
                VALUES (:name, :phone, :password_hash, :user_type_id, :is_active)
            """), {
                'name': 'مدير 1',
                'phone': phone1,
                'password_hash': password_hash1,
                'user_type_id': admin_id,
                'is_active': True
            })
            conn.commit()
            created_users.append(f'مدير 1 ({phone1})')
            print(f'   ✅ مدير 1: {phone1} / admin123')
        except Exception as e:
            print(f'   ⚠️  خطأ في إنشاء مدير 1: {e}')
        
        # Admin 2
        phone2 = normalize_phone('963955773227+')
        password_hash2 = get_password_hash('khawam-p')
        try:
            # حذف المستخدم إذا كان موجوداً
            conn.execute(text("DELETE FROM users WHERE phone = :phone"), {'phone': phone2})
            conn.execute(text("""
                INSERT INTO users (name, phone, password_hash, user_type_id, is_active)
                VALUES (:name, :phone, :password_hash, :user_type_id, :is_active)
            """), {
                'name': 'مدير 2',
                'phone': phone2,
                'password_hash': password_hash2,
                'user_type_id': admin_id,
                'is_active': True
            })
            conn.commit()
            created_users.append(f'مدير 2 ({phone2})')
            print(f'   ✅ مدير 2: {phone2} / khawam-p')
        except Exception as e:
            print(f'   ⚠️  خطأ في إنشاء مدير 2: {e}')
        
        # Employees
        for i in range(1, 4):
            email = f'khawam-{i}@gmail.com'
            password_hash = get_password_hash(f'khawam-{i}')
            try:
                # حذف المستخدم إذا كان موجوداً
                conn.execute(text("DELETE FROM users WHERE email = :email"), {'email': email})
                conn.execute(text("""
                    INSERT INTO users (name, email, password_hash, user_type_id, is_active)
                    VALUES (:name, :email, :password_hash, :user_type_id, :is_active)
                """), {
                    'name': f'موظف {i}',
                    'email': email,
                    'password_hash': password_hash,
                    'user_type_id': employee_id,
                    'is_active': True
                })
                conn.commit()
                created_users.append(f'موظف {i} ({email})')
                print(f'   ✅ موظف {i}: {email} / khawam-{i}')
            except Exception as e:
                print(f'   ⚠️  خطأ في إنشاء موظف {i}: {e}')
        
        # الخطوة 9: التحقق من النتيجة
        print('\n9️⃣ التحقق من النتيجة...')
        total_users = conn.execute(text("SELECT COUNT(*) FROM users")).scalar()
        customers = conn.execute(text("""
            SELECT COUNT(*) FROM users 
            WHERE user_type_id = (SELECT id FROM user_types WHERE name_ar = 'عميل')
        """)).scalar()
        admins = conn.execute(text("""
            SELECT COUNT(*) FROM users 
            WHERE user_type_id = :admin_id
        """), {'admin_id': admin_id}).scalar()
        employees = conn.execute(text("""
            SELECT COUNT(*) FROM users 
            WHERE user_type_id = :employee_id
        """), {'employee_id': employee_id}).scalar()
        
        print('=' * 70)
        print('📊 النتيجة النهائية:')
        print('=' * 70)
        print(f'   إجمالي المستخدمين: {total_users}')
        print(f'   المديرين: {admins}')
        print(f'   الموظفين: {employees}')
        print(f'   العملاء: {customers}')
        print(f'   المستخدمين الجدد: {len(created_users)}')
        if user_ids_to_delete:
            print(f'   تم حذف: {users_deleted} مستخدم')
            print(f'   تم حذف: {studio_deleted} مشروع استيديو')
            print(f'   تم حذف: {orders_deleted} طلب')
        print('=' * 70)
        
        print('\n✅ تم إصلاح قاعدة البيانات بنجاح!')
        print('\n📝 الحسابات الجاهزة:')
        print('   - مدير 1: 0966320114 / admin123')
        print('   - مدير 2: 963955773227+ / khawam-p')
        print('   - موظف 1: khawam-1@gmail.com / khawam-1')
        print('   - موظف 2: khawam-2@gmail.com / khawam-2')
        print('   - موظف 3: khawam-3@gmail.com / khawam-3')
        
    except Exception as e:
        conn.rollback()
        print(f'\n❌ خطأ: {e}')
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        conn.close()
        engine.dispose()

if __name__ == '__main__':
    main()

