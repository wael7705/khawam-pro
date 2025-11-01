# -*- coding: utf-8 -*-
"""Run migration to add order columns"""
import sys
import time
import requests

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

BASE_URL = "https://khawam-pro-production.up.railway.app/api"

print("="*70)
print("جاري تشغيل migration لإضافة الأعمدة المفقودة...")
print("="*70)

try:
    print("\n1. جاري الاتصال بـ API...")
    response = requests.post(f"{BASE_URL}/admin/maintenance/add-order-columns", timeout=30)
    
    print(f"\n2. Status Code: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print("\n✅ نجح إضافة الأعمدة!")
        print(f"\nالأعمدة المضافة: {data.get('added_columns', [])}")
        print(f"الأعمدة الموجودة مسبقاً: {data.get('existing_columns', [])}")
        print(f"إجمالي الطلبات في قاعدة البيانات: {data.get('total_orders', 0)}")
        print(f"\nرسالة: {data.get('message', '')}")
        
        if data.get('total_orders', 0) > 0:
            print("\n✅ تم العثور على طلبات! الآن يجب أن تظهر في الواجهة.")
        else:
            print("\n⚠️ لا توجد طلبات في قاعدة البيانات بعد.")
    else:
        print(f"\n❌ فشل إضافة الأعمدة:")
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
print("اكتمل")

