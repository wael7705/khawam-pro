"""
سكريبت اختبار للتحقق من إنشاء الطلبات وظهورها في لوحة التحكم
"""
import requests
import json
from datetime import datetime

BASE_URL = "http://localhost:8000/api"

def test_create_order():
    """اختبار إنشاء طلب جديد"""
    print("=" * 60)
    print("🧪 اختبار إنشاء طلب جديد")
    print("=" * 60)
    
    order_data = {
        "customer_name": "وائل",
        "customer_phone": "09991234567",
        "customer_whatsapp": "09991234567",
        "shop_name": None,
        "service_name": "طباعة محاضرات",
        "total_amount": 0,
        "final_amount": 0,
        "delivery_type": "self",
        "delivery_address": None,
        "notes": "طلب اختبار",
        "items": [
            {
                "service_name": "طباعة محاضرات",
                "quantity": 1,
                "unit_price": 0,
                "total_price": 0,
                "specifications": {
                    "paper_size": "A4",
                    "print_color": "color",
                    "print_quality": "standard",
                    "print_sides": "single",
                    "number_of_pages": 10
                },
                "design_files": []
            }
        ]
    }
    
    try:
        print(f"📤 إرسال طلب إنشاء طلب جديد...")
        response = requests.post(
            f"{BASE_URL}/orders/",
            json=order_data,
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        
        print(f"📥 Status Code: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ تم إنشاء الطلب بنجاح!")
            print(f"   Order Number: {result.get('order', {}).get('order_number', 'N/A')}")
            print(f"   Order ID: {result.get('order', {}).get('id', 'N/A')}")
            print(f"   Message: {result.get('message', 'N/A')}")
            
            order_number = result.get('order', {}).get('order_number')
            order_id = result.get('order', {}).get('id')
            
            return order_number, order_id
        else:
            print(f"❌ فشل إنشاء الطلب!")
            print(f"   Response: {response.text}")
            return None, None
            
    except Exception as e:
        print(f"❌ خطأ في إنشاء الطلب: {str(e)}")
        import traceback
        traceback.print_exc()
        return None, None

def test_verify_order(order_number: str):
    """اختبار التحقق من وجود الطلب"""
    print("\n" + "=" * 60)
    print(f"🔍 اختبار التحقق من الطلب: {order_number}")
    print("=" * 60)
    
    try:
        response = requests.get(
            f"{BASE_URL}/admin/orders/verify/{order_number}",
            timeout=30
        )
        
        print(f"📥 Status Code: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            if result.get('exists'):
                print(f"✅ الطلب موجود ويمكن الوصول إليه!")
                order = result.get('order', {})
                print(f"   Order ID: {order.get('id')}")
                print(f"   Customer Name: {order.get('customer_name')}")
                print(f"   Customer Phone: {order.get('customer_phone')}")
                print(f"   Status: {order.get('status')}")
                print(f"   Items Count: {order.get('items_count')}")
                return True
            else:
                print(f"❌ الطلب غير موجود!")
                print(f"   Message: {result.get('message', 'N/A')}")
                return False
        else:
            print(f"❌ فشل التحقق من الطلب!")
            print(f"   Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ خطأ في التحقق من الطلب: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def test_get_all_orders():
    """اختبار جلب جميع الطلبات من لوحة التحكم"""
    print("\n" + "=" * 60)
    print("📋 اختبار جلب جميع الطلبات من لوحة التحكم")
    print("=" * 60)
    
    try:
        response = requests.get(
            f"{BASE_URL}/admin/orders/all",
            timeout=30
        )
        
        print(f"📥 Status Code: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            if result.get('success'):
                orders = result.get('orders', [])
                count = result.get('count', 0)
                print(f"✅ تم جلب {count} طلب من لوحة التحكم")
                
                if orders:
                    print(f"\n📦 آخر 5 طلبات:")
                    for i, order in enumerate(orders[:5], 1):
                        print(f"   {i}. {order.get('order_number')} - {order.get('customer_name')} - {order.get('status')}")
                
                return True, orders
            else:
                print(f"❌ فشل جلب الطلبات!")
                print(f"   Response: {response.text}")
                return False, []
        else:
            print(f"❌ فشل جلب الطلبات!")
            print(f"   Response: {response.text}")
            return False, []
            
    except Exception as e:
        print(f"❌ خطأ في جلب الطلبات: {str(e)}")
        import traceback
        traceback.print_exc()
        return False, []

def test_order_in_dashboard(order_number: str, orders_list: list):
    """اختبار وجود الطلب في قائمة الطلبات"""
    print("\n" + "=" * 60)
    print(f"🔍 اختبار وجود الطلب {order_number} في لوحة التحكم")
    print("=" * 60)
    
    found_order = None
    for order in orders_list:
        if order.get('order_number') == order_number:
            found_order = order
            break
    
    if found_order:
        print(f"✅ الطلب موجود في لوحة التحكم!")
        print(f"   Order Number: {found_order.get('order_number')}")
        print(f"   Customer Name: {found_order.get('customer_name')}")
        print(f"   Status: {found_order.get('status')}")
        print(f"   Created At: {found_order.get('created_at')}")
        return True
    else:
        print(f"❌ الطلب غير موجود في لوحة التحكم!")
        print(f"   تم البحث في {len(orders_list)} طلب")
        return False

def main():
    """تشغيل جميع الاختبارات"""
    print("\n" + "=" * 60)
    print("🚀 بدء اختبارات التحقق من إنشاء الطلبات")
    print("=" * 60)
    
    # 1. إنشاء طلب جديد
    order_number, order_id = test_create_order()
    
    if not order_number:
        print("\n❌ فشل الاختبار: لم يتم إنشاء الطلب")
        return
    
    # 2. التحقق من وجود الطلب
    if not test_verify_order(order_number):
        print("\n❌ فشل الاختبار: الطلب غير موجود")
        return
    
    # 3. جلب جميع الطلبات من لوحة التحكم
    success, orders_list = test_get_all_orders()
    
    if not success:
        print("\n❌ فشل الاختبار: لم يتم جلب الطلبات من لوحة التحكم")
        return
    
    # 4. التحقق من وجود الطلب في لوحة التحكم
    if not test_order_in_dashboard(order_number, orders_list):
        print("\n❌ فشل الاختبار: الطلب غير موجود في لوحة التحكم")
        return
    
    print("\n" + "=" * 60)
    print("✅ جميع الاختبارات نجحت!")
    print("=" * 60)
    print(f"   Order Number: {order_number}")
    print(f"   Order ID: {order_id}")
    print(f"   Total Orders in Dashboard: {len(orders_list)}")

if __name__ == "__main__":
    main()

