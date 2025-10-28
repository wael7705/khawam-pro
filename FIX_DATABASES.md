# 🔧 حل مشكلة قواعد البيانات المتعددة

## ❌ المشكلة
يوجد **4 قواعد بيانات فارغة** بدون جداول

## ✅ الحل السريع (3 دقائق)

### الخطوة 1: احذف 3 قواعد بيانات
1. اذهب إلى: https://railway.com/project/733825b2-89c0-4991-864f-79cf45678d39
2. احذف **3 من الـ 4** PostgreSQL services (احذف كلها إذا أردت)
3. اترك فقط **واحد فقط**

### الخطوة 2: أنشئ قاعدة بيانات جديدة نظيفة
1. اضغط **"يخلق +"** (Create +)
2. اختر **"Database"** → **"PostgreSQL"**
3. انتظر حتى ينشئ Railway قاعدة البيانات

### الخطوة 3: رفع ملف قاعدة البيانات
1. اضغط على **PostgreSQL** service الجديد
2. اضغط على **"Query"** tab
3. افتح ملف `database/KHAWAM_DB.sql`
4. انسخ كل المحتوى (Ctrl+A, Ctrl+C)
5. الصقه في Query panel
6. اضغط **"Execute"** (F5)

### الخطوة 4: إنشاء Backend Service
1. اضغط **"يخلق +"** (Create +)
2. اختر **"GitHub Repo"**
3. اختر: `wael7705/khawam-pro`
4. انتظر حتى ينشئ Railway الخدمة

### الخطوة 5: إضافة Environment Variables
في **backend** service:
1. اضغط **"Variables"**
2. أضف:
   ```env
   REMOVE_BG_API_KEY=QP2YU5oSDaLwXpzDRKv4fjo9
   SECRET_KEY=khawam-secret-key-change-in-production
   ALGORITHM=HS256
   ACCESS_TOKEN_EXPIRE_MINUTES=30
   ```

3. **ملاحظة:** `DATABASE_URL` سيأتي تلقائياً من PostgreSQL

---

## ✅ النتيجة المتوقعة

بعد الخطوات:
- ✅ **قاعدة بيانات واحدة فقط**
- ✅ **جميع الجداول موجودة** (24 جدول)
- ✅ **Backend service** يعمل
- ✅ **API جاهزة** للاستخدام

---

## 🧪 الاختبار بعد النشر

بعد أن ينشر Railway، اختبر:

```bash
# Root
curl https://your-app.up.railway.app/

# Products
curl https://your-app.up.railway.app/api/products/

# Services
curl https://your-app.up.railway.app/api/services/

# Portfolio
curl https://your-app.up.railway.app/api/portfolio/

# Admin
curl https://your-app.up.railway.app/api/admin/products/all
```

---

**ابدأ الآن بحذف القواعد الفائضة! 🗑️**
