"""
اختبار endpoint الأعمال (Portfolio)
"""
import requests
import os

BASE_URL = os.getenv("API_URL", "https://khawam-pro-production.up.railway.app")

def test_portfolio_endpoints():
    """اختبار endpoints الأعمال"""
    print("\n" + "=" * 60)
    print("🧪 اختبار Portfolio Endpoints")
    print("=" * 60)
    
    try:
        # اختبار 1: جميع الأعمال
        print("\n📋 اختبار 1: GET /api/portfolio/")
        response = requests.get(f"{BASE_URL}/api/portfolio/", timeout=30)
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ نجح! عدد الأعمال: {len(data)}")
            if len(data) > 0:
                print(f"   مثال: {data[0].get('title_ar', 'N/A')}")
                print(f"   Image URL: {data[0].get('image_url', 'N/A')}")
        else:
            print(f"❌ فشل: {response.status_code}")
            print(f"   Response: {response.text}")
        
        # اختبار 2: الأعمال المميزة
        print("\n⭐ اختبار 2: GET /api/portfolio/featured")
        response = requests.get(f"{BASE_URL}/api/portfolio/featured", timeout=30)
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ نجح! عدد الأعمال المميزة: {len(data)}")
            if len(data) > 0:
                print(f"   مثال: {data[0].get('title_ar', 'N/A')}")
                print(f"   Image URL: {data[0].get('image_url', 'N/A')}")
        else:
            print(f"❌ فشل: {response.status_code}")
            print(f"   Response: {response.text}")
        
        print("\n" + "=" * 60)
        print("✅ اكتمل الاختبار!")
        print("=" * 60)
        return True
        
    except Exception as e:
        print(f"\n❌ خطأ: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    test_portfolio_endpoints()

