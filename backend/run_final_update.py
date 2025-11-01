# -*- coding: utf-8 -*-
"""Run final updates after deployment"""
import sys
import time
import requests

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

BASE_URL = "https://khawam-pro-production.up.railway.app"

def wait_for_deployment():
    """Wait for deployment to complete"""
    print("="*70)
    print("انتظر حتى يكتمل النشر على Railway...")
    print("="*70)
    
    max_attempts = 20
    for i in range(max_attempts):
        try:
            response = requests.get(f"{BASE_URL}/api/health", timeout=5)
            if response.status_code == 200:
                print("✅ النشر اكتمل! الخادم متاح.")
                return True
        except:
            pass
        
        print(f"محاولة {i+1}/{max_attempts}... انتظر 15 ثانية...")
        time.sleep(15)
    
    print("⚠️ لم يتم التأكد من اكتمال النشر. المتابعة على أي حال...")
    return False

def update_old_orders():
    """Update old orders with customer data"""
    print("\n" + "="*70)
    print("جارٍ تحديث الطلبات القديمة ببيانات العميل...")
    print("="*70)
    
    try:
        response = requests.post(
            f"{BASE_URL}/api/admin/maintenance/update-old-orders-customer-data",
            timeout=30
        )
        
        print(f"\nStatus Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("✅ نجح تحديث الطلبات!")
            print(f"عدد الطلبات المحدثة: {data.get('updated_orders', 0)}")
            print(f"Message: {data.get('message', '')}")
            return True
        else:
            print(f"❌ فشل:")
            print(f"Response: {response.text}")
            return False
    except Exception as e:
        print(f"❌ خطأ: {e}")
        return False

def check_orders():
    """Check if orders are now showing customer data"""
    print("\n" + "="*70)
    print("جارٍ التحقق من الطلبات...")
    print("="*70)
    
    try:
        response = requests.get(f"{BASE_URL}/api/admin/orders/all", timeout=10)
        if response.status_code == 200:
            orders = response.json()
            print(f"\nعدد الطلبات: {len(orders)}")
            
            orders_with_customer = [o for o in orders if o.get('customer_name')]
            print(f"طلبات ببيانات عميل: {len(orders_with_customer)}")
            
            if orders:
                print("\nأحدث 3 طلبات:")
                for order in orders[:3]:
                    name = order.get('customer_name', 'N/A')
                    phone = order.get('customer_phone', 'N/A')
                    print(f"  - {order.get('order_number')}: {name} - {phone}")
            
            return len(orders_with_customer) > 0
    except Exception as e:
        print(f"❌ خطأ في التحقق: {e}")
        return False

if __name__ == "__main__":
    # Wait for deployment
    if wait_for_deployment():
        # Update old orders
        update_old_orders()
        
        # Wait a bit for database update
        time.sleep(2)
        
        # Check results
        check_orders()
        
        print("\n" + "="*70)
        print("✅ اكتمل! الآن يمكنك:")
        print("1. فتح صفحة الطلبات والتحقق من ظهور بيانات العميل")
        print("2. اختبار تبويب الأعمال - يجب أن يكون أسرع")
        print("="*70)

