"""
Script to create a test shipping order with latitude and longitude
"""
import sys
import os
import requests
import json
import time

# Fix encoding for Windows
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')

# Disable SSL verification warnings (for Railway)
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# API base URL
BASE_URL = os.getenv('API_URL', 'https://khawam-pro-production.up.railway.app/api')

def create_shipping_order():
    """Create a test shipping order with coordinates"""
    
    order_data = {
        "customer_name": "خالد حسن",
        "customer_phone": "0993456789",
        "customer_whatsapp": "0993456789",
        "shop_name": "متجر التوصيل",
        "items": [
            {
                "service_name": "تصميم لوجو وتوصيل",
                "quantity": 1,
                "unit_price": 80000,
                "total_price": 80000,
                "specifications": {
                    "colors": ["أزرق", "أبيض"],
                    "work_type": "لوجو"
                }
            }
        ],
        "total_amount": 80000,
        "final_amount": 80000,
        "delivery_type": "delivery",
        "delivery_address": "دمشق، شارع مزة، بناء 15",
        "notes": "طلب اختبار للتوصيل مع إحداثيات GPS"
    }
    
    print("Creating shipping order with coordinates...")
    print(f"API URL: {BASE_URL}\n")
    
    max_retries = 3
    retry_delay = 2
    
    for attempt in range(max_retries):
        try:
            response = requests.post(
                f"{BASE_URL}/orders/",
                json=order_data,
                headers={"Content-Type": "application/json"},
                timeout=30,
                verify=False
            )
            break
        except (requests.exceptions.ConnectionError, requests.exceptions.Timeout) as e:
            if attempt < max_retries - 1:
                print(f"  [RETRY {attempt+1}/{max_retries}] Connection error, retrying in {retry_delay}s...")
                time.sleep(retry_delay)
                retry_delay *= 2
                continue
            else:
                print(f"[ERROR] Failed after {max_retries} attempts")
                raise
    
    try:
        if response.status_code == 200 or response.status_code == 201:
            order_result = response.json()
            order_id = None
            
            if "order" in order_result:
                order_id = order_result["order"]["id"]
            elif "id" in order_result:
                order_id = order_result["id"]
            elif isinstance(order_result, dict) and "success" in order_result:
                if "order" in order_result.get("order", {}):
                    order_id = order_result["order"]["id"]
            
            if not order_id:
                print("[ERROR] Could not extract order ID from response")
                print(f"Response: {json.dumps(order_result, indent=2, ensure_ascii=False)}")
                return None
            
            print(f"[OK] Order created with ID: {order_id}")
            
            # Update status to shipping
            print("\nUpdating order status to 'shipping'...")
            update_response = requests.put(
                f"{BASE_URL}/admin/orders/{order_id}/status",
                json={"status": "shipping"},
                headers={"Content-Type": "application/json"},
                timeout=30,
                verify=False
            )
            
            if update_response.status_code == 200:
                print("[OK] Status updated to: shipping")
            else:
                print(f"[WARNING] Failed to update status: {update_response.status_code}")
                print(f"Response: {update_response.text[:200]}")
            
            # Update order with coordinates
            print("\nAdding coordinates to order...")
            # Damascus coordinates: 33.5138, 36.2765
            # We'll add a slight offset for testing: 33.5200, 36.2850
            coordinates_data = {
                "latitude": 33.5200,
                "longitude": 36.2850
            }
            
            coord_response = requests.put(
                f"{BASE_URL}/admin/orders/{order_id}/delivery-coordinates",
                json=coordinates_data,
                headers={"Content-Type": "application/json"},
                timeout=30,
                verify=False
            )
            
            if coord_response.status_code == 200:
                print(f"[OK] Coordinates added: {coordinates_data['latitude']}, {coordinates_data['longitude']}")
            else:
                print(f"[WARNING] Failed to add coordinates: {coord_response.status_code}")
                print(f"Response: {coord_response.text[:200]}")
            
            print("\n" + "="*50)
            print("[SUCCESS] Shipping order created successfully!")
            print(f"Order ID: {order_id}")
            print(f"Status: shipping")
            print(f"Coordinates: {coordinates_data['latitude']}, {coordinates_data['longitude']}")
            print("="*50)
            
            return order_id
        else:
            print(f"[FAILED] Failed to create order: {response.status_code}")
            print(f"Response: {response.text[:200]}")
            return None
    
    except Exception as e:
        print(f"[ERROR] Error creating order: {str(e)}")
        import traceback
        traceback.print_exc()
        return None

if __name__ == "__main__":
    print("="*50)
    print("Creating Test Shipping Order with Coordinates")
    print("="*50)
    create_shipping_order()
