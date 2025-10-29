"""
سكريبت اختبار لإضافة منتج وخدمة وعمل
"""
from database import SessionLocal, engine, Base
from models import Product, Service, PortfolioWork, ProductCategory
from sqlalchemy.exc import IntegrityError
import sys

def test_add_items():
    """إضافة منتج وخدمة وعمل للاختبار"""
    db = SessionLocal()
    
    try:
        print("=" * 50)
        print("🧪 اختبار إضافة منتج وخدمة وعمل")
        print("=" * 50)
        
        # 1. إضافة فئة منتج (إذا لم تكن موجودة)
        category = db.query(ProductCategory).filter(ProductCategory.name_ar == "تصميم الجرافيكي").first()
        if not category:
            category = ProductCategory(
                name_ar="تصميم الجرافيكي",
                name_en="Graphic Design",
                description_ar="تصميمات جرافيكية احترافية"
            )
            db.add(category)
            db.commit()
            print("✅ تم إضافة فئة المنتج")
        else:
            print("✅ فئة المنتج موجودة")
        
        # 2. إضافة منتج
        product_exists = db.query(Product).filter(Product.name_ar == "منتج اختبار").first()
        if not product_exists:
            test_product = Product(
                name_ar="منتج اختبار",
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
            print(f"✅ المنتج موجود (ID: {product_exists.id})")
        
        # 3. إضافة خدمة
        service_exists = db.query(Service).filter(Service.name_ar == "خدمة اختبار").first()
        if not service_exists:
            test_service = Service(
                name_ar="خدمة اختبار",
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
            print(f"✅ الخدمة موجودة (ID: {service_exists.id})")
        
        # 4. إضافة عمل
        work_exists = db.query(PortfolioWork).filter(PortfolioWork.title_ar == "عمل اختبار").first()
        if not work_exists:
            test_work = PortfolioWork(
                title_ar="عمل اختبار",
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
            print(f"✅ العمل موجود (ID: {work_exists.id})")
        
        # 5. التحقق من البيانات
        products_count = db.query(Product).count()
        services_count = db.query(Service).count()
        works_count = db.query(PortfolioWork).count()
        
        print("\n" + "=" * 50)
        print("📊 الإحصائيات:")
        print(f"   المنتجات: {products_count}")
        print(f"   الخدمات: {services_count}")
        print(f"   الأعمال: {works_count}")
        print("=" * 50)
        
        print("\n✅ نجح الاختبار! جميع العناصر تمت إضافتها بنجاح.")
        return True
        
    except IntegrityError as e:
        db.rollback()
        print(f"❌ خطأ في قاعدة البيانات: {str(e)}")
        return False
    except Exception as e:
        db.rollback()
        print(f"❌ خطأ: {str(e)}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()

if __name__ == "__main__":
    success = test_add_items()
    sys.exit(0 if success else 1)

