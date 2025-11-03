"""
سكريبت بسيط لإضافة المدير عبر المسار الجديد
"""
import requests

url = "https://khawam-pro-production.up.railway.app/api/fix/fix-admin"

print("=" * 70)
print("🔧 إصلاح قاعدة البيانات - مسار جديد")
print("=" * 70)
print(f"🎯 Endpoint: {url}")
print("📝 الحساب: 0966320114 / admin123")
print("")

try:
    r = requests.post(url, timeout=30)
    print(f"Status: {r.status_code}")
    print(f"Response: {r.text}")
    
    if r.status_code == 200:
        data = r.json()
        if data.get("success"):
            print("\n✅ نجح!")
            print(f"📱 الهاتف: {data.get('phone')}")
            print(f"🔑 كلمة المرور: {data.get('password')}")
        else:
            print(f"\n❌ فشل: {data.get('error', 'خطأ غير معروف')}")
    else:
        print(f"\n❌ خطأ HTTP: {r.status_code}")
        
except Exception as e:
    print(f"\n❌ خطأ: {e}")

