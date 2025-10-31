"""
اختبار شامل لنظام إدارة الطلبات الكامل
Tests the complete orders management system
"""
import requests
import json
from decimal import Decimal

BASE_URL = "https://khawam-pro-production.up.railway.app/api"
# BASE_URL = "http://localhost:8000/api"  # للاختبار المحلي

def test_create_order_with_customer_info():
    """اختبار إنشاء طلب مع معلومات العميل الكاملة"""
    print("\n" + "="*70)
    print("🧪 اختبار إنشاء طلب مع معلومات العميل")
    print("="*70)
    
    order_data = {
        "customer_name": "وائل",
        "customer_phone": "963991234567",
        "customer_whatsapp": "963991234567",
        "shop_name": "متجر وائل للطباعة",
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
            print(f"Customer Name: {order_data['customer_name']}")
            return data.get('order', {}).get('id')
        else:
            print(f"❌ فشل إنشاء الطلب")
            print(f"Response: {response.text}")
            return None
    except Exception as e:
        print(f"❌ خطأ: {e}")
        return None

def test_get_all_orders_with_customer_info():
    """اختبار جلب جميع الطلبات مع معلومات العملاء"""
    print("\n" + "="*70)
    print("🧪 اختبار جلب جميع الطلبات من Admin API")
    print("="*70)
    
    try:
        response = requests.get(f"{BASE_URL}/admin/orders/all")
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            orders = response.json() if isinstance(response.json(), list) else []
            print(f"✅ تم جلب {len(orders)} طلب")
            
            # Check for orders with customer name "وائل"
            wael_orders = [o for o in orders if o.get('customer_name') == 'وائل']
            if wael_orders:
                print(f"\n✅ تم العثور على {len(wael_orders)} طلب باسم 'وائل':")
                for order in wael_orders:
                    print(f"  - {order.get('order_number')}: {order.get('customer_name')} - {order.get('customer_phone')}")
            else:
                print("\n⚠️ لم يتم العثور على طلبات باسم 'وائل'")
            
            if orders:
                print("\nأحدث 3 طلبات:")
                for order in orders[:3]:
                    customer_info = f"{order.get('customer_name', 'N/A')} ({order.get('customer_phone', 'N/A')})"
                    print(f"  - {order.get('order_number')}: {customer_info} - {order.get('status')} - {order.get('final_amount')} ل.س")
            return orders
        else:
            print(f"❌ فشل جلب الطلبات")
            print(f"Response: {response.text}")
            return []
    except Exception as e:
        print(f"❌ خطأ: {e}")
        return []

def test_get_order_details(order_id: int):
    """اختبار جلب تفاصيل الطلب الكاملة"""
    print("\n" + "="*70)
    print(f"🧪 اختبار جلب تفاصيل الطلب #{order_id}")
    print("="*70)
    
    try:
        response = requests.get(f"{BASE_URL}/admin/orders/{order_id}")
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            order = data.get('order', {})
            print(f"✅ تم جلب تفاصيل الطلب")
            print(f"Order Number: {order.get('order_number')}")
            print(f"Customer: {order.get('customer_name')} - {order.get('customer_phone')}")
            print(f"WhatsApp: {order.get('customer_whatsapp')}")
            print(f"Shop: {order.get('shop_name')}")
            print(f"Status: {order.get('status')}")
            print(f"Delivery Type: {order.get('delivery_type')}")
            print(f"Items: {len(order.get('items', []))}")
            print(f"Staff Notes: {order.get('staff_notes') or 'لا توجد ملاحظات'}")
            return order
        else:
            print(f"❌ فشل جلب تفاصيل الطلب")
            print(f"Response: {response.text}")
            return None
    except Exception as e:
        print(f"❌ خطأ: {e}")
        return None

def test_update_status(order_id: int, new_status: str):
    """اختبار تحديث حالة الطلب"""
    print("\n" + "="*70)
    print(f"🧪 اختبار تحديث حالة الطلب #{order_id} إلى '{new_status}'")
    print("="*70)
    
    try:
        response = requests.put(
            f"{BASE_URL}/admin/orders/{order_id}/status",
            params={"status": new_status}
        )
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ تم تحديث حالة الطلب")
            print(f"New Status: {data.get('order', {}).get('status')}")
            return True
        else:
            print(f"❌ فشل تحديث حالة الطلب")
            print(f"Response: {response.text}")
            return False
    except Exception as e:
        print(f"❌ خطأ: {e}")
        return False

def test_update_staff_notes(order_id: int, notes: str):
    """اختبار إضافة/تحديث ملاحظات الموظف"""
    print("\n" + "="*70)
    print(f"🧪 اختبار حفظ ملاحظات الموظف للطلب #{order_id}")
    print("="*70)
    
    try:
        response = requests.put(
            f"{BASE_URL}/admin/orders/{order_id}/staff-notes",
            json={"notes": notes}
        )
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ تم حفظ الملاحظات")
            print(f"Notes: {data.get('staff_notes')}")
            return True
        else:
            print(f"❌ فشل حفظ الملاحظات")
            print(f"Response: {response.text}")
            return False
    except Exception as e:
        print(f"❌ خطأ: {e}")
        return False

def test_all_statuses(order_id: int):
    """اختبار جميع حالات الطلب"""
    print("\n" + "="*70)
    print(f"🧪 اختبار جميع حالات الطلب #{order_id}")
    print("="*70)
    
    statuses = [
        ('accepted', 'تم القبول'),
        ('preparing', 'قيد التحضير'),
        ('shipping', 'قيد التوصيل'),
        ('awaiting_pickup', 'في انتظار الاستلام'),
        ('completed', 'مكتمل')
    ]
    
    results = {}
    for status, label in statuses:
        results[status] = test_update_status(order_id, status)
    
    return results

def test_database_integration():
    """اختبار التكامل الكامل مع قاعدة البيانات"""
    print("\n" + "="*70)
    print("🧪 اختبار التكامل الكامل مع قاعدة البيانات")
    print("="*70)
    
    # 1. Create order
    order_id = test_create_order_with_customer_info()
    if not order_id:
        print("❌ فشل اختبار التكامل - لم يتم إنشاء الطلب")
        return False
    
    import time
    time.sleep(2)  # Wait for background tasks
    
    # 2. Verify order appears in list
    orders = test_get_all_orders_with_customer_info()
    if not any(o.get('id') == order_id for o in orders):
        print("❌ فشل - الطلب غير موجود في قائمة الطلبات")
        return False
    
    # 3. Get order details
    order = test_get_order_details(order_id)
    if not order:
        print("❌ فشل - لم يتم جلب تفاصيل الطلب")
        return False
    
    # 4. Verify customer info
    if not order.get('customer_name'):
        print("❌ فشل - اسم العميل غير موجود")
        return False
    
    if not order.get('customer_phone'):
        print("❌ فشل - رقم العميل غير موجود")
        return False
    
    # 5. Test status updates
    status_results = test_all_statuses(order_id)
    if not all(status_results.values()):
        print("⚠️ بعض تحديثات الحالة فشلت")
    
    # 6. Test staff notes
    notes_saved = test_update_staff_notes(order_id, "ملاحظة تجريبية من الموظف - تم الاختبار بنجاح")
    if not notes_saved:
        print("❌ فشل - لم يتم حفظ ملاحظات الموظف")
        return False
    
    # 7. Verify notes saved
    order_after = test_get_order_details(order_id)
    if order_after and order_after.get('staff_notes') != "ملاحظة تجريبية من الموظف - تم الاختبار بنجاح":
        print("❌ فشل - الملاحظات لم تُحفظ بشكل صحيح")
        return False
    
    print("\n✅ جميع اختبارات التكامل نجحت!")
    return True

def run_comprehensive_tests():
    """تشغيل جميع الاختبارات الشاملة"""
    print("\n" + "="*70)
    print("🚀 بدء الاختبارات الشاملة لنظام إدارة الطلبات")
    print("="*70)
    
    results = {
        "create_order": False,
        "get_orders": False,
        "get_order_details": False,
        "update_status": False,
        "update_staff_notes": False,
        "all_statuses": False,
        "database_integration": False
    }
    
    # Test 1: Create order
    order_id = test_create_order_with_customer_info()
    results["create_order"] = order_id is not None
    
    if order_id:
        # Test 2: Get all orders
        orders = test_get_all_orders_with_customer_info()
        results["get_orders"] = len(orders) > 0
        
        # Test 3: Get order details
        order = test_get_order_details(order_id)
        results["get_order_details"] = order is not None
        
        # Test 4: Update status
        results["update_status"] = test_update_status(order_id, 'accepted')
        
        # Test 5: Update staff notes
        results["update_staff_notes"] = test_update_staff_notes(order_id, "ملاحظة اختبار")
        
        # Test 6: All statuses
        status_results = test_all_statuses(order_id)
        results["all_statuses"] = all(status_results.values())
    
    # Test 7: Complete integration
    results["database_integration"] = test_database_integration()
    
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
    run_comprehensive_tests()

