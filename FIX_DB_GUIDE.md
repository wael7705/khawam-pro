# دليل إصلاح قاعدة البيانات

## الطريقة: استخدام سكريبت Python مباشرة

### الخطوة 1: الحصول على DATABASE_URL من Railway

1. افتح Railway Dashboard
2. اذهب إلى Postgres Service
3. اضغط على tab "Variables"
4. انسخ قيمة `DATABASE_URL` (يبدأ بـ `postgresql://`)

### الخطوة 2: إنشاء ملف .env (إذا لم يكن موجوداً)

في المجلد الرئيسي للمشروع، أنشئ ملف `.env` وأضف:

```
DATABASE_URL=postgresql://user:password@host:port/database
```

**أو** يمكنك تمرير DATABASE_URL مباشرة كمتغير بيئة.

### الخطوة 3: تشغيل السكريبت

#### من PowerShell:

```powershell
# تأكد أنك في المجلد الرئيسي للمشروع
cd C:\Users\waeln\Documents\GitHub\khawam-pro

# قم بتعيين DATABASE_URL إذا لم يكن في .env
$env:DATABASE_URL="postgresql://user:password@host:port/database"

# شغّل السكريبت
python fix_db.py
```

#### أو مباشرة مع DATABASE_URL:

```powershell
$env:DATABASE_URL="postgresql://postgres:password@containers-us-west-123.railway.app:5432/railway"; python fix_db.py
```

### الخطوة 4: انتظر النتيجة

السكريبت سيقوم بـ:
1. ✅ الاتصال بقاعدة البيانات
2. ✅ حذف جميع الطلبات والمستخدمين القدامى
3. ✅ إنشاء 6 مستخدمين جدد مع كلمات مرور مشفرة
4. ✅ التحقق من النتيجة

### إذا واجهت مشاكل:

1. **خطأ "DATABASE_URL غير موجود":**
   - تأكد من وجود `.env` في المجلد الرئيسي
   - أو قم بتعيين `$env:DATABASE_URL` في PowerShell

2. **خطأ في الاتصال:**
   - تحقق من صحة `DATABASE_URL`
   - تأكد من أن Railway Postgres service نشط

3. **خطأ في الاستيراد:**
   - تأكد من تثبيت المتطلبات: `pip install -r backend/requirements.txt`

