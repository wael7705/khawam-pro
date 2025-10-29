# 🔧 إصلاح مشكلة الاتصال بقاعدة البيانات

## 🚨 المشكلة:
خطأ `500 Internal Server Error` عند محاولة إضافة منتج:
```
psycopg2.OperationalError: connection to server at "localhost" (::1), port 5432 failed
```

**السبب**: قاعدة البيانات غير مربوطة بشكل صحيح مع Backend service على Railway.

---

## ✅ الحل:

### الخطوة 1: ربط قاعدة البيانات على Railway

1. **اذهب إلى**: https://railway.com/project/khawam
2. **في صفحة Architecture**:
   - ستجد خدمة `Postgres` (قاعدة البيانات)
   - ستجد خدمة `khawam-pro` (Backend)

3. **ربط قاعدة البيانات**:
   - اضغط على خدمة **`khawam-pro`** (Backend)
   - اذهب إلى **Settings** > **Variables**
   - تأكد من وجود متغير `DATABASE_URL`
   
4. **إذا لم يكن موجوداً**:
   - اضغط على خدمة **Postgres**
   - اذهب إلى **Connect** أو **Variables**
   - انسخ `DATABASE_URL`
   - ارجع لخدمة `khawam-pro` > Settings > Variables
   - أضف متغير جديد:
     - **Key**: `DATABASE_URL`
     - **Value**: الصق الرابط من Postgres

---

### الخطوة 2: التأكد من النشر

بعد ربط قاعدة البيانات:
1. Railway سيُعيد نشر الخدمة تلقائياً
2. انتظر 1-2 دقيقة
3. جرّب إضافة منتج مرة أخرى

---

### الخطوة 3: التحقق من Logs

إذا استمرت المشكلة:
1. افتح خدمة `khawam-pro`
2. اذهب إلى **Logs**
3. ابحث عن: "📊 Database URL: ..."
4. تأكد من أن الرابط صحيح (ليس localhost)

---

## 🔍 ملاحظة مهمة:

على Railway، عندما تربط خدمة Postgres مع Backend service:
- Railway **يضيف `DATABASE_URL` تلقائياً** في معظم الحالات
- إذا لم يُضف تلقائياً، يجب إضافته يدوياً

**افتح Railway الآن وتحقق من ربط قاعدة البيانات!**

