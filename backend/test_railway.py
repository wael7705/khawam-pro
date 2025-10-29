"""
سكريبت اختبار لإضافة منتج وخدمة وعمل - يعمل على Railway
استخدام: railway run python backend/test_railway.py
"""
from database import SessionLocal, engine
from models import Product, Service, PortfolioWork, ProductCategory
from sqlalchemy.exc import IntegrityError
import sys
import os

def test_add_items():
    """إضافة منتج وخدمة وعمل للاختبار"""
    print("\n" + "=" * 60)
    print("🧪 اختبار إضافة منتج وخدمة وعمل")
    print("=" * 60)
    
    # التحقق من DATABASE_URL
    db_url = os.getenv("DATABASE_URL", "")
    if not db_url:
        print("❌ خطأ: DATABASE_URL غير موجود!")
        return False
    
    # طباعة معلومات الاتصال (مخفية)
    if "@" in db_url:
        safe_url = db_url.split("@")[1] if "@" in db_url else db_url
        print(f"📊 الاتصال بقاعدة البيانات: ...@{safe_url[:40]}")
    
    db = SessionLocal()
    
    try:
        # التحقق من الاتصال
        from sqlalchemy import text
        db.execute(text("SELECT 1"))
        print("✅ الاتصال بقاعدة البيانات ناجح")
        
        # 1. إضافة فئة منتج
        category = db.query(ProductCategory).filter(ProductCategory.name_ar == "تصميم الجرافيكي").first()
        if not category:
            category = ProductCategory(
                name_ar="تصميم الجرافيكي",
                name_en="Graphic Design",
                description_ar="تصميمات جرافيكية احترافية"
            )
            db.add(category)
            db.commit()
            db.refresh(category)
            print(f"✅ تم إضافة فئة المنتج (ID: {category.id})")
        else:
            print(f"✅ فئة المنتج موجودة (ID: {category.id})")
        
        # 2. إضافة منتج
        product_name = "منتج اختبار"
        existing_product = db.query(Product).filter(Product.name_ar == product_name).first()
        if not existing_product:
            test_product = Product(
                name_ar=product_name,
                name="Test Product",
                description_ar="هذا منتج للاختبار",
                category_id=category.id,
                price=99.99,
                base_price=79.99,
                is_visible=True,
                is_featured=True,
                display_order=0
            )
            db.add(test_product)
            db.commit()
            db.refresh(test_product)
            print(f"✅ تم إضافة المنتج (ID: {test_product.id})")
        else:
            print(f"✅ المنتج موجود (ID: {existing_product.id})")
        
        # 3. إضافة خدمة
        service_name = "خدمة اختبار"
        existing_service = db.query(Service).filter(Service.name_ar == service_name).first()
        if not existing_service:
            test_service = Service(
                name_ar=service_name,
                name_en="Test Service",
                description_ar="هذه خدمة للاختبار",
                icon="🎨",
                base_price=150.00,
                is_visible=True,
                is_active=True,
                display_order=0
            )
            db.add(test_service)
            db.commit()
            db.refresh(test_service)
            print(f"✅ تم إضافة الخدمة (ID: {test_service.id})")
        else:
            print(f"✅ الخدمة موجودة (ID: {existing_service.id})")
        
        # 4. إضافة عمل
        work_title = "عمل اختبار"
        existing_work = db.query(PortfolioWork).filter(PortfolioWork.title_ar == work_title).first()
        if not existing_work:
            test_work = PortfolioWork(
                title_ar=work_title,
                title_en="Test Work",
                description_ar="هذا عمل للاختبار",
                category_ar="تصميم",
                category_en="Design",
                image_url="https://via.placeholder.com/400x300",
                is_featured=True,
                is_active=True,
                is_visible=True,
                display_order=0
            )
            db.add(test_work)
            db.commit()
            db.refresh(test_work)
            print(f"✅ تم إضافة العمل (ID: {test_work.id})")
        else:
            print(f"✅ العمل موجود (ID: {existing_work.id})")
        
        # 5. الإحصائيات
        products_count = db.query(Product).count()
        services_count = db.query(Service).count()
        works_count = db.query(PortfolioWork).count()
        
        print("\n" + "=" * 60)
        print("📊 الإحصائيات النهائية:")
        print(f"   ✅ المنتجات: {products_count}")
        print(f"   ✅ الخدمات: {services_count}")
        print(f"   ✅ الأعمال: {works_count}")
        print("=" * 60)
        
        print("\n✅ نجح الاختبار! جميع العناصر تمت إضافتها بنجاح.")
        return True
        
    except IntegrityError as e:
        db.rollback()
        print(f"\n❌ خطأ في قاعدة البيانات: {str(e)}")
        return False
    except Exception as e:
        db.rollback()
        print(f"\n❌ خطأ: {str(e)}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()

if __name__ == "__main__":
    success = test_add_items()
    sys.exit(0 if success else 1)

