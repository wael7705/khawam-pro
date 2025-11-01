"""
Script to create test orders with various statuses for testing
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

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# API base URL
BASE_URL = os.getenv('API_URL', 'https://khawam-pro-production.up.railway.app/api')

def create_test_orders():
    """Create test orders with different statuses"""
    orders_data = [
        {
            "customer_name": "أحمد محمد",
            "customer_phone": "0991234567",
            "customer_whatsapp": "0991234567",
            "shop_name": "متجر التصميم",
            "items": [
                {
                    "service_name": "تصميم لوجو",
                    "quantity": 1,
                    "unit_price": 50000,
                    "total_price": 50000,
                    "specifications": {
                        "colors": ["أزرق", "أبيض"],
                        "work_type": "لوجو"
                    }
                }
            ],
            "total_amount": 50000,
            "final_amount": 50000,
            "delivery_type": "self",
            "notes": "طلب اختبار - حالة: في الانتظار"
        },
        {
            "customer_name": "فاطمة علي",
            "customer_phone": "0992345678",
            "customer_whatsapp": "0992345678",
            "shop_name": "مطبعة النجوم",
            "items": [
                {
                    "service_name": "طباعة بنرات",
                    "quantity": 2,
                    "unit_price": 30000,
                    "total_price": 60000,
                    "specifications": {
                        "dimensions": {"width": 100, "height": 50},
                        "work_type": "طباعة"
                    }
                }
            ],
            "total_amount": 60000,
            "final_amount": 60000,
            "delivery_type": "delivery",
            "delivery_address": "دمشق، شارع العابد",
            "notes": "طلب اختبار - حالة: قيد التحضير"
        },
        {
            "customer_name": "خالد حسن",
            "customer_phone": "0993456789",
            "customer_whatsapp": "0993456789",
            "items": [
                {
                    "service_name": "تصميم كتالوج",
                    "quantity": 1,
                    "unit_price": 80000,
                    "total_price": 80000,
                    "specifications": {
                        "work_type": "تصميم",
                        "pages": 20
                    }
                }
            ],
            "total_amount": 80000,
            "final_amount": 80000,
            "delivery_type": "self",
            "notes": "طلب اختبار - حالة: قيد التوصيل"
        },
        {
            "customer_name": "سارة يوسف",
            "customer_phone": "0994567890",
            "customer_whatsapp": "0994567890",
            "shop_name": "دار النشر",
            "items": [
                {
                    "service_name": "تصميم بطاقات عمل",
                    "quantity": 500,
                    "unit_price": 100,
                    "total_price": 50000,
                    "specifications": {
                        "colors": ["أسود", "ذهبي"],
                        "work_type": "طباعة"
                    }
                }
            ],
            "total_amount": 50000,
            "final_amount": 50000,
            "delivery_type": "self",
            "notes": "طلب اختبار - حالة: في انتظار الاستلام"
        },
        {
            "customer_name": "محمد خالد",
            "customer_phone": "0995678901",
            "customer_whatsapp": "0995678901",
            "items": [
                {
                    "service_name": "تصميم موقع ويب",
                    "quantity": 1,
                    "unit_price": 200000,
                    "total_price": 200000,
                    "specifications": {
                        "work_type": "تصميم",
                        "pages": 5
                    }
                }
            ],
            "total_amount": 200000,
            "final_amount": 200000,
            "delivery_type": "delivery",
            "delivery_address": "حلب، شارع الجامعة",
            "notes": "طلب اختبار - حالة: مكتمل"
        },
        {
            "customer_name": "ليلى أحمد",
            "customer_phone": "0996789012",
            "customer_whatsapp": "0996789012",
            "shop_name": "مكتبة المعرفة",
            "items": [
                {
                    "service_name": "تصميم بروشور",
                    "quantity": 3,
                    "unit_price": 25000,
                    "total_price": 75000,
                    "specifications": {
                        "colors": ["أخضر", "أبيض"],
                        "work_type": "تصميم وطباعة"
                    }
                }
            ],
            "total_amount": 75000,
            "final_amount": 75000,
            "delivery_type": "self",
            "notes": "طلب اختبار - حالة: ملغى"
        },
        {
            "customer_name": "عمر إبراهيم",
            "customer_phone": "0997890123",
            "customer_whatsapp": "0997890123",
            "items": [
                {
                    "service_name": "طباعة ملصقات",
                    "quantity": 1000,
                    "unit_price": 50,
                    "total_price": 50000,
                    "specifications": {
                        "work_type": "طباعة"
                    }
                }
            ],
            "total_amount": 50000,
            "final_amount": 50000,
            "delivery_type": "delivery",
            "delivery_address": "حمص، شارع الرئيسي",
            "notes": "طلب اختبار - حالة: مرفوض"
        }
    ]
    
    created_orders = []
    status_updates = [
        None,  # pending - keep as is
        ("preparing", None),  # preparing
        ("shipping", None),  # shipping
        ("awaiting_pickup", None),  # awaiting_pickup
        ("completed", None),  # completed
        ("cancelled", "طلب العميل إلغاء الطلب بسبب تغيير في المتطلبات"),  # cancelled with reason
        ("rejected", "الطلب غير متوافق مع المعايير المطلوبة")  # rejected with reason
    ]
    
    print(f"Creating {len(orders_data)} test orders...")
    print(f"API URL: {BASE_URL}\n")
    
    for i, order_data in enumerate(orders_data):
        max_retries = 3
        retry_delay = 2
        
        for attempt in range(max_retries):
            try:
                # Create order with retry logic
                response = requests.post(
                    f"{BASE_URL}/orders/",
                    json=order_data,
                    headers={"Content-Type": "application/json"},
                    timeout=30,
                    verify=False  # Disable SSL verification if needed
                )
                break  # Success, exit retry loop
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
                    # Try to get from nested structure
                    if "order" in order_result.get("order", {}):
                        order_id = order_result["order"]["id"]
                    else:
                        print(f"Warning: Could not extract order ID from response: {order_result}")
                        continue
                
                if not order_id:
                    print(f"[WARNING] Order {i+1}: Created but could not get ID")
                    continue
                
                print(f"[OK] Order {i+1} created with ID: {order_id}")
                created_orders.append(order_id)
                
                # Update status if needed
                status_update = status_updates[i]
                if status_update:
                    new_status, reason = status_update
                    update_data = {"status": new_status}
                    if reason:
                        if new_status == "cancelled":
                            update_data["cancellation_reason"] = reason
                        elif new_status == "rejected":
                            update_data["rejection_reason"] = reason
                    
                    update_response = requests.put(
                        f"{BASE_URL}/admin/orders/{order_id}/status",
                        json=update_data,
                        headers={"Content-Type": "application/json"},
                        timeout=30,
                        verify=False
                    )
                    
                    if update_response.status_code == 200:
                        print(f"  -> Status updated to: {new_status}")
                    else:
                        print(f"  [WARNING] Failed to update status: {update_response.status_code}")
                        print(f"  Response: {update_response.text[:100]}")
                else:
                    print(f"  -> Status: pending (default)")
            else:
                print(f"[FAILED] Failed to create order {i+1}: {response.status_code}")
                print(f"  Response: {response.text[:200]}")
        
        except Exception as e:
            print(f"[ERROR] Error creating order {i+1}: {str(e)}")
            import traceback
            traceback.print_exc()
    
    print(f"\n{'='*50}")
    print(f"[SUCCESS] Created {len(created_orders)} orders successfully")
    print(f"{'='*50}")
    
    return created_orders

if __name__ == "__main__":
    print("="*50)
    print("Creating Test Orders")
    print("="*50)
    create_test_orders()

