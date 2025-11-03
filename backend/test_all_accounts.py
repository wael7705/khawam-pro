"""
اختبار جميع الحسابات
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
        r = requests.get(
            f"{BASE_URL}/api/fix/fix-password",
            params=data,
            timeout=30
        )
        print(f"Status: {r.status_code}")
        result = r.json()
        print(json.dumps(result, indent=2, ensure_ascii=False))
        return r.status_code == 200 and result.get("success")
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_login(phone=None, email=None, password=None):
    """اختبار تسجيل الدخول"""
    print(f"\n{'='*60}")
    print(f"🔑 اختبار تسجيل الدخول")
    print(f"{'='*60}")
    
    username = phone or email
    
    try:
        r = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": username, "password": password},
            timeout=30
        )
        print(f"Status: {r.status_code}")
        if r.status_code == 200:
            result = r.json()
            # إخفاء token لأسباب أمنية
            if "access_token" in result:
                result["access_token"] = result["access_token"][:20] + "..."
            print(json.dumps(result, indent=2, ensure_ascii=False))
            return True
        else:
            print(f"Response: {r.text[:300]}")
            return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    print("="*60)
    print("🔐 اختبار جميع الحسابات")
    print("="*60)
    
    # 1. حساب وائل ناصر
    print("\n" + "="*60)
    print("📱 حساب المدير 1: وائل ناصر - 0966320114 / admin123")
    print("="*60)
    
    if test_fix_password(phone="0966320114", password="admin123"):
        if test_login(phone="0966320114", password="admin123"):
            print("\n✅ نجح تسجيل الدخول لوائل ناصر!")
        else:
            print("\n❌ فشل تسجيل الدخول لوائل ناصر")
    else:
        print("\n❌ فشل تحديث كلمة المرور لوائل ناصر")
    
    # 2. حساب اياد خوام
    print("\n" + "="*60)
    print("📱 حساب المدير 2: اياد خوام - +963955773227 / khawam-pmrx")
    print("="*60)
    
    if test_fix_password(phone="+963955773227", password="khawam-pmrx"):
        if test_login(phone="+963955773227", password="khawam-pmrx"):
            print("\n✅ نجح تسجيل الدخول لاياد خوام!")
        else:
            print("\n❌ فشل تسجيل الدخول لاياد خوام")
    else:
        print("\n❌ فشل تحديث كلمة المرور لاياد خوام")
    
    # 3. حساب نسرين
    print("\n" + "="*60)
    print("📧 حساب الموظف: نسرين - khawam-1@gmail.com / khawam-1")
    print("="*60)
    
    if test_fix_password(email="khawam-1@gmail.com", password="khawam-1"):
        if test_login(email="khawam-1@gmail.com", password="khawam-1"):
            print("\n✅ نجح تسجيل الدخول لنسرين!")
        else:
            print("\n❌ فشل تسجيل الدخول لنسرين")
    else:
        print("\n❌ فشل تحديث كلمة المرور لنسرين")
    
    print("\n" + "="*60)
    print("✅ انتهى الاختبار")
    print("="*60)

