"""
سكريبت لإصلاح قاعدة البيانات على Railway
يستخدم endpoint مباشرة
"""
import requests
import sys
import os

def main():
    # الحصول على Railway URL
    railway_url = os.getenv('RAILWAY_PUBLIC_DOMAIN') or os.getenv('RAILWAY_URL') or os.getenv('BACKEND_URL')
    
    if not railway_url:
        # حاول الحصول من سطر الأوامر
        if len(sys.argv) > 1:
            railway_url = sys.argv[1]
        else:
            print('❌ يرجى توفير رابط Railway')
            print('')
            print('الاستخدام:')
            print('  python fix_railway_db.py https://your-app.railway.app')
            print('')
            print('أو تعيين متغير بيئة:')
            print('  $env:RAILWAY_URL="https://your-app.railway.app"')
            print('')
            sys.exit(1)
    
    # إضافة https إذا لم يكن موجوداً
    if not railway_url.startswith('http'):
        railway_url = f'https://{railway_url}'
    
    # إزالة / في النهاية
    railway_url = railway_url.rstrip('/')
    
    endpoint = f'{railway_url}/api/setup/force-reset'
    
    print('=' * 70)
    print('🔧 إصلاح قاعدة البيانات على Railway')
    print('=' * 70)
    print(f'📡 الرابط: {railway_url}')
    print(f'🎯 Endpoint: {endpoint}')
    print('')
    print('🔄 جاري التشغيل...')
    print('')
    
    try:
        response = requests.post(endpoint, timeout=60)
        
        if response.status_code == 200:
            result = response.json()
            print('=' * 70)
            print('✅ تم الإصلاح بنجاح!')
            print('=' * 70)
            print('')
            print('📊 النتائج:')
            print(f'   - تم حذف {result.get("deleted_users", 0)} مستخدم (مدير/موظف)')
            print(f'   - تم حذف {result.get("deleted_orders", 0)} طلب')
            print(f'   - تم حذف {result.get("deleted_studio_projects", 0)} مشروع استيديو')
            print(f'   - تم الحفاظ على {result.get("customers_preserved", 0)} عميل')
            print(f'   - تم إنشاء {result.get("created_users", 0)} مستخدم جديد')
            print('')
            print('📝 الحسابات الجاهزة:')
            print('   - مدير 1: 0966320114 / admin123')
            print('   - مدير 2: 963955773227+ / khawam-p')
            print('   - موظف 1: khawam-1@gmail.com / khawam-1')
            print('   - موظف 2: khawam-2@gmail.com / khawam-2')
            print('   - موظف 3: khawam-3@gmail.com / khawam-3')
            print('')
        else:
            print(f'❌ خطأ: {response.status_code}')
            print(f'الرسالة: {response.text}')
            sys.exit(1)
            
    except requests.exceptions.Timeout:
        print('❌ انتهت مهلة الاتصال. قد تستغرق العملية وقتاً أطول.')
        sys.exit(1)
    except requests.exceptions.ConnectionError:
        print('❌ لا يمكن الاتصال بالخادم.')
        print('   تأكد من أن:')
        print('   1. Railway service يعمل')
        print('   2. الرابط صحيح')
        sys.exit(1)
    except Exception as e:
        print(f'❌ خطأ: {e}')
        sys.exit(1)

if __name__ == '__main__':
    main()

