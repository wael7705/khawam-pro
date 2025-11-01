# -*- coding: utf-8 -*-
"""Update old orders with customer data from notes if available"""
import sys
import requests

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

BASE_URL = "https://khawam-pro-production.up.railway.app/api"

# Test if we can access orders
print("جارٍ فحص الطلبات...")
try:
    response = requests.get(f"{BASE_URL}/admin/orders/all")
    if response.status_code == 200:
        orders = response.json()
        print(f"عدد الطلبات: {len(orders)}")
        
        # Check orders with missing customer data
        orders_without_name = [o for o in orders if not o.get('customer_name')]
        print(f"طلبات بدون اسم عميل: {len(orders_without_name)}")
        
        # Show sample orders
        for order in orders[:3]:
            print(f"\nطلب #{order.get('order_number')}:")
            print(f"  الاسم: '{order.get('customer_name')}'")
            print(f"  الهاتف: '{order.get('customer_phone')}'")
            print(f"  الملاحظات: {order.get('notes') or 'لا توجد'}")
except Exception as e:
    print(f"خطأ: {e}")

