# دليل نشر المشروع على Railway

## 📋 الخطوات المطلوبة لنشر المشروع كاملاً

### ✅ ما تم إنجازه:
1. ✓ Backend API منشور ويعمل على `khawam-pro-production.up.railway.app`
2. ✓ Postgres Database موجودة على Railway
3. ✓ تم إنشاء ملفات تكوين النشر للـ Frontend
4. ✓ تم إصلاح مسارات API في Frontend
5. ✓ تم إنشاء سكريبت لتهيئة قاعدة البيانات

### 📝 الخطوات المتبقية:

#### 1. إنشاء Frontend Service على Railway

1. اذهب إلى: https://railway.com/project/YOUR_PROJECT_ID
2. في صفحة **Architecture**، اضغط على **+ Create**
3. اختر **GitHub Repo**
4. اختر مستودع **khawam-pro**
5. في إعدادات النشر:
   - **Root Directory**: `frontend`
   - **Source**: سيقوم Railway بالتحديد تلقائياً
   
#### 2. إعداد Environment Variables للـ Frontend

في صفحة Frontend service:
- **Settings** > **Variables**
- أضف:
  ```
  VITE_API_URL = https://khawam-pro-production.up.railway.app
  ```

#### 3. تهيئة قاعدة البيانات

في Backend service على Railway:

**الطريقة الأولى: عبر Railway Console**
1. في صفحة Backend service
2. **Settings** > **Service Console**
3. نفذ الأوامر التالية:
   ```bash
   cd backend
   python init_db.py
   ```

**الطريقة الثانية: عبر Railway CLI**
```bash
railway run --service backend python backend/init_db.py
```

#### 4. إعداد Environment Variables للـ Backend

في Backend service على Railway:
- **Settings** > **Variables**
- تأكد من وجود:
  ```
  DATABASE_URL = (يتم إضافته تلقائياً من Railway عند ربط Postgres)
  SECRET_KEY = your-secret-key-here
  REMOVE_BG_API_KEY = QP2YU5oSDaLwXpzDRKv4fjo9
  ALGORITHM = HS256
  ACCESS_TOKEN_EXPIRE_MINUTES = 30
  ```

#### 5. ربط Postgres Database مع Backend

1. في صفحة Postgres service
2. **Settings** > **Connect**
3. انسخ `DATABASE_URL`
4. في Backend service، أضفها كمتغير بيئي

**ملاحظة**: Railway يقوم بهذا تلقائياً في معظم الحالات!

### 🚀 التحقق من النشر

بعد اكتمال النشر:

1. **Backend URL**: `https://khawam-pro-production.up.railway.app`
2. **Frontend URL**: سيظهر في صفحة Frontend service
3. **التأكد من أن الـ API يعمل**: افتح Backend URL في المتصفح

### 🔧 إصلاح المشاكل الشائعة

#### المشكلة: Frontend لا يظهر
- **الحل**: تأكد من أن Frontend service منشور ويستخدم nixpacks.toml

#### المشكلة: Database connection error
- **الحل**: تأكد من `DATABASE_URL` في Backend service

#### المشكلة: CORS errors
- **الحل**: تم إعداد CORS في main.py للسماح بجميع المصادر

### 📁 الملفات التي تم إضافتها:

1. `frontend/nixpacks.toml` - تكوين نشر الـ Frontend
2. `backend/init_db.py` - سكريبت تهيئة قاعدة البيانات
3. `DEPLOY_FRONTEND_RAILWAY.md` - دليل التفصيلي
4. تم تحديث `frontend/vite.config.ts` و `frontend/src/lib/api.ts`

### 🎯 الخطوة التالية:

1. افتح Railway Dashboard
2. أضف Frontend service من GitHub
3. أضف Environment Variables
4. راقب الـ Logs للتأكد من أن النشر يعمل بشكل صحيح

