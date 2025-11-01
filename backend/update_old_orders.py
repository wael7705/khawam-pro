# -*- coding: utf-8 -*-
"""Update old orders with customer data"""
import sys
import time
import requests

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

BASE_URL = "https://khawam-pro-production.up.railway.app/api"

print("="*70)
print("جارٍ تحديث الطلبات القديمة ببيانات العميل...")
print("="*70)

print("\nانتظر 3 دقائق حتى يكتمل النشر...")
time.sleep(180)

print("\nجارٍ تشغيل update endpoint...")
try:
    response = requests.post(f"{BASE_URL}/admin/maintenance/update-old-orders-customer-data", timeout=30)
    
    print(f"\nStatus Code: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print("\n✅ نجح تحديث الطلبات القديمة!")
        print(f"\nعدد الطلبات المحدثة: {data.get('updated_orders', 0)}")
        print(f"Message: {data.get('message', '')}")
        
        print("\n✅ الآن يجب أن تظهر بيانات العميل في جميع الطلبات!")
    else:
        print(f"\n❌ فشل:")
        print(f"Response: {response.text}")
        
except requests.exceptions.Timeout:
    print("\n❌ انتهت مهلة الاتصال. حاول مرة أخرى.")
except requests.exceptions.ConnectionError:
    print("\n❌ لا يمكن الاتصال بالخادم. تأكد من أن النشر اكتمل.")
except Exception as e:
    print(f"\n❌ خطأ: {e}")
    import traceback
    traceback.print_exc()

print("\n" + "="*70)

