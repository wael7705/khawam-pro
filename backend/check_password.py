#!/usr/bin/env python3
"""
سكربت للتحقق من كلمة المرور للمستخدم في قاعدة البيانات
"""
import os
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from passlib.context import CryptContext
from passlib.hash import bcrypt_sha256 as legacy_bcrypt_sha256
from passlib.hash import bcrypt as legacy_bcrypt
from passlib.exc import UnknownHashError

# إعدادات قاعدة البيانات
DATABASE_URL = os.environ.get("DATABASE_URL")

if not DATABASE_URL:
    print("❌ خطأ: DATABASE_URL غير محدد")
    print("   يرجى تحديد DATABASE_URL كمتغير بيئة")
    sys.exit(1)

# إصلاح Railway PostgreSQL connection
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# إنشاء engine
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# إعداد password context
pwd_context = CryptContext(
    schemes=["pbkdf2_sha256"],
    default="pbkdf2_sha256",
    pbkdf2_sha256__rounds=320000
)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """التحقق من كلمة المرور"""
    try:
        if not hashed_password or not plain_password:
            return False
        
        try:
            if pwd_context.verify(plain_password, hashed_password):
                return True
        except UnknownHashError:
            pass
        except Exception as context_error:
            print(f"⚠️ pwd_context verify failed: {context_error}")

        if hashed_password.startswith("$bcrypt-sha256$"):
            try:
                if legacy_bcrypt_sha256.verify(plain_password, hashed_password):
                    return True
            except Exception as legacy_sha_error:
                print(f"⚠️ Legacy bcrypt_sha256 verify failed: {legacy_sha_error}")

        if hashed_password.startswith('$2'):
            try:
                if legacy_bcrypt.verify(plain_password, hashed_password):
                    return True
            except Exception as bcrypt_error:
                print(f"⚠️ Legacy bcrypt verify failed: {bcrypt_error}")
        
        return False
    except Exception as e:
        print(f"⚠️ Error verifying password: {e}")
        return False

def normalize_phone(phone: str) -> str:
    """تطبيع رقم الهاتف"""
    if not phone:
        return ""
    phone_clean = ''.join(filter(str.isdigit, phone))
    
    if phone_clean.startswith('0'):
        phone_clean = '963' + phone_clean[1:]
    elif not phone_clean.startswith('963'):
        phone_clean = '963' + phone_clean
    
    return phone_clean

def check_user_password(phone: str, password: str):
    """التحقق من كلمة مرور المستخدم"""
    db = SessionLocal()
    try:
        # تطبيع رقم الهاتف
        normalized_phone = normalize_phone(phone)
        phone_variants = [phone, normalized_phone, '+' + normalized_phone]
        
        if phone.startswith('0'):
            phone_variants.extend(['963' + phone[1:], '+963' + phone[1:]])
        if phone.startswith('+963'):
            phone_variants.append(phone[1:])
        if phone.startswith('963') and not phone.startswith('+'):
            phone_variants.append('+' + phone)
        
        # البحث عن المستخدم
        user_row = None
        for variant in phone_variants:
            if variant:
                user_row = db.execute(text("""
                    SELECT id, name, email, phone, password_hash, user_type_id, is_active
                    FROM users
                    WHERE phone = :phone
                """), {"phone": variant}).fetchone()
                if user_row:
                    break
        
        if not user_row:
            print(f"❌ المستخدم غير موجود برقم الهاتف: {phone}")
            print(f"   جربت الأشكال التالية: {phone_variants}")
            return False
        
        user_id, user_name, user_email, user_phone, password_hash, user_type_id, is_active = user_row
        
        print(f"\n✅ تم العثور على المستخدم:")
        print(f"   المعرف: {user_id}")
        print(f"   الاسم: {user_name}")
        print(f"   الهاتف: {user_phone}")
        print(f"   البريد: {user_email}")
        print(f"   نشط: {is_active}")
        print(f"   نوع المستخدم: {user_type_id}")
        
        # الحصول على نوع المستخدم
        user_type_row = db.execute(text("""
            SELECT name_ar 
            FROM user_types 
            WHERE id = :id
        """), {"id": user_type_id}).fetchone()
        
        if user_type_row:
            print(f"   نوع المستخدم: {user_type_row[0]}")
        
        # التحقق من كلمة المرور
        print(f"\n🔐 التحقق من كلمة المرور...")
        print(f"   كلمة المرور المدخلة: {password}")
        print(f"   Hash المخزن: {password_hash[:50]}...")
        
        # تحديد نوع Hash
        if password_hash.startswith("$pbkdf2-sha256$"):
            print(f"   نوع Hash: pbkdf2_sha256")
        elif password_hash.startswith("$bcrypt-sha256$"):
            print(f"   نوع Hash: bcrypt_sha256 (legacy)")
        elif password_hash.startswith("$2"):
            print(f"   نوع Hash: bcrypt (legacy)")
        else:
            print(f"   نوع Hash: غير معروف")
        
        # التحقق من كلمة المرور
        is_valid = verify_password(password, password_hash)
        
        if is_valid:
            print(f"✅ كلمة المرور صحيحة!")
            return True
        else:
            print(f"❌ كلمة المرور غير صحيحة!")
            return False
            
    except Exception as e:
        print(f"❌ خطأ في التحقق من كلمة المرور: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()

def reset_user_password(phone: str, new_password: str):
    """إعادة تعيين كلمة مرور المستخدم"""
    db = SessionLocal()
    try:
        # تطبيع رقم الهاتف
        normalized_phone = normalize_phone(phone)
        phone_variants = [phone, normalized_phone, '+' + normalized_phone]
        
        if phone.startswith('0'):
            phone_variants.extend(['963' + phone[1:], '+963' + phone[1:]])
        
        # البحث عن المستخدم
        user_row = None
        for variant in phone_variants:
            if variant:
                user_row = db.execute(text("""
                    SELECT id, name, phone
                    FROM users
                    WHERE phone = :phone
                """), {"phone": variant}).fetchone()
                if user_row:
                    break
        
        if not user_row:
            print(f"❌ المستخدم غير موجود برقم الهاتف: {phone}")
            return False
        
        user_id, user_name, user_phone = user_row
        
        # تشفير كلمة المرور الجديدة
        password_hash = pwd_context.hash(new_password)
        
        # تحديث كلمة المرور
        db.execute(text("""
            UPDATE users
            SET password_hash = :password_hash
            WHERE id = :user_id
        """), {"password_hash": password_hash, "user_id": user_id})
        db.commit()
        
        print(f"✅ تم تحديث كلمة المرور للمستخدم: {user_name} ({user_phone})")
        return True
        
    except Exception as e:
        db.rollback()
        print(f"❌ خطأ في تحديث كلمة المرور: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()

def main():
    """الدالة الرئيسية"""
    print("=" * 70)
    print("  التحقق من كلمة المرور للمستخدم")
    print("=" * 70)
    
    if len(sys.argv) < 3:
        print("\n📋 الاستخدام:")
        print("   python check_password.py <phone> <password>")
        print("   python check_password.py <phone> <password> --reset <new_password>")
        print("\nمثال:")
        print("   python check_password.py 0966320114 admin123")
        print("   python check_password.py 0966320114 admin123 --reset newpassword123")
        sys.exit(1)
    
    phone = sys.argv[1]
    password = sys.argv[2]
    
    # التحقق من كلمة المرور
    is_valid = check_user_password(phone, password)
    
    # إذا كانت كلمة المرور غير صحيحة وطلب إعادة التعيين
    if not is_valid and len(sys.argv) >= 5 and sys.argv[3] == "--reset":
        new_password = sys.argv[4]
        print(f"\n🔄 إعادة تعيين كلمة المرور...")
        reset_user_password(phone, new_password)
        print(f"\n🔐 التحقق من كلمة المرور الجديدة...")
        check_user_password(phone, new_password)

if __name__ == "__main__":
    main()

