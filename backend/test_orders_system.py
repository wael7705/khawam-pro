"""
اختبار شامل لنظام الطلبات
Tests the complete order system flow
"""
import requests
import json
from decimal import Decimal

BASE_URL = "https://khawam-pro-production.up.railway.app/api"
# BASE_URL = "http://localhost:8000/api"  # للاختبار المحلي

def test_create_order():
    """اختبار إنشاء طلب جديد"""
    print("\n" + "="*50)
    print("🧪 اختبار إنشاء طلب جديد")
    print("="*50)
    
    order_data = {
        "customer_name": "أحمد محمد",
        "customer_phone": "963991234567",
        "customer_whatsapp": "963991234567",
        "shop_name": "متجر التصميم",
        "service_name": "طباعة البوسترات",
        "items": [
            {
                "service_name": "طباعة البوسترات",
                "quantity": 2,
                "unit_price": 2000.0,
                "total_price": 4000.0,
                "specifications": {
                    "work_type": "بوستر دعاية",
                    "notes": "مطلوب جودة عالية"
                },
                "dimensions": {
                    "length": "50",
                    "width": "70",
                    "height": "0",
                    "unit": "cm"
                },
                "colors": ["#FF6B35", "#F7931E"],
                "design_files": []
            }
        ],
        "total_amount": 4000.0,
        "final_amount": 4000.0,
        "delivery_type": "self",
        "delivery_address": None,
        "notes": "طلب تجريبي للاختبار"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/orders/", json=order_data)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ نجح إنشاء الطلب!")
            print(f"Order ID: {data.get('order', {}).get('id')}")
            print(f"Order Number: {data.get('order', {}).get('order_number')}")
            print(f"Status: {data.get('order', {}).get('status')}")
            print(f"Total: {data.get('order', {}).get('total_amount')} ل.س")
            return data.get('order', {}).get('id')
        else:
            print(f"❌ فشل إنشاء الطلب")
            print(f"Response: {response.text}")
            return None
    except Exception as e:
        print(f"❌ خطأ: {e}")
        return None

def test_get_orders():
    """اختبار جلب جميع الطلبات"""
    print("\n" + "="*50)
    print("🧪 اختبار جلب جميع الطلبات")
    print("="*50)
    
    try:
        response = requests.get(f"{BASE_URL}/orders/")
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            orders = data.get('orders', [])
            print(f"✅ تم جلب {len(orders)} طلب")
            if orders:
                print("\nأحدث 3 طلبات:")
                for order in orders[:3]:
                    print(f"  - {order.get('order_number')}: {order.get('status')} - {order.get('total_amount')} ل.س")
            return orders
        else:
            print(f"❌ فشل جلب الطلبات")
            print(f"Response: {response.text}")
            return []
    except Exception as e:
        print(f"❌ خطأ: {e}")
        return []

def test_get_order_by_id(order_id: int):
    """اختبار جلب طلب محدد"""
    print("\n" + "="*50)
    print(f"🧪 اختبار جلب الطلب #{order_id}")
    print("="*50)
    
    try:
        response = requests.get(f"{BASE_URL}/orders/{order_id}")
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            order = data.get('order', {})
            print(f"✅ تم جلب الطلب")
            print(f"Order Number: {order.get('order_number')}")
            print(f"Status: {order.get('status')}")
            print(f"Items: {len(order.get('items', []))}")
            return order
        else:
            print(f"❌ فشل جلب الطلب")
            print(f"Response: {response.text}")
            return None
    except Exception as e:
        print(f"❌ خطأ: {e}")
        return None

def test_admin_get_orders():
    """اختبار جلب الطلبات من Admin API"""
    print("\n" + "="*50)
    print("🧪 اختبار جلب الطلبات من Admin API")
    print("="*50)
    
    try:
        response = requests.get(f"{BASE_URL}/admin/orders/all")
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            orders = response.json() if isinstance(response.json(), list) else []
            print(f"✅ تم جلب {len(orders)} طلب من Admin API")
            if orders:
                print("\nأحدث 3 طلبات:")
                for order in orders[:3]:
                    print(f"  - {order.get('order_number')}: {order.get('status')} - {order.get('final_amount')} ل.س")
            return orders
        else:
            print(f"❌ فشل جلب الطلبات")
            print(f"Response: {response.text}")
            return []
    except Exception as e:
        print(f"❌ خطأ: {e}")
        return []

def test_update_order_status(order_id: int):
    """اختبار تحديث حالة الطلب"""
    print("\n" + "="*50)
    print(f"🧪 اختبار تحديث حالة الطلب #{order_id}")
    print("="*50)
    
    try:
        # Test updating to "processing"
        response = requests.put(
            f"{BASE_URL}/admin/orders/{order_id}/status",
            params={"status": "processing"}
        )
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ تم تحديث حالة الطلب إلى 'processing'")
            print(f"New Status: {data.get('order', {}).get('status')}")
            
            # Test updating to "completed"
            response2 = requests.put(
                f"{BASE_URL}/admin/orders/{order_id}/status",
                params={"status": "completed"}
            )
            if response2.status_code == 200:
                print(f"✅ تم تحديث حالة الطلب إلى 'completed'")
            return True
        else:
            print(f"❌ فشل تحديث حالة الطلب")
            print(f"Response: {response.text}")
            return False
    except Exception as e:
        print(f"❌ خطأ: {e}")
        return False

def test_order_database_integration():
    """اختبار التكامل مع قاعدة البيانات"""
    print("\n" + "="*50)
    print("🧪 اختبار التكامل مع قاعدة البيانات")
    print("="*50)
    
    # Create order
    order_id = test_create_order()
    if not order_id:
        print("❌ فشل اختبار التكامل - لم يتم إنشاء الطلب")
        return False
    
    # Wait a bit for background tasks
    import time
    time.sleep(1)
    
    # Verify order exists
    orders = test_get_orders()
    if not any(o.get('id') == order_id for o in orders):
        print("❌ فشل - الطلب غير موجود في قائمة الطلبات")
        return False
    
    # Verify in admin API
    admin_orders = test_admin_get_orders()
    if not any(o.get('id') == order_id for o in admin_orders):
        print("❌ فشل - الطلب غير موجود في Admin API")
        return False
    
    # Verify order details
    order = test_get_order_by_id(order_id)
    if not order:
        print("❌ فشل - لم يتم جلب تفاصيل الطلب")
        return False
    
    # Verify order items
    if not order.get('items') or len(order.get('items', [])) == 0:
        print("❌ فشل - الطلب لا يحتوي على عناصر")
        return False
    
    print("\n✅ جميع اختبارات التكامل نجحت!")
    return True

def run_all_tests():
    """تشغيل جميع الاختبارات"""
    print("\n" + "="*70)
    print("🚀 بدء سلسلة الاختبارات الشاملة لنظام الطلبات")
    print("="*70)
    
    results = {
        "create_order": False,
        "get_orders": False,
        "get_order_by_id": False,
        "admin_get_orders": False,
        "update_status": False,
        "database_integration": False
    }
    
    # Test 1: Create order
    order_id = test_create_order()
    results["create_order"] = order_id is not None
    
    if order_id:
        # Test 2: Get all orders
        orders = test_get_orders()
        results["get_orders"] = len(orders) > 0
        
        # Test 3: Get order by ID
        order = test_get_order_by_id(order_id)
        results["get_order_by_id"] = order is not None
        
        # Test 4: Admin get orders
        admin_orders = test_admin_get_orders()
        results["admin_get_orders"] = len(admin_orders) > 0
        
        # Test 5: Update status
        results["update_status"] = test_update_order_status(order_id)
    
    # Test 6: Database integration
    results["database_integration"] = test_order_database_integration()
    
    # Print summary
    print("\n" + "="*70)
    print("📊 ملخص النتائج")
    print("="*70)
    for test_name, passed in results.items():
        status = "✅ نجح" if passed else "❌ فشل"
        print(f"{test_name}: {status}")
    
    total_passed = sum(results.values())
    total_tests = len(results)
    print(f"\nالنتيجة النهائية: {total_passed}/{total_tests} اختبار نجح")
    
    if total_passed == total_tests:
        print("🎉 جميع الاختبارات نجحت!")
    else:
        print("⚠️ بعض الاختبارات فشلت - يرجى مراجعة الأخطاء")
    
    return results

if __name__ == "__main__":
    run_all_tests()

