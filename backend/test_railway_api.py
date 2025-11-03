"""
ملف اختبار للتحقق من API endpoints على Railway
"""
import requests
import time

BASE_URL = "https://khawam-pro-production.up.railway.app"

def test_endpoint(endpoint, method="GET", data=None):
    """اختبار endpoint"""
    url = f"{BASE_URL}{endpoint}"
    try:
        if method == "GET":
            response = requests.get(url, timeout=15)
        elif method == "POST":
            response = requests.post(url, json=data, timeout=15)
        
        status = response.status_code
        if status == 200:
            try:
                result = response.json()
                return {"status": "✅ نجح", "code": status, "data": result}
            except:
                return {"status": "✅ نجح", "code": status, "data": response.text[:200]}
        else:
            return {"status": "❌ فشل", "code": status, "error": response.text[:200]}
    except requests.exceptions.Timeout:
        return {"status": "⏱️ انتهت مهلة الانتظار", "code": None, "error": "Timeout"}
    except Exception as e:
        return {"status": "❌ خطأ", "code": None, "error": str(e)[:200]}

def main():
    print("=" * 60)
    print("اختبار API Endpoints على Railway")
    print("=" * 60)
    print()
    
    # انتظر قليلاً
    print("⏳ انتظر قليلاً حتى يكتمل النشر على Railway...")
    time.sleep(10)
    print()
    
    # قائمة endpoints للاختبار
    endpoints = [
        ("/api/services/", "GET", None, "قائمة الخدمات"),
        ("/api/pricing/pricing-rules", "GET", None, "قائمة قواعد الأسعار"),
        ("/api/pricing/init-pricing-table", "GET", None, "تهيئة جدول الأسعار"),
    ]
    
    results = []
    
    for endpoint, method, data, description in endpoints:
        print(f"🔍 اختبار: {description}")
        print(f"   URL: {BASE_URL}{endpoint}")
        result = test_endpoint(endpoint, method, data)
        print(f"   النتيجة: {result['status']} (كود: {result['code']})")
        if result.get('data'):
            if isinstance(result['data'], dict):
                if 'success' in result['data']:
                    print(f"   Success: {result['data']['success']}")
                if 'message' in result['data']:
                    print(f"   Message: {result['data']['message']}")
        if result.get('error'):
            print(f"   Error: {result['error']}")
        print()
        results.append((description, result))
    
    # ملخص
    print("=" * 60)
    print("ملخص الاختبارات")
    print("=" * 60)
    
    success_count = sum(1 for _, r in results if r['status'] == "✅ نجح")
    total_count = len(results)
    
    for description, result in results:
        print(f"{result['status']} - {description}")
    
    print()
    print(f"النتيجة النهائية: {success_count}/{total_count} نجحت")
    
    if success_count == total_count:
        print("✅ جميع الاختبارات نجحت!")
    elif success_count > 0:
        print("⚠️ بعض الاختبارات فشلت - قد يكون التطبيق لا يزال في طور البدء")
    else:
        print("❌ جميع الاختبارات فشلت - تحقق من logs على Railway")
    
    print("=" * 60)

if __name__ == "__main__":
    main()
