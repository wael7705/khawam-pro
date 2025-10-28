# 🚀 نشر مشروع خوام على Railway

## ✅ الملفات الجاهزة للنشر:

- ✅ `Procfile` - للدخول إلى Backend
- ✅ `nixpacks.toml` - للتثبيت التلقائي  
- ✅ `railway.json` - إعدادات Railway
- ✅ `.gitignore` - حماية الملفات السرية

---

## 📋 خطوات النشر على Railway:

### 1️⃣ التسجيل في Railway

1. اذهب إلى: https://railway.app
2. اضغط "Sign Up" أو "Login"
3. اختر "Login with GitHub"
4. بالموافقة على الصلاحيات

---

### 2️⃣ إنشاء Project جديد

1. بعد تسجيل الدخول، اضغط "New Project"
2. اختر "Deploy from GitHub repo"
3. اربط حساب GitHub
4. اختر repository: `wael7705/khawam-pro`

---

### 3️⃣ إعداد قاعدة البيانات (PostgreSQL)

1. في المشروع الجديد، اضغط "New"
2. اختر "Database" → "PostgreSQL"
3. Railway سينشئ قاعدة بيانات تلقائياً
4. انسخ قيمة `DATABASE_URL` من Variables

---

### 4️⃣ إضافة Environment Variables

اضغط "Variables" وأضف:

```env
DATABASE_URL=${DATABASE_URL}    # من PostgreSQL service
REMOVE_BG_API_KEY=QP2YU5oSDaLwXpzDRKv4fjo9
SECRET_KEY=your-secret-key-change-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
PORT=8000
ENVIRONMENT=production
```

---

### 5️⃣ Migration قاعدة البيانات

1. بعد إنشاء PostgreSQL، اضغط على الـ Service
2. اختر "Query"
3. ارفع محتوى ملف `KHAWAM_DB.sql`
4. نفّذ الـ Query

أو عن طريق CLI:

```bash
psql $DATABASE_URL -f KHAWAM_DB.sql
```

---

### 6️⃣ Domain & Settings

1. في الـ Service الرئيسي، اضغط "Settings"
2. في قسم "Domains" → "Generate Domain"
3. Railway سينشئ domain مثل: `khawam-pro-production-xxxx.up.railway.app`

---

## 🔧 إعدادات إضافية

### Frontend Proxy
- Frontend سيتم تشغيله منفصل
- او استخدم Vercel/Netlify للـ Frontend
- Backend على Railway للـ API فقط

### أو Deploy كل شيء على Railway:
1. ارفع Frontend build كـ static files
2. استخدم Railway Static Site
3. أو استخدم monorepo deployment

---

## ✅ بعد النشر:

### اختبار الـ API:
```bash
# اختبار الـ Backend
curl https://your-app.up.railway.app/

# اختبار الـ Products
curl https://your-app.up.railway.app/api/products/

# اختبار الـ Services  
curl https://your-app.up.railway.app/api/services/
```

---

## 🐛 استكشاف الأخطاء

### Database Connection Error
- تحقق من `DATABASE_URL` في Variables
- تأكد من Migration قاعدة البيانات

### Build Failed
- تحقق من `nixpacks.toml`
- تحقق من `requirements.txt`

### Port Error
- استخدم المتغير `PORT` من Railway
- Backend يجب أن يستمع على `0.0.0.0`

---

## 📝 ملاحظات مهمة

1. **Environment Variables:**
   - `DATABASE_URL` يأتي تلقائياً من PostgreSQL service
   - لا تقم بتعيينه يدوياً

2. **Static Files:**
   - مجلد `uploads/` يجب رفعه كـ Volume
   - أو استخدم Railway Storage

3. **Logs:**
   - يمكنك رؤية Logs من Dashboard
   - أو من CLI

4. **Custom Domain:**
   - يمكنك إضافة Domain مخصص
   - من Settings → Domains

---

## 🎯 النتيجة النهائية:

- ✅ Backend API: `https://your-app.up.railway.app`
- ✅ Database: PostgreSQL على Railway
- ✅ Logs: متاحة من Dashboard
- ✅ Monitoring: تلقائي

---

**جاهز للنشر! 🚀**

