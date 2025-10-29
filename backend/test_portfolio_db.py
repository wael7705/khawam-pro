"""
اختبار استيراد الأعمال من قاعدة البيانات
"""
from database import SessionLocal
from models import PortfolioWork
from sqlalchemy import text

def test_portfolio_import():
    """اختبار استيراد الأعمال من قاعدة البيانات"""
    print("\n" + "=" * 60)
    print("🧪 اختبار استيراد الأعمال من قاعدة البيانات")
    print("=" * 60)
    
    db = SessionLocal()
    
    try:
        # 1. التحقق من الاتصال
        db.execute(text("SELECT 1"))
        print("✅ الاتصال بقاعدة البيانات ناجح\n")
        
        # 2. عد جميع الأعمال
        total_count = db.query(PortfolioWork).count()
        print(f"📊 العدد الإجمالي للأعمال في قاعدة البيانات: {total_count}")
        
        # 3. الأعمال الظاهرة
        visible_works = db.query(PortfolioWork).filter(
            PortfolioWork.is_visible == True
        ).count()
        print(f"👁️ الأعمال الظاهرة: {visible_works}")
        
        # 4. الأعمال النشطة
        active_works = db.query(PortfolioWork).filter(
            PortfolioWork.is_active == True
        ).count()
        print(f"✅ الأعمال النشطة: {active_works}")
        
        # 5. الأعمال المميزة
        featured_works = db.query(PortfolioWork).filter(
            PortfolioWork.is_featured == True
        ).count()
        print(f"⭐ الأعمال المميزة: {featured_works}")
        
        # 6. الأعمال الظاهرة والنشطة
        visible_and_active = db.query(PortfolioWork).filter(
            PortfolioWork.is_visible == True,
            PortfolioWork.is_active == True
        ).count()
        print(f"🎯 الأعمال الظاهرة والنشطة: {visible_and_active}\n")
        
        # 7. عرض جميع الأعمال بالتفصيل
        print("=" * 60)
        print("📋 تفاصيل جميع الأعمال:")
        print("=" * 60)
        
        all_works = db.query(PortfolioWork).all()
        
        if len(all_works) == 0:
            print("⚠️ لا توجد أعمال في قاعدة البيانات!")
            print("\n💡 نصيحة: قم بإضافة أعمال عبر لوحة التحكم أو استخدم test_railway.py")
        else:
            for i, work in enumerate(all_works, 1):
                print(f"\n{i}. العمل ID: {work.id}")
                print(f"   العنوان (عربي): {work.title_ar}")
                print(f"   العنوان (إنجليزي): {work.title_en or 'N/A'}")
                print(f"   الصورة: {work.image_url or 'بدون صورة'}")
                print(f"   الفئة: {work.category_ar or 'N/A'}")
                print(f"   ظاهر: {'✅' if work.is_visible else '❌'}")
                print(f"   نشط: {'✅' if work.is_active else '❌'}")
                print(f"   مميز: {'⭐' if work.is_featured else ''}")
        
        # 8. اختبار الاستعلام المطابق لـ API
        print("\n" + "=" * 60)
        print("🔍 اختبار الاستعلام المطابق لـ /api/portfolio/:")
        print("=" * 60)
        
        api_works = db.query(PortfolioWork).filter(
            PortfolioWork.is_visible == True,
            PortfolioWork.is_active == True
        ).order_by(PortfolioWork.display_order).all()
        
        print(f"✅ عدد الأعمال القابلة للعرض: {len(api_works)}")
        
        if len(api_works) > 0:
            print("\n📦 مثال على بيانات API:")
            work = api_works[0]
            api_data = {
                "id": work.id,
                "title_ar": work.title_ar or "",
                "title": work.title_en or work.title_ar or "",
                "image_url": work.image_url or "",
                "category_ar": work.category_ar or "",
                "is_featured": work.is_featured
            }
            print(f"   {api_data}")
        
        print("\n" + "=" * 60)
        print("✅ اكتمل الاختبار!")
        print("=" * 60)
        
        return True
        
    except Exception as e:
        print(f"\n❌ خطأ: {str(e)}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()

if __name__ == "__main__":
    test_portfolio_import()

