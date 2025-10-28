# إنشاء Frontend Service منفصل على Railway

## 📊 المشكلة الحالية:

من الشاشة في Railway، نرى أن:
- ✅ خدمة `khawam-pro` تعمل (Backend)
- ✅ خدمة `Postgres` تعمل (Database)
- ❌ التغييرات الخاصة بالـ Frontend يتم "تخطيها" (SKIPPED)

**السبب**: خدمة `khawam-pro` مُعدة للـ Backend فقط، ولديها `railway.toml` يشير إلى `Dockerfile` الخاص بالـ Backend.

## ✅ الحل: إنشاء Frontend Service منفصل

### خطوات إنشاء Frontend Service:

#### الخطوة 1: إنشاء Service جديد
1. في صفحة **Architecture** على Railway
2. اضغط على زر **"+ New"** في الأعلى
3. اختر **"GitHub Repo"**

#### الخطوة 2: ربط المستودع
1. اختر نفس المستودع: **khawam-pro**
2. اترك باقي الإعدادات الافتراضية
3. اضغط **"Deploy"**

#### الخطوة 3: تخصيص الإعدادات

بعد إنشاء الخدمة، اذهب إلى **Settings**:

**أ. Root Directory:**
- اذهب إلى **Settings** > **Build & Deploy**
- في **Root Directory** اكتب: `frontend`

**ب. Environment Variables:**
- اذهب إلى **Settings** > **Variables**
- أضف المتغيرات التالية:
```
NODE_ENV = production
VITE_API_URL = https://khawam-pro-production.up.railway.app
```

#### الخطوة 4: Build Configuration
Railway سيتعرف تلقائياً على `frontend/nixpacks.toml` ويستخدمه.

سيقوم بـ:
1. تثبيت pnpm dependencies
2. بناء المشروع (`pnpm run build`)
3. تشغيل الـ Frontend (`vite preview`)

### 📋 ملخص الخطوات:

```
1. Railway Dashboard > Architecture
2. + New > GitHub Repo
3. اختر khawam-pro
4. Settings > Root Directory: frontend
5. Settings > Variables:
   - VITE_API_URL = https://khawam-pro-production.up.railway.app
6. راقب النشر في قسم Deployments
```

### 🎯 النتيجة المتوقعة:

بعد إنشاء Frontend Service، ستحصل على:
- 🌐 **Backend URL**: `khawam-pro-production.up.railway.app` (موجود حالياً)
- 🌐 **Frontend URL**: سيظهر في صفحة Frontend service الجديدة (مثل: `frontend-production.up.railway.app`)

### 🔧 إصلاح مشاكل شائعة:

**المشكلة**: Frontend Service لا يتعرف على pnpm
**الحل**: تأكد من وجود `frontend/nixpacks.toml` في المستودع

**المشكلة**: خطأ في المسارات
**الحل**: تأكد من `VITE_API_URL` في Environment Variables

**المشكلة**: Build fails
**الحل**: افتح Logs في Frontend service وافحص الأخطاء

