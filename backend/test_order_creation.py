"""
سكريبت اختبار إنشاء طلب
"""
import requests
import json

# URL الخادم (يمكن تغييره حسب البيئة)
BASE_URL = "https://khawam-pro-production.up.railway.app/api"
# BASE_URL = "http://localhost:8000/api"  # للاختبار المحلي

def sanitize_amounts(order: dict):
    """تصفير أسعار الطلب لضمان أن التسعير يحدد لاحقاً من قبل الفريق"""
    order["total_amount"] = 0.0
    order["final_amount"] = 0.0
    for item in order.get("items", []):
        item["unit_price"] = 0.0
        item["total_price"] = 0.0
    return order

def test_create_order(service_name: str = "طباعة البوسترات"):
    """اختبار إنشاء طلب لخدمة محددة"""
    print(f"🧪 بدء اختبار إنشاء الطلب لخدمة: {service_name}...")
    print(f"📡 الاتصال بـ: {BASE_URL}")
    
    # بيانات الطلب التجريبية
    order_data = sanitize_amounts({
        "customer_name": "اختبار العميل",
        "customer_phone": "0999123456",
        "customer_whatsapp": "0999123456",
        "shop_name": "متجر الاختبار",
        "service_name": service_name,
        "items": [
            {
                "service_name": service_name,
                "quantity": 2,
                "specifications": {
                    "work_type": "طباعة عادية",
                    "notes": "طلب اختبار"
                },
                "dimensions": {
                    "length": "50",
                    "width": "70",
                    "unit": "cm"
                },
                "colors": ["أحمر", "أزرق"],
                "design_files": []
            }
        ],
        "delivery_type": "self",
        "delivery_address": None,
        "delivery_latitude": None,
        "delivery_longitude": None,
        "notes": "طلب اختبار من السكريبت"
    })
    
    try:
        print("\n📤 إرسال طلب إنشاء الطلب...")
        response = requests.post(
            f"{BASE_URL}/orders/",
            json=order_data,
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        
        print(f"📊 Status Code: {response.status_code}")
        
        if response.status_code == 200 or response.status_code == 201:
            result = response.json()
            print("\n✅ نجح إنشاء الطلب!")
            print(f"📋 رقم الطلب: {result.get('order', {}).get('order_number', 'N/A')}")
            print(f"💰 المبلغ: {result.get('order', {}).get('final_amount', 'N/A')} ل.س")
            print(f"👤 العميل: {result.get('order', {}).get('customer_name', 'N/A')}")
            return True
        else:
            print(f"\n❌ فشل إنشاء الطلب!")
            print(f"📝 Response: {response.text}")
            return False
            
    except requests.exceptions.ConnectionError:
        print("\n❌ خطأ: لا يمكن الاتصال بالخادم")
        print("   تأكد من أن الخادم يعمل على:", BASE_URL)
        return False
    except requests.exceptions.Timeout:
        print("\n❌ خطأ: انتهت مهلة الاتصال")
        return False
    except Exception as e:
        print(f"\n❌ خطأ غير متوقع: {e}")
        return False

def test_health_check():
    """اختبار health check"""
    print("\n🏥 اختبار health check...")
    try:
        response = requests.get(f"{BASE_URL.replace('/api', '')}/health", timeout=10)
        if response.status_code == 200:
            print("✅ Health check نجح!")
            try:
                print(f"📋 Response: {response.json()}")
            except:
                print(f"📋 Response: {response.text[:100]}")
            return True
        else:
            print(f"⚠️ Health check: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Health check فشل: {e}")
        return False

def test_get_services():
    """اختبار جلب الخدمات"""
    print("\n📋 اختبار جلب الخدمات...")
    try:
        response = requests.get(f"{BASE_URL}/services/", timeout=10)
        if response.status_code == 200:
            services = response.json()
            print(f"✅ تم جلب {len(services)} خدمة")
            if len(services) > 0:
                print(f"   مثال: {services[0].get('name_ar', 'N/A')}")
            return services
        else:
            print(f"❌ فشل جلب الخدمات: {response.status_code}")
            return []
    except Exception as e:
        print(f"❌ خطأ في جلب الخدمات: {e}")
        return []

if __name__ == "__main__":
    print("=" * 60)
    print("🧪 اختبارات نظام الطلبات")
    print("=" * 60)
    
    # اختبار health check
    health_ok = test_health_check()
    
    # اختبار جلب الخدمات
    services = test_get_services()
    services_ok = len(services) > 0
    
    # اختبار إنشاء الطلب لكل خدمة
    all_orders_ok = True
    if services_ok:
        for service in services:
            service_name = service.get("name_ar") or service.get("name_en") or "خدمة بدون اسم"
            order_ok = test_create_order(service_name)
            all_orders_ok = all_orders_ok and order_ok
    
    print("\n" + "=" * 60)
    print("📊 ملخص النتائج:")
    print("=" * 60)
    print(f"🏥 Health Check: {'✅' if health_ok else '⚠️'}")
    print(f"📋 Services API: {'✅' if services_ok else '❌'}")
    if services_ok:
        print(f"📦 Create Orders: {'✅' if all_orders_ok else '❌'} (عدد الخدمات المختبرة: {len(services)})")
    else:
        print("📦 Create Orders: ❌ (لم يتم جلب الخدمات)")
    
    if health_ok and services_ok and all_orders_ok:
        print("\n🎉 جميع الاختبارات نجحت!")
    else:
        print("\n⚠️ توجد بعض المشاكل خلال الاختبار")

