"""
سكريبت لاختبار وإصلاح تسجيل الدخول
"""
import requests
import json

BASE_URL = "https://khawam-pro-production.up.railway.app"

def test_fix_password(phone=None, email=None, password=None):
    """اختبار تحديث كلمة المرور"""
    print(f"\n{'='*60}")
    print(f"🔧 تحديث كلمة المرور")
    print(f"{'='*60}")
    
    data = {"password": password}
    if phone:
        data["phone"] = phone
    elif email:
        data["email"] = email
    
    try:
        r = requests.post(
            f"{BASE_URL}/api/fix/fix-password",
            json=data,
            timeout=30
        )
        print(f"Status: {r.status_code}")
        print(json.dumps(r.json(), indent=2, ensure_ascii=False))
        return r.status_code == 200
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_login(phone=None, email=None, password=None):
    """اختبار تسجيل الدخول"""
    print(f"\n{'='*60}")
    print(f"🔍 اختبار تسجيل الدخول")
    print(f"{'='*60}")
    
    data = {"password": password}
    if phone:
        data["phone"] = phone
    elif email:
        data["email"] = email
    
    try:
        r = requests.post(
            f"{BASE_URL}/api/fix/test-login",
            json=data,
            timeout=30
        )
        print(f"Status: {r.status_code}")
        result = r.json()
        print(json.dumps(result, indent=2, ensure_ascii=False))
        
        if result.get("password_verify", {}).get("result"):
            print("\n✅ كلمة المرور صحيحة!")
            return True
        else:
            print("\n❌ كلمة المرور غير صحيحة")
            return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_real_login(phone=None, email=None, password=None):
    """اختبار تسجيل الدخول الحقيقي"""
    print(f"\n{'='*60}")
    print(f"🚪 تسجيل الدخول الحقيقي")
    print(f"{'='*60}")
    
    username = phone or email
    
    try:
        r = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": username, "password": password},
            timeout=30
        )
        print(f"Status: {r.status_code}")
        result = r.json()
        print(json.dumps(result, indent=2, ensure_ascii=False))
        
        if r.status_code == 200:
            print("\n✅ تم تسجيل الدخول بنجاح!")
            return True
        else:
            print("\n❌ فشل تسجيل الدخول")
            return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    print("="*60)
    print("🔐 اختبار وإصلاح تسجيل الدخول")
    print("="*60)
    
    # اختبار حساب وائل ناصر
    phone = "0966320114"
    password = "admin123"
    
    print(f"\n📱 الحساب: {phone} / {password}")
    
    # 1. تحديث كلمة المرور
    if test_fix_password(phone=phone, password=password):
        print("\n✅ تم تحديث كلمة المرور")
        
        # 2. اختبار كلمة المرور
        if test_login(phone=phone, password=password):
            print("\n✅ اختبار كلمة المرور نجح")
            
            # 3. اختبار تسجيل الدخول الحقيقي
            if test_real_login(phone=phone, password=password):
                print("\n🎉 تم حل المشكلة! يمكنك تسجيل الدخول الآن.")
            else:
                print("\n⚠️ اختبار كلمة المرور نجح لكن تسجيل الدخول الحقيقي فشل")
        else:
            print("\n⚠️ فشل اختبار كلمة المرور بعد التحديث")
    else:
        print("\n❌ فشل تحديث كلمة المرور")

