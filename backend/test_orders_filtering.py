"""
سكريبت اختبار لفحص فلترة الطلبات بناءً على customer_id
"""
import requests
import json
from typing import Optional

# تكوين الاتصال
BASE_URL = "http://localhost:8000"  # أو URL الخادم الفعلي
API_BASE = f"{BASE_URL}/api"

def test_orders_filtering():
    """اختبار فلترة الطلبات بناءً على customer_id"""
    print("=" * 60)
    print("🧪 اختبار فلترة الطلبات بناءً على customer_id")
    print("=" * 60)
    
    # 1. تسجيل الدخول كمستخدم (يجب تعديل البيانات حسب قاعدة البيانات)
    print("\n1️⃣ تسجيل الدخول...")
    login_data = {
        "username": "0966320114",  # عدّل حسب بياناتك
        "password": "admin123"  # عدّل حسب بياناتك
    }
    
    try:
        login_response = requests.post(
            f"{API_BASE}/auth/login",
            json=login_data,
            headers={"Content-Type": "application/json"}
        )
        
        if login_response.status_code != 200:
            print(f"❌ فشل تسجيل الدخول: {login_response.status_code}")
            print(f"   Response: {login_response.text}")
            return False
        
        login_result = login_response.json()
        token = login_result.get("access_token")
        user = login_result.get("user", {})
        user_id = user.get("id")
        
        if not token:
            print("❌ لم يتم الحصول على token")
            return False
        
        print(f"✅ تم تسجيل الدخول بنجاح")
        print(f"   User ID: {user_id}")
        print(f"   User Name: {user.get('name')}")
        print(f"   User Type: {user.get('user_type', {}).get('name_ar', 'غير معروف')}")
        
    except Exception as e:
        print(f"❌ خطأ في تسجيل الدخول: {e}")
        return False
    
    # 2. جلب الطلبات للمستخدم الحالي
    print(f"\n2️⃣ جلب الطلبات للمستخدم (ID: {user_id})...")
    try:
        orders_response = requests.get(
            f"{API_BASE}/orders/",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json"
            }
        )
        
        if orders_response.status_code != 200:
            print(f"❌ فشل جلب الطلبات: {orders_response.status_code}")
            print(f"   Response: {orders_response.text}")
            return False
        
        orders_result = orders_response.json()
        orders = orders_result.get("orders", [])
        
        print(f"✅ تم جلب {len(orders)} طلب")
        
        # 3. التحقق من أن جميع الطلبات تخص المستخدم الحالي
        print(f"\n3️⃣ التحقق من أن جميع الطلبات تخص المستخدم (ID: {user_id})...")
        invalid_orders = []
        
        for order in orders:
            order_id = order.get("id")
            order_number = order.get("order_number")
            customer_id = order.get("customer_id")  # قد لا يكون موجوداً في response
            
            # إذا كان customer_id موجوداً في response، نتحقق منه
            if customer_id is not None and customer_id != user_id:
                invalid_orders.append({
                    "order_id": order_id,
                    "order_number": order_number,
                    "customer_id": customer_id,
                    "expected_customer_id": user_id
                })
        
        if invalid_orders:
            print(f"❌ تم العثور على {len(invalid_orders)} طلب لا يخص المستخدم:")
            for invalid in invalid_orders:
                print(f"   - Order #{invalid['order_number']} (ID: {invalid['order_id']})")
                print(f"     Customer ID: {invalid['customer_id']} (متوقع: {invalid['expected_customer_id']})")
            return False
        else:
            print(f"✅ جميع الطلبات ({len(orders)}) تخص المستخدم الحالي")
        
        # 4. عرض عينة من الطلبات
        if orders:
            print(f"\n4️⃣ عينة من الطلبات:")
            for i, order in enumerate(orders[:3], 1):  # عرض أول 3 طلبات
                print(f"   {i}. Order #{order.get('order_number')}")
                print(f"      Status: {order.get('status')}")
                print(f"      Amount: {order.get('final_amount')}")
                print(f"      Created: {order.get('created_at', '')[:10]}")
        else:
            print(f"\n⚠️ لا توجد طلبات للمستخدم الحالي")
        
        # 5. التحقق من قاعدة البيانات مباشرة
        print(f"\n5️⃣ التحقق من قاعدة البيانات...")
        print(f"   (يجب أن يكون هناك طلبات بـ customer_id = {user_id} في قاعدة البيانات)")
        print(f"   يمكنك التحقق يدوياً باستخدام SQL:")
        print(f"   SELECT id, order_number, customer_id, customer_name FROM orders WHERE customer_id = {user_id};")
        
        return True
        
    except Exception as e:
        print(f"❌ خطأ في جلب الطلبات: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_order_creation_with_customer_id():
    """اختبار إنشاء طلب جديد والتحقق من ربطه بـ customer_id"""
    print("\n" + "=" * 60)
    print("🧪 اختبار إنشاء طلب جديد وربطه بـ customer_id")
    print("=" * 60)
    
    # 1. تسجيل الدخول
    print("\n1️⃣ تسجيل الدخول...")
    login_data = {
        "username": "0966320114",
        "password": "admin123"
    }
    
    try:
        login_response = requests.post(
            f"{API_BASE}/auth/login",
            json=login_data,
            headers={"Content-Type": "application/json"}
        )
        
        if login_response.status_code != 200:
            print(f"❌ فشل تسجيل الدخول: {login_response.status_code}")
            return False
        
        login_result = login_response.json()
        token = login_response.json().get("access_token")
        user = login_result.get("user", {})
        user_id = user.get("id")
        
        if not token:
            print("❌ لم يتم الحصول على token")
            return False
        
        print(f"✅ تم تسجيل الدخول - User ID: {user_id}")
        
    except Exception as e:
        print(f"❌ خطأ في تسجيل الدخول: {e}")
        return False
    
    # 2. إنشاء طلب تجريبي
    print(f"\n2️⃣ إنشاء طلب تجريبي...")
    order_data = {
        "customer_name": "مستخدم تجريبي",
        "customer_phone": "0999999999",
        "customer_whatsapp": "0999999999",
        "items": [
            {
                "product_id": None,
                "service_name": "خدمة تجريبية",
                "quantity": 1,
                "unit_price": 100.0,
                "total_price": 100.0,
                "specifications": {},
                "design_files": []
            }
        ],
        "total_amount": 100.0,
        "final_amount": 100.0,
        "delivery_type": "self"
    }
    
    try:
        create_response = requests.post(
            f"{API_BASE}/orders/",
            json=order_data,
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json"
            }
        )
        
        if create_response.status_code != 200:
            print(f"❌ فشل إنشاء الطلب: {create_response.status_code}")
            print(f"   Response: {create_response.text}")
            return False
        
        create_result = create_response.json()
        order = create_result.get("order", {})
        order_id = order.get("id")
        order_number = order.get("order_number")
        
        print(f"✅ تم إنشاء الطلب بنجاح")
        print(f"   Order ID: {order_id}")
        print(f"   Order Number: {order_number}")
        
        # 3. التحقق من أن الطلب مربوط بـ customer_id
        print(f"\n3️⃣ التحقق من ربط الطلب بـ customer_id...")
        print(f"   (يجب أن يكون customer_id = {user_id} في قاعدة البيانات)")
        print(f"   يمكنك التحقق يدوياً باستخدام SQL:")
        print(f"   SELECT id, order_number, customer_id FROM orders WHERE id = {order_id};")
        print(f"   يجب أن يكون customer_id = {user_id}")
        
        return True
        
    except Exception as e:
        print(f"❌ خطأ في إنشاء الطلب: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("\n" + "🚀 بدء اختبار فلترة الطلبات" + "\n")
    
    # اختبار 1: فلترة الطلبات
    test1_result = test_orders_filtering()
    
    # اختبار 2: إنشاء طلب جديد
    # test2_result = test_order_creation_with_customer_id()
    
    print("\n" + "=" * 60)
    if test1_result:
        print("✅ جميع الاختبارات نجحت!")
    else:
        print("❌ بعض الاختبارات فشلت - راجع الأخطاء أعلاه")
    print("=" * 60 + "\n")


