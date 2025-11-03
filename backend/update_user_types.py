"""
سكريبت لتحديث name_ar في user_types
"""
import requests
import json

BASE_URL = "https://khawam-pro-production.up.railway.app"

def update_user_types():
    """تحديث name_ar في user_types"""
    print("🔄 تحديث أنواع المستخدمين...")
    
    try:
        # استخدام endpoint الموجود
        r = requests.get(f"{BASE_URL}/api/fix/fix-user-types-data", timeout=30)
        print(f"Status: {r.status_code}")
        
        if r.status_code == 200:
            result = r.json()
            print(json.dumps(result, indent=2, ensure_ascii=False))
            if result.get("success"):
                print("\n✅ تم تحديث أنواع المستخدمين بنجاح!")
                return True
        else:
            print(f"❌ Error: {r.text}")
            return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    update_user_types()

