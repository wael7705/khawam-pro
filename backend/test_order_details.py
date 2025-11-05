"""
اختبار endpoint جلب تفاصيل الطلب
"""
import requests
import json
import sys

BASE_URL = "https://khawam-pro-production.up.railway.app/api"

def test_get_order_details(order_id: int):
    """اختبار جلب تفاصيل طلب محدد"""
    print(f"\n{'='*60}")
    print(f"اختبار جلب تفاصيل الطلب #{order_id}")
    print(f"{'='*60}\n")
    
    try:
        # جلب تفاصيل الطلب
        url = f"{BASE_URL}/admin/orders/{order_id}"
        print(f"📡 الطلب: GET {url}")
        
        response = requests.get(url, timeout=10)
        
        print(f"📊 الحالة: {response.status_code}")
        print(f"📋 Headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ نجح!")
            print(f"📦 البيانات:")
            print(json.dumps(data, indent=2, ensure_ascii=False))
            return True
        else:
            print(f"❌ فشل!")
            print(f"📄 Response Text:")
            print(response.text)
            try:
                error_data = response.json()
                print(f"📦 Error JSON:")
                print(json.dumps(error_data, indent=2, ensure_ascii=False))
            except:
                pass
            return False
            
    except Exception as e:
        print(f"❌ خطأ: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_get_all_orders():
    """اختبار جلب جميع الطلبات"""
    print(f"\n{'='*60}")
    print(f"اختبار جلب جميع الطلبات")
    print(f"{'='*60}\n")
    
    try:
        url = f"{BASE_URL}/admin/orders/all"
        print(f"📡 الطلب: GET {url}")
        
        response = requests.get(url, timeout=10)
        
        print(f"📊 الحالة: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            orders = data if isinstance(data, list) else (data.get('orders', []) if isinstance(data, dict) else [])
            print(f"✅ نجح! عدد الطلبات: {len(orders)}")
            if orders:
                print(f"📋 أول طلب:")
                print(json.dumps(orders[0], indent=2, ensure_ascii=False))
                return orders[0].get('id') if isinstance(orders[0], dict) else None
            return None
        else:
            print(f"❌ فشل!")
            print(f"📄 Response Text:")
            print(response.text)
            return None
            
    except Exception as e:
        print(f"❌ خطأ: {e}")
        import traceback
        traceback.print_exc()
        return None

if __name__ == "__main__":
    print("\n" + "="*60)
    print("اختبار نظام جلب تفاصيل الطلبات")
    print("="*60)
    
    # اختبار جلب جميع الطلبات أولاً
    first_order_id = test_get_all_orders()
    
    # اختبار جلب تفاصيل طلب محدد
    if first_order_id:
        test_get_order_details(first_order_id)
    else:
        # اختبار بطلب ID محدد
        test_order_id = 24
        print(f"\n⚠️ لم يتم العثور على طلبات، اختبار بطلب ID: {test_order_id}")
        test_get_order_details(test_order_id)
    
    print("\n" + "="*60)
    print("انتهى الاختبار")
    print("="*60 + "\n")


