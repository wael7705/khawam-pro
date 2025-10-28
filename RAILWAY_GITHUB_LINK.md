# 🚀 النشر الأوتوماتيكي من GitHub على Railway

## ✅ الأفضل: ربط مع GitHub

**لماذا؟**
- ✅ **نشر تلقائي** عند أي push
- ✅ **بدون توقف للتطوير**
- ✅ **سهل التحديث**
- ✅ **يمكننا العمل مباشرة**

---

## 🎯 الخطوات (3 دقائق)

### الخطوة 1: امسح كل شيء وأبدأ من جديد

1. اذهب إلى: https://railway.com/project/733825b2-89c0-4991-864f-79cf45678d39
2. **احذف كل الـ 4 PostgreSQL databases**
3. احذف أي services أخرى موجودة
4. ابدأ بمشروع نظيف

### الخطوة 2: ربط GitHub Repository

1. في المشروع، اضغط **"يخلق +"** (Create +)
2. اختر **"GitHub Repo"**
3. اختر repository: **`wael7705/khawam-pro`**
4. Railway سيربط المشروع تلقائياً

### الخطوة 3: إنشاء PostgreSQL Database

1. بعد ربط GitHub، اضغط **"يخلق +"** مرة أخرى
2. اختر **"Database"** → **"PostgreSQL"**
3. Railway سينشئ قاعدة بيانات
4. ✅ **DATABASE_URL سيأتي تلقائياً**

### الخطوة 4: رفع قاعدة البيانات

1. اضغط على **"Postgres"** service
2. اضغط **"Query"** tab
3. افتح ملف `database/KHAWAM_DB.sql`
4. انسخ المحتوى بالكامل
5. الصقه في Query panel
6. اضغط **"Execute"** (F5)

### الخطوة 5: إضافة Environment Variables

1. اضغط على **backend** service
2. اضغط **"Variables"** tab
3. أضف المتغيرات التالية:

```env
REMOVE_BG_API_KEY=QP2YU5oSDaLwXpzDRKv4fjo9
SECRET_KEY=khawam-secret-key-change-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
ENVIRONMENT=production
```

**ملاحظة:** `DATABASE_URL` تأتي تلقائياً من PostgreSQL

---

## 🎉 النتيجة

الآن:
- ✅ أي **push** إلى GitHub → **نشر تلقائي**
- ✅ **لن تحتاج** لرفع يدوي
- ✅ **سهل التطوير**

---

## 🚀 كيف نعمل الآن؟

### في التطوير المحلي:
```powershell
# 1. عدّل الكود
# 2. اختبر محلياً
pnpm dev

# 3. اعمل commit
git add .
git commit -m "Update feature"
git push

# ✅ Railway سيُحدث تلقائياً!
```

### للتحقق من النشر:
1. اذهب إلى Railway Dashboard
2. ستشوف "Deployment" جديد
3. انتظر حتى يكتمل
4. ✅ API جاهزة

---

## 📝 ملاحظات مهمة

### ✅ المميزات
- نشر تلقائي عند push
- تاريخ تطور عبر GitHub commits
- سهولة مشاركة الكود
- لا حاجة لرفع يدوي

### ⚠️ التنبيهات
- **لا تنشر** كلمات سر في الكود
- استخدم **Environment Variables** دائماً
- اختبر محلياً قبل push

---

## 🧪 الاختبار

بعد النشر التلقائي:

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

**جاهز للبدء! 🚀**

**الآن اذهب إلى Railway Dashboard وابدأ الخطوة 2**

