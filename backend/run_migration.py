# -*- coding: utf-8 -*-
"""Run migration endpoint to add order columns"""
import sys
import time
import requests

# Fix encoding for Windows console
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

BASE_URL = "https://khawam-pro-production.up.railway.app/api"

print("انتظر 3 دقائق لاكمال النشر على Railway...")
time.sleep(180)

print("جار تشغيل migration endpoint...")
try:
    response = requests.post(f"{BASE_URL}/admin/maintenance/add-order-columns")
    print(f"Status Code: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print("نجح اضافة الاعمدة!")
        print(f"Added columns: {data.get('added_columns', [])}")
        print(f"Message: {data.get('message', '')}")
    else:
        print("فشل:")
        print(response.text)
except Exception as e:
    print(f"خطا: {e}")

