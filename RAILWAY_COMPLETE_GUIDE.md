# 🚀 دليل النشر الكامل على Railway

## 📋 المتطلبات الأساسية

- ✅ حساب GitHub: `wael7705`
- ✅ Repository: `khawam-pro`
- ✅ ملف قاعدة البيانات: `database/KHAWAM_DB.sql`
- ✅ Backend: FastAPI + Python
- ✅ Frontend: React + Vite (سيتم نشره لاحقاً)

---

## 🎯 خطوات النشر (7 خطوات)

### ✅ الخطوة 1: التسجيل على Railway

1. اذهب إلى: https://railway.app
2. اضغط **"Start a New Project"**
3. اختر **"Login with GitHub"**
4. وافق على الصلاحيات

---

### ✅ الخطوة 2: ربط Repository

1. بعد تسجيل الدخول، اضغط **"New Project"**
2. اختر **"Deploy from GitHub repo"**
3. اختر repository: **`wael7705/khawam-pro`**
4. Railway سيبدأ البناء تلقائياً

---

### ✅ الخطوة 3: إنشاء قاعدة البيانات PostgreSQL

1. في المشروع، اضغط **"New"**
2. اختر **"Database"** → **"PostgreSQL"**
3. Railway سينشئ قاعدة بيانات
4. **انسخ** قيمة `DATABASE_URL` من Variables (سنحتاجها)

#### 📝 ملاحظة مهمة:
`DATABASE_URL` يأتي بشكل:
```
postgres://postgres:password@hostname:port/railway
```

---

### ✅ الخطوة 4: رفع ملف قاعدة البيانات

#### الطريقة الأولى: عبر Railway Dashboard
1. في صفحة PostgreSQL service
2. اضغط **"Query"**
3. افتح ملف `database/KHAWAM_DB.sql`
4. انسخ المحتوى والصقه في Query Tool
5. اضغط **"Execute"** (أو F5)

#### الطريقة الثانية: عبر Railway CLI
```bash
# تثبيت Railway CLI
npm install -g @railway/cli

# تسجيل الدخول
railway login

# رفع ملف SQL
railway link  # يربط المشروع
psql $DATABASE_URL -f database/KHAWAM_DB.sql
```

---

### ✅ الخطوة 5: إضافة Environment Variables

1. في الـ Service الرئيسي، اضغط **"Variables"**
2. أضف المتغيرات التالية:

#### Environment Variables المطلوبة:

```env
# Database (يأتي تلقائياً من PostgreSQL)
DATABASE_URL=${DATABASE_URL}

# API Keys
REMOVE_BG_API_KEY=QP2YU5oSDaLwXpzDRKv4fjo9

# Security
SECRET_KEY=change-this-in-production-to-random-string
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Environment
ENVIRONMENT=production
PORT=8000

# Frontend URL (لاحقاً)
FRONTEND_URL=https://your-frontend-url.com
```

#### كيفية إضافة متغير:
1. في Variables، اضغط **"New Variable"**
2. أدخل الاسم (مثلاً: `REMOVE_BG_API_KEY`)
3. أدخل القيمة (مثلاً: `QP2YU5oSDaLwXpzDRKv4fjo9`)
4. اضغط **"Add"**

---

### ✅ الخطوة 6: تحديث Backend للعمل مع Railway

#### التحقق من المتغيرات:
الملف `backend/main.py` يستخدم:
```python
# ✅ جاهز - يستخدم PORT من المتغيرات
if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
```

#### التحقق من Database:
الملف `backend/database.py` يستخدم:
```python
# ✅ جاهز - يستخدم DATABASE_URL من المتغيرات
DATABASE_URL = os.getenv("DATABASE_URL")
```

---

### ✅ الخطوة 7: اختبار API

بعد النشر، اذهب إلى:
- Dashboard → Service → Settings → Domains → **Generate Domain**

ستحصل على link مثل:
```
https://khawam-pro-production-xxxx.up.railway.app
```

#### اختبار Endpoints:
```bash
# Root
curl https://your-app.up.railway.app/

# Products
curl https://your-app.up.railway.app/api/products/

# Services
curl https://your-app.up.railway.app/api/services/

# Portfolio
curl https://your-app.up.railway.app/api/portfolio/

# Admin - Products
curl https://your-app.up.railway.app/api/admin/products/all
```

---

## 🎯 الخطوة 8: نشر Frontend (اختياري)

### الخيار 1: Railway Static Site
1. في المشروع، اضغط **"New"**
2. اختر **"Empty Service"**
3. Install Railway CLI:
   ```bash
   npm install -g @railway/cli
   ```
4. Build وإرفع:
   ```bash
   cd frontend
   pnpm build
   railway up
   ```

### الخيار 2: Vercel (موصى به)
1. اذهب إلى: https://vercel.com
2. Import project من GitHub
3. اختر `khawam-pro/frontend`
4. Build Command: `pnpm build`
5. Output Directory: `dist`
6. Environment Variables:
   ```env
   VITE_API_URL=https://your-backend.up.railway.app/api
   ```

### الخيار 3: Netlify
1. اذهب إلى: https://netlify.com
2. Import project من GitHub
3. Build: `cd frontend && pnpm build`
4. Publish: `dist`

---

## 🔧 إعدادات إضافية

### Volume للـ Uploads
```bash
# إنشاء Volume لحفظ الملفات المرفوعة
railway volumes create uploads -s uploads
```

### Auto-Deploy
- Railway يتحدث تلقائياً عند push لـ GitHub
- لا حاجة لتنزيل أو تشغيل أي شيء

### Monitoring & Logs
- Logs متاحة من Dashboard
- Real-time monitoring تلقائي

---

## ✅ القائمة النهائية

قبل النشر، تأكد من:

- ✅ GitHub repository موجود: `wael7705/khawam-pro`
- ✅ ملف `database/KHAWAM_DB.sql` موجود
- ✅ Backend configuration صحيح
- ✅ Environment Variables جاهزة
- ✅ Frontend build يشتغل محلياً

---

## 🚀 ابدأ الآن

1. **افتح:** https://railway.app
2. **Sign up** بـ GitHub
3. **ابدأ الخطوة 2** من القائمة أعلاه

**معد وقت الإتمام:** ~10-15 دقيقة ⏱️

---

## 🆘 استكشاف الأخطاء

### Database Error
- تحقق من `DATABASE_URL` في Variables
- تأكد من رفع ملف `KHAWAM_DB.sql`

### Build Failed
- تحقق من `backend/requirements.txt`
- تحقق من `nixpacks.toml`

### 404 Not Found
- تأكد من الدخول على الـ URL الصحيح
- تحقق من أن Railway نشر الخدمة

---

## 📝 ملاحظات مهمة

1. **Database Migration**
   - ارفع `KHAWAM_DB.sql` **مرة واحدة فقط**
   - بعد رفع الملف، ستجد البيانات التجريبية

2. **Environment Variables**
   - `DATABASE_URL` يأتي تلقائياً من PostgreSQL
   - لا تحتاج لتعيينه يدوياً

3. **Uploads**
   - الملفات المرفوعة تذهب في Volume على Railway
   - أو استخدم AWS S3 / Cloud Storage

4. **Custom Domain**
   - يمكنك إضافة domain مخصص
   - من Settings → Domains → Add Domain

---

## 🎉 النتيجة النهائية

بعد اتمام جميع الخطوات:

- ✅ Backend API: `https://your-app.up.railway.app`
- ✅ Database: PostgreSQL على Railway
- ✅ Admin API: يعمل بنجاح
- ✅ Studio API: يعمل بنجاح
- ✅ Frontend: (اختياري) على Vercel/Netlify

---

**جاهز للبدء! 🚀**
