"""
سكريبت بسيط لإضافة حساب المدير
"""
import requests
import sys

def main():
    railway_url = "https://khawam-pro-production.up.railway.app"
    endpoint = f"{railway_url}/api/setup/add-admin"
    
    print("=" * 70)
    print("➕ إضافة حساب المدير")
    print("=" * 70)
    print(f"📡 الرابط: {railway_url}")
    print(f"🎯 Endpoint: {endpoint}")
    print("")
    print("📝 الحساب:")
    print("   - رقم الهاتف: 0966320114")
    print("   - كلمة المرور: admin123")
    print("")
    print("🔄 جاري التشغيل...")
    print("")
    
    try:
        response = requests.post(endpoint, timeout=30)
        
        if response.status_code == 200:
            result = response.json()
            print("✅ تم بنجاح!")
            print("")
            print(f"📊 النتيجة: {result.get('message', '')}")
            print(f"📱 رقم الهاتف: {result.get('phone', '0966320114')}")
            print(f"🔑 كلمة المرور: {result.get('password', 'admin123')}")
            print("")
            print("يمكنك الآن تسجيل الدخول باستخدام:")
            print("   - رقم الهاتف: 0966320114")
            print("   - كلمة المرور: admin123")
        else:
            print(f"❌ خطأ: {response.status_code}")
            print(f"الرسالة: {response.text}")
            
    except Exception as e:
        print(f"❌ خطأ: {e}")

if __name__ == '__main__':
    main()


