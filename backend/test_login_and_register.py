#!/usr/bin/env python3
"""
سكربت اختبار شامل لتسجيل الدخول وإنشاء حساب
"""
import requests
import json
import os
import sys
from typing import Dict, Any, Optional

# إعدادات الاتصال
BASE_URL = os.getenv("API_BASE_URL", "https://khawam-pro-production.up.railway.app/api")

def print_section(title: str):
    """طباعة عنوان قسم"""
    print("\n" + "=" * 70)
    print(f"  {title}")
    print("=" * 70)

def test_login(username: str, password: str) -> Optional[Dict[str, Any]]:
    """اختبار تسجيل الدخول"""
    try:
        print(f"\n🔐 محاولة تسجيل الدخول:")
        print(f"   المستخدم: {username}")
        print(f"   كلمة المرور: {'*' * len(password)}")
        
        response = requests.post(
            f"{BASE_URL}/auth/login",
            json={"username": username, "password": password},
            timeout=10
        )
        
        print(f"   الحالة: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            token = data.get("access_token")
            user = data.get("user", {})
            user_type = user.get("user_type", {})
            
            print(f"✅ تم تسجيل الدخول بنجاح!")
            print(f"   معرف المستخدم: {user.get('id')}")
            print(f"   الاسم: {user.get('name')}")
            print(f"   الهاتف: {user.get('phone')}")
            print(f"   البريد: {user.get('email')}")
            print(f"   النوع: {user_type.get('name_ar')}")
            print(f"   Token: {token[:50]}...")
            
            return {
                "success": True,
                "token": token,
                "user": user
            }
        else:
            error_detail = ""
            try:
                error_data = response.json()
                error_detail = error_data.get("detail", response.text)
            except:
                error_detail = response.text
            
            print(f"❌ فشل تسجيل الدخول")
            print(f"   الخطأ: {error_detail}")
            
            return {
                "success": False,
                "status_code": response.status_code,
                "error": error_detail
            }
    except Exception as e:
        print(f"❌ خطأ في تسجيل الدخول: {e}")
        import traceback
        traceback.print_exc()
        return None

def test_register(name: str, phone: str, email: Optional[str], password: str) -> Optional[Dict[str, Any]]:
    """اختبار إنشاء حساب جديد"""
    try:
        print(f"\n📝 محاولة إنشاء حساب جديد:")
        print(f"   الاسم: {name}")
        print(f"   الهاتف: {phone}")
        print(f"   البريد: {email or 'غير محدد'}")
        print(f"   كلمة المرور: {'*' * len(password)}")
        
        register_data = {
            "name": name,
            "phone": phone,
            "password": password
        }
        
        if email:
            register_data["email"] = email
        
        response = requests.post(
            f"{BASE_URL}/auth/register",
            json=register_data,
            timeout=10
        )
        
        print(f"   الحالة: {response.status_code}")
        
        if response.status_code == 200 or response.status_code == 201:
            data = response.json()
            user = data.get("user", {})
            user_type = user.get("user_type", {})
            
            print(f"✅ تم إنشاء الحساب بنجاح!")
            print(f"   معرف المستخدم: {user.get('id')}")
            print(f"   الاسم: {user.get('name')}")
            print(f"   الهاتف: {user.get('phone')}")
            print(f"   البريد: {user.get('email')}")
            print(f"   النوع: {user_type.get('name_ar')}")
            
            return {
                "success": True,
                "user": user
            }
        else:
            error_detail = ""
            try:
                error_data = response.json()
                error_detail = error_data.get("detail", response.text)
            except:
                error_detail = response.text
            
            print(f"❌ فشل إنشاء الحساب")
            print(f"   الخطأ: {error_detail}")
            
            return {
                "success": False,
                "status_code": response.status_code,
                "error": error_detail
            }
    except Exception as e:
        print(f"❌ خطأ في إنشاء الحساب: {e}")
        import traceback
        traceback.print_exc()
        return None

def test_get_orders(token: str) -> Optional[list]:
    """اختبار جلب الطلبات"""
    try:
        print(f"\n📦 محاولة جلب الطلبات...")
        
        headers = {
            "Authorization": f"Bearer {token}"
        }
        
        response = requests.get(
            f"{BASE_URL}/orders/",
            headers=headers,
            timeout=10
        )
        
        print(f"   الحالة: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            orders = data.get("orders", [])
            
            print(f"✅ تم جلب {len(orders)} طلب بنجاح")
            
            if orders:
                print(f"\n   أول 3 طلبات:")
                for i, order in enumerate(orders[:3], 1):
                    print(f"      {i}. رقم الطلب: {order.get('order_number')}, العميل: {order.get('customer_name')}, الهاتف: {order.get('customer_phone')}")
            
            return orders
        else:
            error_detail = ""
            try:
                error_data = response.json()
                error_detail = error_data.get("detail", response.text)
            except:
                error_detail = response.text
            
            print(f"❌ فشل جلب الطلبات")
            print(f"   الخطأ: {error_detail}")
            
            return None
    except Exception as e:
        print(f"❌ خطأ في جلب الطلبات: {e}")
        import traceback
        traceback.print_exc()
        return None

def main():
    """الدالة الرئيسية"""
    print_section("اختبار تسجيل الدخول وإنشاء الحساب")
    print(f"📍 قاعدة URL: {BASE_URL}")
    
    # اختبار 1: تسجيل الدخول بالحساب المحدد
    print_section("اختبار 1: تسجيل الدخول بـ 0966320114 / admin123")
    login_result = test_login("0966320114", "admin123")
    
    if login_result and login_result.get("success"):
        token = login_result.get("token")
        user = login_result.get("user")
        
        # اختبار جلب الطلبات
        print_section("اختبار جلب الطلبات بعد تسجيل الدخول")
        orders = test_get_orders(token)
        
        # اختبار تسجيل الدخول بأشكال مختلفة من رقم الهاتف
        print_section("اختبار تسجيل الدخول بأشكال مختلفة من رقم الهاتف")
        phone_variants = [
            "0966320114",
            "963966320114",
            "+963966320114",
            "966320114"
        ]
        
        for phone in phone_variants:
            print(f"\n   جرب: {phone}")
            test_login(phone, "admin123")
    else:
        print("\n⚠️ فشل تسجيل الدخول بالحساب المحدد")
        print("   قد تحتاج إلى:")
        print("   1. التحقق من وجود المستخدم في قاعدة البيانات")
        print("   2. التحقق من كلمة المرور")
        print("   3. إعادة تعيين كلمة المرور إذا لزم الأمر")
    
    # اختبار 2: إنشاء حساب جديد
    print_section("اختبار 2: إنشاء حساب جديد")
    import random
    test_phone = f"09{random.randint(10000000, 99999999)}"
    test_email = f"test_{random.randint(1000, 9999)}@example.com"
    
    register_result = test_register(
        name="اختبار العميل",
        phone=test_phone,
        email=test_email,
        password="test123456"
    )
    
    if register_result and register_result.get("success"):
        # محاولة تسجيل الدخول بالحساب الجديد
        print_section("اختبار تسجيل الدخول بالحساب الجديد")
        new_user = register_result.get("user")
        new_phone = new_user.get("phone")
        
        login_result_new = test_login(new_phone, "test123456")
        
        if login_result_new and login_result_new.get("success"):
            print("\n✅ تم تسجيل الدخول بالحساب الجديد بنجاح!")
        else:
            print("\n❌ فشل تسجيل الدخول بالحساب الجديد")
    
    # اختبار 3: تسجيل الدخول بكلمة مرور خاطئة
    print_section("اختبار 3: تسجيل الدخول بكلمة مرور خاطئة")
    test_login("0966320114", "wrong_password")
    
    # اختبار 4: تسجيل الدخول برقم هاتف غير موجود
    print_section("اختبار 4: تسجيل الدخول برقم هاتف غير موجود")
    test_login("0000000000", "admin123")
    
    print_section("انتهت الاختبارات")
    print("\n📋 ملخص:")
    print("   1. تأكد من أن المستخدم موجود في قاعدة البيانات")
    print("   2. تأكد من أن كلمة المرور صحيحة")
    print("   3. تأكد من أن رقم الهاتف مطابق في قاعدة البيانات")
    print("   4. تأكد من أن المستخدم نشط (is_active = true)")

if __name__ == "__main__":
    main()

