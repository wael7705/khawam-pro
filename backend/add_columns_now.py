# -*- coding: utf-8 -*-
"""Add order columns directly to Railway database"""
import sys
import time
import requests

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

BASE_URL = "https://khawam-pro-production.up.railway.app/api"

print("انتظر 3 دقائق حتى يكتمل النشر...")
time.sleep(180)

print("جار تشغيل migration endpoint...")
try:
    response = requests.post(f"{BASE_URL}/admin/maintenance/add-order-columns")
    print(f"Status Code: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print("نجح اضافة الاعمدة!")
        print(f"Added columns: {data.get('added_columns', [])}")
        print(f"Existing columns: {data.get('existing_columns', [])}")
        print(f"Total orders: {data.get('total_orders', 0)}")
        print(f"Message: {data.get('message', '')}")
    else:
        print("فشل:")
        print(response.text)
except Exception as e:
    print(f"خطا: {e}")
    import traceback
    traceback.print_exc()

