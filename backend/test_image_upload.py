"""
اختبار رفع الصور للمنتجات والأعمال
"""
import requests
import os
from pathlib import Path

BASE_URL = os.getenv("API_URL", "https://khawam-pro-production.up.railway.app")

def test_image_upload():
    """اختبار رفع الصور"""
    print("\n" + "=" * 60)
    print("🧪 اختبار رفع الصور")
    print("=" * 60)
    
    # إنشاء صورة تجريبية
    test_image_path = "test_image.png"
    
    # إذا لم تكن موجودة، أنشئ واحدة بسيطة
    if not os.path.exists(test_image_path):
        print("⚠️ إنشاء صورة تجريبية...")
        # صورة بسيطة 100x100 بكسل PNG
        from PIL import Image
        img = Image.new('RGB', (100, 100), color='red')
        img.save(test_image_path, 'PNG')
        print(f"✅ تم إنشاء {test_image_path}")
    
    try:
        # اختبار 1: رفع صورة عامة
        print("\n📤 اختبار 1: رفع صورة عامة")
        with open(test_image_path, 'rb') as f:
            files = {'file': ('test_image.png', f, 'image/png')}
            response = requests.post(
                f"{BASE_URL}/api/admin/upload",
                files=files,
                timeout=30
            )
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ نجح رفع الصورة!")
            print(f"   URL: {data.get('url', 'N/A')}")
            image_url = data.get('url', '')
        else:
            print(f"❌ فشل رفع الصورة: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
        
        # اختبار 2: إضافة منتج مع صورة
        print("\n📦 اختبار 2: إضافة منتج مع صورة")
        product_data = {
            "name_ar": "منتج مع صورة",
            "name": "Product with Image",
            "price": 150.00,
            "image_url": image_url if image_url else "",
            "category_id": 1,
            "is_visible": True,
            "is_featured": True
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/products",
            json=product_data,
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        
        if response.status_code == 200:
            print("✅ تم إضافة منتج مع صورة بنجاح!")
            product = response.json().get('product', {})
            print(f"   Product ID: {product.get('id', 'N/A')}")
        else:
            print(f"❌ فشل إضافة المنتج: {response.status_code}")
            print(f"   Response: {response.text}")
        
        # اختبار 3: إضافة عمل مع صورة
        print("\n🎨 اختبار 3: إضافة عمل مع صورة")
        work_data = {
            "title_ar": "عمل مع صورة",
            "title_en": "Work with Image",
            "description_ar": "هذا عمل اختبار مع صورة",
            "image_url": image_url if image_url else "",
            "category_ar": "تصميم",
            "category_en": "Design",
            "is_featured": True,
            "is_visible": True
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/works",
            json=work_data,
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        
        if response.status_code == 200:
            print("✅ تم إضافة عمل مع صورة بنجاح!")
            work = response.json().get('work', {})
            print(f"   Work ID: {work.get('id', 'N/A')}")
        else:
            print(f"❌ فشل إضافة العمل: {response.status_code}")
            print(f"   Response: {response.text}")
        
        print("\n" + "=" * 60)
        print("✅ اكتمل اختبار رفع الصور!")
        print("=" * 60)
        return True
        
    except Exception as e:
        print(f"\n❌ خطأ: {str(e)}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        # تنظيف
        if os.path.exists(test_image_path):
            try:
                os.remove(test_image_path)
            except:
                pass

if __name__ == "__main__":
    try:
        from PIL import Image
    except ImportError:
        print("⚠️ PIL غير مثبت. لتثبيته: pip install Pillow")
        print("   سيتم تخطي إنشاء صورة تجريبية")
    
    success = test_image_upload()

