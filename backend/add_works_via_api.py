"""
إضافة أعمال عبر API
"""
import requests
import json

BASE_URL = "https://khawam-pro-production.up.railway.app"

def add_works():
    """إضافة أعمال عبر API"""
    print("\n" + "=" * 60)
    print("🎨 إضافة أعمال عبر API")
    print("=" * 60)
    
    works = [
        {
            "title_ar": "تصميم هوية بصرية",
            "title": "Brand Identity Design",
            "title_en": "Brand Identity Design",
            "description_ar": "تصميم هوية بصرية شاملة لشركة تقنية ناشئة",
            "description_en": "Complete brand identity design for a tech startup",
            "category_ar": "هوية بصرية",
            "category_en": "Brand Identity",
            "image_url": "https://via.placeholder.com/400x300/FF6B35/FFFFFF?text=Brand+Identity",
            "is_featured": True,
            "is_visible": True,
            "display_order": 1
        },
        {
            "title_ar": "تصميم موقع إلكتروني",
            "title": "Website Design",
            "title_en": "Website Design",
            "description_ar": "تصميم موقع إلكتروني متجاوب وحديث",
            "description_en": "Modern responsive website design",
            "category_ar": "تصميم مواقع",
            "category_en": "Web Design",
            "image_url": "https://via.placeholder.com/400x300/7048E8/FFFFFF?text=Web+Design",
            "is_featured": True,
            "is_visible": True,
            "display_order": 2
        },
        {
            "title_ar": "تصميم مواد تسويقية",
            "title": "Marketing Materials",
            "title_en": "Marketing Materials",
            "description_ar": "تصميم مواد تسويقية متنوعة للشركات",
            "description_en": "Various marketing materials design for companies",
            "category_ar": "مواد تسويقية",
            "category_en": "Marketing Materials",
            "image_url": "https://via.placeholder.com/400x300/F97316/FFFFFF?text=Marketing",
            "is_featured": True,
            "is_visible": True,
            "display_order": 3
        },
        {
            "title_ar": "تصميم شعار احترافي",
            "title": "Professional Logo Design",
            "title_en": "Professional Logo Design",
            "description_ar": "تصميم شعار احترافي مع 3 عروض مختلفة",
            "description_en": "Professional logo design with 3 different concepts",
            "category_ar": "تصميم جرافيكي",
            "category_en": "Graphic Design",
            "image_url": "https://via.placeholder.com/400x300/EF4444/FFFFFF?text=Logo",
            "is_featured": False,
            "is_visible": True,
            "display_order": 4
        },
        {
            "title_ar": "طباعة بانرات إعلانية",
            "title": "Advertising Banner Printing",
            "title_en": "Advertising Banner Printing",
            "description_ar": "طباعة بانرات إعلانية عالية الجودة",
            "description_en": "High-quality advertising banner printing",
            "category_ar": "طباعة",
            "category_en": "Printing",
            "image_url": "https://via.placeholder.com/400x300/10B981/FFFFFF?text=Banner",
            "is_featured": False,
            "is_visible": True,
            "display_order": 5
        },
    ]
    
    added = 0
    failed = 0
    
    for work in works:
        try:
            print(f"\n📤 إضافة: {work['title_ar']}")
            response = requests.post(
                f"{BASE_URL}/api/admin/works",
                json=work,
                headers={"Content-Type": "application/json"},
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                work_id = data.get('work', {}).get('id', 'N/A')
                print(f"   ✅ نجح! ID: {work_id}")
                added += 1
            else:
                print(f"   ❌ فشل ({response.status_code}): {response.text[:100]}")
                failed += 1
        except Exception as e:
            print(f"   ❌ خطأ: {str(e)}")
            failed += 1
    
    print("\n" + "=" * 60)
    print(f"✅ نجح: {added}")
    print(f"❌ فشل: {failed}")
    print("=" * 60)
    
    # اختبار الجلب
    print("\n📋 التحقق من الأعمال المضافة:")
    response = requests.get(f"{BASE_URL}/api/portfolio/", timeout=30)
    if response.status_code == 200:
        works_list = response.json()
        print(f"✅ عدد الأعمال الآن: {len(works_list)}")
        if len(works_list) > 0:
            print("\n📦 الأعمال:")
            for work in works_list:
                print(f"   - {work.get('title_ar', 'N/A')} (ID: {work.get('id', 'N/A')})")
    
    return added > 0

if __name__ == "__main__":
    add_works()

