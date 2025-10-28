# 🚀 النشر الأوتوماتيكي على Railway

## ⚠️ ملاحظة مهمة
Railway يتطلب **تسجيل دخول شخصي** عبر GitHub. لا يمكنني الاتصال بحسابك مباشرة.

## ✅ الحل: دليل خطوة بخطوة

### الخطوة 1: تثبيت Railway CLI
```powershell
# في terminal جديد (يجب إعادة تشغيل VS Code لتفعيل PNPM_HOME)
pnpm add -g @railway/cli
```

### الخطوة 2: تسجيل الدخول
```powershell
railway login
```
سيفتح متصفح لتسجيل الدخول بـ GitHub

### الخطوة 3: إنشاء المشروع
```powershell
railway init
```
أدخل اسم المشروع: `khawam`

### الخطوة 4: ربط قاعدة البيانات
```powershell
railway add postgres
```

### الخطوة 5: الحصول على DATABASE_URL
```powershell
railway variables
```
انسخ `DATABASE_URL`

### الخطوة 6: رفع قاعدة البيانات

#### الطريقة الأولى: عبر Railway Dashboard
1. اذهب إلى: https://railway.app/projects
2. اضغط على مشروع `khawam`
3. اضغط على `postgres` service
4. اضغط على `Query` tab
5. افتح ملف `database/KHAWAM_DB.sql`
6. الصق المحتوى
7. اضغط `Execute`

#### الطريقة الثانية: عبر psql
```powershell
# استبدل DATABASE_URL بالقيمة الصحيحة
psql "your-database-url" -f database/KHAWAM_DB.sql
```

### الخطوة 7: إضافة Environment Variables
```powershell
railway variables set REMOVE_BG_API_KEY="QP2YU5oSDaLwXpzDRKv4fjo9"
railway variables set SECRET_KEY="khawam-secret-key-change-in-production"
railway variables set ALGORITHM="HS256"
railway variables set ACCESS_TOKEN_EXPIRE_MINUTES="30"
```

### الخطوة 8: النشر
```powershell
railway up
```

### الخطوة 9: الحصول على URL
```powershell
railway domain
```

---

## 🎯 الحل السريع (5 دقائق)

أنا أنشأت لك **script أوتوماتيكي**:

```powershell
# تشغيل السكريبت
.\RAILWAY_DEPLOY_SCRIPT.ps1
```

**ملاحظة:** يجب تسجيل الدخول على Railway أولاً

---

## 📋 اختبار النشر

بعد النشر، اختبر:

### 1. اختبار الاتصال
```powershell
curl https://your-app.up.railway.app/
```

### 2. اختبار Products API
```powershell
curl https://your-app.up.railway.app/api/products/
```

### 3. اختبار Services API
```powershell
curl https://your-app.up.railway.app/api/services/
```

### 4. اختبار Admin API
```powershell
curl https://your-app.up.railway.app/api/admin/products/all
```

---

## 🆘 حل المشاكل

### Problem: Railway CLI not found
```powershell
# الحل: إعادة تشغيل Terminal
# أو إضافة PNPM_HOME يدوياً
$env:Path += ";C:\Users\waeln\AppData\Local\pnpm"
```

### Problem: Login failed
```powershell
# الحل: استخدم GitHub login
railway login --browserless
```

### Problem: Database migration failed
```powershell
# الحل: استخدم Railway Dashboard
# اذهب إلى Query panel
# الصق الكود يدوياً
```

---

## 📝 ملاحظات مهمة

1. **يجب تسجيل الدخول يدوياً** على Railway
2. **DATABASE_URL** يأتي تلقائياً من PostgreSQL service
3. **الملفات المرفوعة** ستذهب في Volume (يمكنك إضافة Volume لاحقاً)
4. **الـ Domain** يُنشأ تلقائياً بعد النشر

---

## 🎉 النتيجة النهائية

بعد إتمام الخطوات:
- ✅ Backend API: `https://khawam-production-xxxx.up.railway.app`
- ✅ PostgreSQL Database: متصل
- ✅ جميع الـ APIs: تعمل بنجاح
- ✅ Admin Panel: جاهز
- ✅ Studio: جاهز

---

**ابدأ الآن:** افتح terminal جديد وشغّل `.\RAILWAY_DEPLOY_SCRIPT.ps1`

