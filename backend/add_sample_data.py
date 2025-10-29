"""
إضافة بيانات تجريبية لقاعدة البيانات
"""
from database import SessionLocal, engine
from models import *
from sqlalchemy.orm import Session
import os

def add_sample_data():
    """إضافة بيانات تجريبية"""
    db = SessionLocal()
    
    try:
        # إضافة فئات المنتجات
        categories = [
            ProductCategory(name_ar="تصميم الجرافيكي", name_en="Graphic Design", description_ar="تصميمات جرافيكية احترافية"),
            ProductCategory(name_ar="ملصقات", name_en="Posters", description_ar="تصميم وطباعة الملصقات"),
            ProductCategory(name_ar="الكروت الشخصية", name_en="Business Cards", description_ar="تصميم وطباعة الكروت الشخصية"),
        ]
        
        for category in categories:
            existing = db.query(ProductCategory).filter(ProductCategory.name_ar == category.name_ar).first()
            if not existing:
                db.add(category)
        
        db.commit()
        
        # إضافة منتجات تجريبية
        products = [
            Product(
                name_ar="تصميم شعار احترافي",
                name_en="Professional Logo Design",
                description_ar="تصميم شعار احترافي مع 3 عروض مختلفة",
                description_en="Professional logo design with 3 different concepts",
                category_id=1,
                price=150.00,
                base_price=100.00,
                is_featured=True,
                is_active=True,
                is_visible=True
            ),
            Product(
                name_ar="ملصق دعائي",
                name_en="Promotional Poster",
                description_ar="تصميم وطباعة ملصق دعائي عالي الجودة",
                description_en="High-quality promotional poster design and printing",
                category_id=2,
                price=80.00,
                base_price=60.00,
                is_featured=True,
                is_active=True,
                is_visible=True
            ),
            Product(
                name_ar="كروت شخصية فاخرة",
                name_en="Premium Business Cards",
                description_ar="كروت شخصية فاخرة مع طباعة متميزة",
                description_en="Premium business cards with special printing",
                category_id=3,
                price=120.00,
                base_price=90.00,
                is_featured=True,
                is_active=True,
                is_visible=True
            ),
        ]
        
        for product in products:
            existing = db.query(Product).filter(Product.name_ar == product.name_ar).first()
            if not existing:
                db.add(product)
        
        db.commit()
        
        # إضافة خدمات تجريبية
        services = [
            Service(
                name_ar="تصميم الجرافيكي",
                name_en="Graphic Design",
                description_ar="خدمات التصميم الجرافيكي الاحترافية",
                description_en="Professional graphic design services",
                icon="design",
                base_price=100.00,
                is_active=True,
                is_visible=True,
                display_order=1
            ),
            Service(
                name_ar="طباعة فاخرة",
                name_en="Premium Printing",
                description_ar="خدمات الطباعة الفاخرة عالية الجودة",
                description_en="High-quality premium printing services",
                icon="print",
                base_price=50.00,
                is_active=True,
                is_visible=True,
                display_order=2
            ),
            Service(
                name_ar="استشارات التصميم",
                name_en="Design Consultation",
                description_ar="استشارات احترافية في التصميم والهوية البصرية",
                description_en="Professional design and branding consultation",
                icon="consultation",
                base_price=75.00,
                is_active=True,
                is_visible=True,
                display_order=3
            ),
        ]
        
        for service in services:
            existing = db.query(Service).filter(Service.name_ar == service.name_ar).first()
            if not existing:
                db.add(service)
        
        db.commit()
        
        # إضافة أعمال تجريبية
        works = [
            PortfolioWork(
                title_ar="تصميم هوية بصرية لشركة تقنية",
                title_en="Tech Company Brand Identity",
                description_ar="تصميم هوية بصرية شاملة لشركة تقنية ناشئة",
                description_en="Complete brand identity design for a tech startup",
                category_ar="هوية بصرية",
                category_en="Brand Identity",
                image_url="https://via.placeholder.com/400x300",
                is_featured=True,
                is_active=True,
                is_visible=True
            ),
            PortfolioWork(
                title_ar="تصميم موقع إلكتروني",
                title_en="Website Design",
                description_ar="تصميم موقع إلكتروني متجاوب وحديث",
                description_en="Modern responsive website design",
                category_ar="تصميم مواقع",
                category_en="Web Design",
                image_url="https://via.placeholder.com/400x300",
                is_featured=True,
                is_active=True,
                is_visible=True
            ),
            PortfolioWork(
                title_ar="تصميم مواد تسويقية",
                title_en="Marketing Materials",
                description_ar="تصميم مواد تسويقية متنوعة للشركات",
                description_en="Various marketing materials design for companies",
                category_ar="مواد تسويقية",
                category_en="Marketing Materials",
                image_url="https://via.placeholder.com/400x300",
                is_featured=True,
                is_active=True,
                is_visible=True
            ),
        ]
        
        for work in works:
            existing = db.query(PortfolioWork).filter(PortfolioWork.title_ar == work.title_ar).first()
            if not existing:
                db.add(work)
        
        db.commit()
        
        print("✅ تم إضافة البيانات التجريبية بنجاح!")
        print(f"📊 المنتجات: {db.query(Product).count()}")
        print(f"🔧 الخدمات: {db.query(Service).count()}")
        print(f"🎨 الأعمال: {db.query(PortfolioWork).count()}")
        
    except Exception as e:
        print(f"❌ خطأ في إضافة البيانات: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    add_sample_data()
