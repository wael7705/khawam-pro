# 🚀 نشر Frontend على Railway

## ✅ ما تم إعداده

1. **Frontend جاهز للنشر:**
   - `frontend/railway.toml` ✅
   - `frontend/Procfile` ✅
   - `frontend/package.json` محدث ✅
   - `frontend/src/lib/api.ts` محدث ✅

2. **API متصل:**
   - Frontend يتصل بـ `https://khawam-pro-production.up.railway.app/api`

---

## 🎯 خطوات النشر على Railway

### الخطوة 1: اذهب إلى Railway Dashboard

افتح: https://railway.com/project/733825b2-89c0-4991-864f-79cf45678d39

### الخطوة 2: أضف Frontend Service

1. اضغط **"New"** (أو "يخلق +")
2. اختر **"GitHub Repo"**
3. اختر repository: `wael7705/khawam-pro`
4. في إعدادات الخدمة:
   - **Root Directory:** `frontend`
   - **Build Command:** `pnpm build`
   - **Start Command:** `pnpm run preview --host 0.0.0.0 --port $PORT`

### الخطوة 3: إضافة Environment Variables

في Frontend service، أضف:

```env
VITE_API_URL=https://khawam-pro-production.up.railway.app/api
PORT=3000
```

### الخطوة 4: Deploy

1. اضغط **"Deploy"**
2. انتظر 2-3 دقائق
3. ✅ ستحصل على رابط مثل: `https://khawam-frontend-production.up.railway.app`

---

## 🎉 النتيجة النهائية

بعد النشر ستحصل على:

- 🌐 **Frontend (الواجهات):** `https://khawam-frontend-production.up.railway.app`
- 🔧 **Backend API:** `https://khawam-pro-production.up.railway.app`
- 💾 **Database:** على Railway

---

## 📝 ملاحظات مهمة

### إعدادات Railway للـ Frontend:

1. **Root Directory:** `frontend`
2. **Build Command:** `pnpm build`
3. **Start Command:** `pnpm run preview --host 0.0.0.0 --port $PORT`
4. **Environment Variables:**
   ```env
   VITE_API_URL=https://khawam-pro-production.up.railway.app/api
   PORT=3000
   ```

### الملفات المضافة:

- `frontend/railway.toml` - إعدادات Railway
- `frontend/Procfile` - أمر البدء
- `frontend/package.json` - محدث مع PORT
- `frontend/src/lib/api.ts` - متصل مع Railway API

---

**ابدأ الآن بنشر Frontend على Railway! 🚀**

**Link:** https://railway.com/project/733825b2-89c0-4991-864f-79cf45678d39

