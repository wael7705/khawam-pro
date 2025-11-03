"""
سكريبت لإعادة بناء المستخدمين
"""
import requests
import json

url = "https://khawam-pro-production.up.railway.app/api/fix/rebuild-users"

print("=" * 70)
print("🔄 إعادة بناء المستخدمين")
print("=" * 70)
print(f"🎯 Endpoint: {url}")
print("")
print("📝 سيتم حذف جميع المستخدمين وإضافة:")
print("   1. مدير وائل ناصر: 0966320114 / admin123")
print("   2. مدير اياد خوام: +963955773227 / khawam-pmrx")
print("   3. موظف نسرين: khawam-1@gmail.com / khawam-1")
print("")

try:
    r = requests.post(url, timeout=60)
    print(f"Status: {r.status_code}")
    print("")
    
    if r.status_code == 200:
        data = r.json()
        print(json.dumps(data, indent=2, ensure_ascii=False))
        
        if data.get("success"):
            print("\n✅ نجح!")
            print(f"🗑️  تم حذف: {data.get('deleted_count', 0)} مستخدم")
            print(f"➕ تم إضافة: {data.get('added_count', 0)} مستخدم")
            print("\n📋 المستخدمون الجدد:")
            for user in data.get("users", []):
                if "phone" in user:
                    print(f"   - {user['name']}: {user['phone']} / {user['password']}")
                else:
                    print(f"   - {user['name']}: {user['email']} / {user['password']}")
        else:
            print(f"\n❌ فشل: {data.get('error', 'خطأ غير معروف')}")
    else:
        print(f"❌ خطأ HTTP: {r.status_code}")
        print(f"Response: {r.text}")
        
except Exception as e:
    print(f"\n❌ خطأ: {e}")

