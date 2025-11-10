#!/usr/bin/env python3
"""
سكربت اختبار شامل لتسجيل الدخول وإنشاء طلب وعرض الملفات
"""
import requests
import json
import os
from typing import Dict, Any, Optional

# إعدادات الاتصال
BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8000/api")
# أو استخدم URL الإنتاج:
# BASE_URL = "https://khawam-pro-production.up.railway.app/api"

class TestClient:
    def __init__(self, base_url: str):
        self.base_url = base_url
        self.token: Optional[str] = None
        self.user_data: Optional[Dict[str, Any]] = None
    
    def login(self, username: str, password: str) -> bool:
        """تسجيل الدخول"""
        try:
            print(f"\n🔐 محاولة تسجيل الدخول بـ: {username}")
            response = requests.post(
                f"{self.base_url}/auth/login",
                json={"username": username, "password": password},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                self.token = data.get("access_token")
                self.user_data = data.get("user")
                print(f"✅ تم تسجيل الدخول بنجاح!")
                print(f"   المستخدم: {self.user_data.get('name')}")
                print(f"   النوع: {self.user_data.get('user_type', {}).get('name_ar')}")
                print(f"   الهاتف: {self.user_data.get('phone')}")
                return True
            else:
                print(f"❌ فشل تسجيل الدخول: {response.status_code}")
                print(f"   التفاصيل: {response.text}")
                return False
        except Exception as e:
            print(f"❌ خطأ في تسجيل الدخول: {e}")
            return False
    
    def get_orders(self) -> Optional[list]:
        """جلب الطلبات"""
        try:
            print(f"\n📦 جلب الطلبات...")
            headers = {}
            if self.token:
                headers["Authorization"] = f"Bearer {self.token}"
            
            response = requests.get(
                f"{self.base_url}/orders/",
                headers=headers,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                orders = data.get("orders", [])
                print(f"✅ تم جلب {len(orders)} طلب بنجاح")
                return orders
            else:
                print(f"❌ فشل جلب الطلبات: {response.status_code}")
                print(f"   التفاصيل: {response.text}")
                return None
        except Exception as e:
            print(f"❌ خطأ في جلب الطلبات: {e}")
            return None
    
    def create_order(self, order_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """إنشاء طلب جديد"""
        try:
            print(f"\n🛒 إنشاء طلب جديد...")
            headers = {"Content-Type": "application/json"}
            if self.token:
                headers["Authorization"] = f"Bearer {self.token}"
            
            response = requests.post(
                f"{self.base_url}/orders/",
                json=order_data,
                headers=headers,
                timeout=30
            )
            
            if response.status_code == 200 or response.status_code == 201:
                data = response.json()
                order = data.get("order", {})
                print(f"✅ تم إنشاء الطلب بنجاح!")
                print(f"   رقم الطلب: {order.get('order_number')}")
                print(f"   الحالة: {order.get('status')}")
                return order
            else:
                print(f"❌ فشل إنشاء الطلب: {response.status_code}")
                print(f"   التفاصيل: {response.text}")
                return None
        except Exception as e:
            print(f"❌ خطأ في إنشاء الطلب: {e}")
            import traceback
            traceback.print_exc()
            return None
    
    def get_order_attachments(self, order_id: int) -> Optional[list]:
        """جلب مرفقات الطلب"""
        try:
            print(f"\n📎 جلب مرفقات الطلب {order_id}...")
            headers = {}
            if self.token:
                headers["Authorization"] = f"Bearer {self.token}"
            
            response = requests.get(
                f"{self.base_url}/orders/{order_id}/attachments",
                headers=headers,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                attachments = data.get("attachments", [])
                print(f"✅ تم جلب {len(attachments)} مرفق بنجاح")
                return attachments
            else:
                print(f"❌ فشل جلب المرفقات: {response.status_code}")
                print(f"   التفاصيل: {response.text}")
                return None
        except Exception as e:
            print(f"❌ خطأ في جلب المرفقات: {e}")
            return None

def test_login_scenarios():
    """اختبار سيناريوهات تسجيل الدخول المختلفة"""
    print("=" * 60)
    print("اختبار سيناريوهات تسجيل الدخول")
    print("=" * 60)
    
    client = TestClient(BASE_URL)
    
    # اختبار 1: تسجيل الدخول برقم الهاتف
    print("\n📱 اختبار 1: تسجيل الدخول برقم الهاتف")
    client.login("0966320114", "admin123")
    
    # اختبار 2: تسجيل الدخول بالاسم (إذا كان مسموحاً)
    print("\n👤 اختبار 2: تسجيل الدخول بالاسم")
    if client.user_data:
        user_name = client.user_data.get("name")
        if user_name:
            client2 = TestClient(BASE_URL)
            client2.login(user_name, "admin123")
    
    # اختبار 3: تسجيل الدخول برقم هاتف غير صحيح
    print("\n❌ اختبار 3: تسجيل الدخول برقم هاتف غير صحيح")
    client3 = TestClient(BASE_URL)
    client3.login("0000000000", "wrong_password")

def test_orders_filtering():
    """اختبار فلترة الطلبات حسب المستخدم"""
    print("\n" + "=" * 60)
    print("اختبار فلترة الطلبات")
    print("=" * 60)
    
    # تسجيل الدخول كعميل
    client = TestClient(BASE_URL)
    if client.login("0966320114", "admin123"):
        orders = client.get_orders()
        if orders:
            print(f"\n📋 تفاصيل الطلبات:")
            for i, order in enumerate(orders[:5], 1):  # عرض أول 5 طلبات فقط
                print(f"\n   طلب {i}:")
                print(f"      رقم الطلب: {order.get('order_number')}")
                print(f"      اسم العميل: {order.get('customer_name')}")
                print(f"      هاتف العميل: {order.get('customer_phone')}")
                print(f"      الحالة: {order.get('status')}")
                print(f"      عدد العناصر: {len(order.get('items', []))}")
                
                # عرض المرفقات
                order_id = order.get('id')
                if order_id:
                    attachments = client.get_order_attachments(order_id)
                    if attachments:
                        print(f"      المرفقات: {len(attachments)} ملف")
                        for att in attachments[:3]:  # عرض أول 3 مرفقات
                            print(f"         - {att.get('filename', 'غير معروف')}")

def test_create_order_with_files():
    """اختبار إنشاء طلب مع ملفات"""
    print("\n" + "=" * 60)
    print("اختبار إنشاء طلب مع ملفات")
    print("=" * 60)
    
    client = TestClient(BASE_URL)
    if client.login("0966320114", "admin123"):
        # إنشاء طلب بسيط
        order_data = {
            "customer_name": "اختبار العميل",
            "customer_phone": "0966320114",
            "customer_whatsapp": "0966320114",
            "items": [
                {
                    "service_name": "طباعة البوسترات",
                    "quantity": 1,
                    "unit_price": 1000.0,
                    "total_price": 1000.0,
                    "specifications": {
                        "paper_size": "A4",
                        "print_color": "ملون"
                    },
                    "design_files": [
                        # ملف تجريبي كـ base64 (صورة صغيرة)
                        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
                    ]
                }
            ],
            "total_amount": 1000.0,
            "final_amount": 1000.0,
            "delivery_type": "self",
            "notes": "طلب اختبار من السكربت"
        }
        
        order = client.create_order(order_data)
        if order:
            order_id = order.get("id")
            if order_id:
                # جلب المرفقات
                attachments = client.get_order_attachments(order_id)
                if attachments:
                    print(f"\n✅ تم رفع {len(attachments)} مرفق بنجاح")

def main():
    """الدالة الرئيسية"""
    print("🚀 بدء الاختبارات الشاملة")
    print(f"📍 قاعدة URL: {BASE_URL}")
    
    # اختبار 1: تسجيل الدخول
    test_login_scenarios()
    
    # اختبار 2: فلترة الطلبات
    test_orders_filtering()
    
    # اختبار 3: إنشاء طلب مع ملفات
    # test_create_order_with_files()  # يمكن تفعيله إذا أردت
    
    print("\n" + "=" * 60)
    print("✅ انتهت الاختبارات")
    print("=" * 60)

if __name__ == "__main__":
    main()

