# اختبار الصور قبل النشر / Image Testing Guide

## المشاكل التي تم إصلاحها / Fixed Issues

1. ✅ **خطأ 500 عند تحديث portfolio works**: تم استبدال ORM بـ raw SQL لتجنب مشكلة عمود `images` غير الموجود
2. ✅ **خطأ 404 للصور**: تم إضافة فحص وجود الملف قبل إرجاع الرابط
3. ✅ **دعم عمود images الاختياري**: الكود الآن يتحقق من وجوده قبل الوصول إليه

## خطوات الاختبار / Testing Steps

### 1. اختبار قاعدة البيانات (اختياري)

```powershell
# تعيين متغيرات البيئة
$env:DATABASE_URL = "postgresql://USER:PASSWORD@HOST:PORT/DB"
$env:PUBLIC_BASE_URL = "https://khawam-pro-production.up.railway.app"

# تشغيل الاختبارات
python backend/test_image_urls.py
```

### 2. اختبار عبر API بعد النشر

```powershell
# التحقق من إنشاء عمود images
Invoke-RestMethod -Method POST -Uri 'https://khawam-pro-production.up.railway.app/api/admin/maintenance/ensure-portfolio-images-column'

# التحقق من المنتجات
Invoke-RestMethod -Method GET -Uri 'https://khawam-pro-production.up.railway.app/api/products/' | Select-Object -First 3 | ConvertTo-Json

# التحقق من الأعمال
Invoke-RestMethod -Method GET -Uri 'https://khawam-pro-production.up.railway.app/api/admin/works/all' | Select-Object -First 3 | ConvertTo-Json
```

### 3. اختبار تحديث عمل (portfolio work)

```powershell
# محاولة تحديث عمل بدون images (يجب أن يعمل)
$body = @{
    title_ar = "عنوان تجريبي"
    image_url = "https://example.com/image.jpg"
} | ConvertTo-Json

Invoke-RestMethod -Method PUT `
  -Uri "https://khawam-pro-production.up.railway.app/api/admin/works/1" `
  -ContentType 'application/json' `
  -Body $body
```

## التغييرات الرئيسية / Key Changes

1. **backend/routers/admin.py**:
   - استخدام raw SQL في `update_work` بدلاً من ORM لتجنب مشكلة عمود `images`
   - التحقق من وجود عمود `images` قبل الوصول إليه
   - إنشاء العمود تلقائياً في `update_work_images` إذا لم يكن موجوداً

2. **backend/routers/products.py**:
   - فحص وجود الملف الفعلي قبل إرجاع الرابط
   - إرجاع روابط مطلقة فقط للملفات الموجودة

3. **backend/test_image_urls.py** (جديد):
   - سكربت اختبار شامل للتحقق من:
     - وجود عمود `images` في `portfolio_works`
     - صحة روابط الصور في `products`
     - صحة روابط الصور في `portfolio_works`

## ملاحظات مهمة / Important Notes

- الصور المرفوعة عبر `/api/admin/upload` تُخزن في مجلد `uploads/` على الخادم
- روابط الصور تُطبع تلقائياً إلى روابط مطلقة عند الحفظ
- إذا لم يكن الملف موجوداً على الخادم، لن يتم إرجاع رابط له (بدلاً من 404)

