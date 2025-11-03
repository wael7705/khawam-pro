"""
سكريبت مباشر لإضافة كلمة المرور للمدير على Railway
"""
import requests
import sys

def main():
    railway_url = "https://khawam-pro-production.up.railway.app"
    endpoint = f"{railway_url}/api/setup/add-password"
    
    print("=" * 70)
    print("🔑 إضافة كلمة المرور للمدير")
    print("=" * 70)
    print(f"📡 الرابط: {railway_url}")
    print(f"🎯 Endpoint: {endpoint}")
    print("")
    
    try:
        response = requests.post(endpoint, params={"password": "khawam-p"}, timeout=30)
        
        if response.status_code == 200:
            result = response.json()
            print("✅ تم بنجاح!")
            print("")
            print(f"📊 النتائج: {result.get('message', '')}")
            print(f"📝 كلمة المرور: {result.get('password', 'khawam-p')}")
            print(f"👤 تم التحديث: {result.get('updated_count', 0)} مستخدم")
        else:
            print(f"❌ خطأ: {response.status_code}")
            print(f"الرسالة: {response.text}")
            
    except Exception as e:
        print(f"❌ خطأ: {e}")

if __name__ == '__main__':
    main()


