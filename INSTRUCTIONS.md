# تعليمات الإصلاح النهائية

## المشكلة:
- قاعدة البيانات تحتوي على مستخدمين قدامى بدون كلمات مرور
- endpoint `/api/setup/force-reset` يحتاج تشغيله من web service وليس database service

## الحلول المتاحة:

### الحل 1: استخدام PowerShell Script (الأسهل) ✅

1. افتح PowerShell في مجلد المشروع
2. شغّل:
   ```powershell
   .\FIX_NOW.ps1
   ```
3. السكريبت سيسألك عن `DATABASE_URL`
4. احصل على `DATABASE_URL` من Railway:
   - Postgres Service → Variables tab
   - انسخ قيمة `DATABASE_URL`
5. الصقها في PowerShell عندما يطلب منك

### الحل 2: استخدام Endpoint (بعد ربط khawam-pro service)

1. في PowerShell:
   ```powershell
   railway service
   # اختر: khawam-pro (وليس Postgres)
   ```

2. ثم افتح في المتصفح:
   ```
   https://khawam-pro-production.up.railway.app/api/setup/force-reset
   ```

3. أو من PowerShell:
   ```powershell
   Invoke-WebRequest -Uri "https://khawam-pro-production.up.railway.app/api/setup/force-reset" -Method POST
   ```

### الحل 3: يدوياً من Railway Dashboard

1. اذهب إلى Railway Dashboard
2. Postgres Service → Database → Data
3. احذف جميع السجلات من الجداول يدوياً بالترتيب:
   - order_items
   - orders
   - studio_projects (إن وجد)
   - users
4. ثم استخدم `/api/setup/init-users` لإنشاء المستخدمين الجدد

## التحقق من النجاح:

بعد تنفيذ أي حل، تحقق من:
1. Railway Dashboard → Postgres → Data → users
2. يجب أن تجد 6 مستخدمين فقط
3. جميعهم لديهم `password_hash` مملوء (غير NULL)

## الحسابات الجديدة:

- مدير 1: `0966320114` / `admin123`
- مدير 2: `+963955773227` / `khawam-p`
- موظف 1: `khawam-1@gmail.com` / `khawam-1`
- موظف 2: `khawam-2@gmail.com` / `khawam-2`
- موظف 3: `khawam-3@gmail.com` / `khawam-3`
- عميل: `customer@gmail.com` / `963214`

