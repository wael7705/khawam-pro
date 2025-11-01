# -*- coding: utf-8 -*-
"""Check orders after deployment"""
import sys
import time
import requests

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

BASE_URL = "https://khawam-pro-production.up.railway.app/api"

print("="*70)
print("انتظر 90 ثانية حتى يكتمل النشر...")
print("="*70)
time.sleep(90)

print("\nجارٍ التحقق من الطلبات...")
try:
    r = requests.get(f"{BASE_URL}/admin/orders/all", timeout=10)
    if r.status_code == 200:
        orders = r.json()
        print(f"\n✅ عدد الطلبات: {len(orders)}")
        print("\nأحدث 3 طلبات:")
        for o in orders[:3]:
            name = o.get('customer_name', 'N/A')
            phone = o.get('customer_phone', 'N/A')
            print(f"  - {o['order_number']}: الاسم='{name}' الهاتف='{phone}'")
        
        orders_with_data = [o for o in orders if o.get('customer_name') and o.get('customer_phone')]
        print(f"\n✅ عدد الطلبات ببيانات عميل: {len(orders_with_data)}/{len(orders)}")
        
        if len(orders_with_data) == len(orders):
            print("\n🎉 نجح! جميع الطلبات تظهر بيانات العميل الآن!")
        else:
            print(f"\n⚠️ {len(orders) - len(orders_with_data)} طلب لا تزال بدون بيانات")
    else:
        print(f"❌ خطأ: {r.status_code}")
        print(r.text)
except Exception as e:
    print(f"❌ خطأ: {e}")

