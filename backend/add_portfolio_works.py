"""
إضافة أعمال تجريبية لقاعدة البيانات
"""
from database import SessionLocal
from models import PortfolioWork
from sqlalchemy import text

def add_portfolio_works():
    """إضافة أعمال تجريبية"""
    print("\n" + "=" * 60)
    print("🎨 إضافة أعمال تجريبية")
    print("=" * 60)
    
    db = SessionLocal()
    
    try:
        # التحقق من الاتصال
        db.execute(text("SELECT 1"))
        print("✅ الاتصال بقاعدة البيانات ناجح\n")
        
        # إضافة أعمال تجريبية
        works = [
            PortfolioWork(
                title_ar="تصميم هوية بصرية",
                title_en="Brand Identity Design",
                description_ar="تصميم هوية بصرية شاملة لشركة تقنية ناشئة",
                description_en="Complete brand identity design for a tech startup",
                category_ar="هوية بصرية",
                category_en="Brand Identity",
                image_url="https://via.placeholder.com/400x300",
                is_featured=True,
                is_active=True,
                is_visible=True,
                display_order=1
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
                is_visible=True,
                display_order=2
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
                is_visible=True,
                display_order=3
            ),
            PortfolioWork(
                title_ar="تصميم شعار احترافي",
                title_en="Professional Logo Design",
                description_ar="تصميم شعار احترافي مع 3 عروض مختلفة",
                description_en="Professional logo design with 3 different concepts",
                category_ar="تصميم جرافيكي",
                category_en="Graphic Design",
                image_url="https://via.placeholder.com/400x300",
                is_featured=False,
                is_active=True,
                is_visible=True,
                display_order=4
            ),
            PortfolioWork(
                title_ar="طباعة بانرات إعلانية",
                title_en="Advertising Banner Printing",
                description_ar="طباعة بانرات إعلانية عالية الجودة",
                description_en="High-quality advertising banner printing",
                category_ar="طباعة",
                category_en="Printing",
                image_url="https://via.placeholder.com/400x300",
                is_featured=False,
                is_active=True,
                is_visible=True,
                display_order=5
            ),
        ]
        
        added_count = 0
        for work in works:
            # التحقق من عدم وجود عمل بنفس العنوان
            existing = db.query(PortfolioWork).filter(
                PortfolioWork.title_ar == work.title_ar
            ).first()
            
            if not existing:
                db.add(work)
                added_count += 1
                print(f"✅ سيتم إضافة: {work.title_ar}")
            else:
                print(f"⏭️ موجود بالفعل: {work.title_ar}")
        
        db.commit()
        
        # التحقق من النتيجة
        total_works = db.query(PortfolioWork).count()
        visible_works = db.query(PortfolioWork).filter(
            PortfolioWork.is_visible == True
        ).count()
        featured_works = db.query(PortfolioWork).filter(
            PortfolioWork.is_featured == True
        ).count()
        
        print("\n" + "=" * 60)
        print("📊 الإحصائيات:")
        print(f"   إجمالي الأعمال: {total_works}")
        print(f"   الأعمال الظاهرة: {visible_works}")
        print(f"   الأعمال المميزة: {featured_works}")
        print(f"   الأعمال الجديدة المضافة: {added_count}")
        print("=" * 60)
        
        print("\n✅ تم إضافة الأعمال بنجاح!")
        return True
        
    except Exception as e:
        db.rollback()
        print(f"\n❌ خطأ: {str(e)}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()

if __name__ == "__main__":
    import sys
    success = add_portfolio_works()
    sys.exit(0 if success else 1)

