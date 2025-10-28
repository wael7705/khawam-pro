# 🌐 نشر الواجهات على Vercel (عالمياً)

## ✅ الوضع الحالي

### ما تم إنجازه:
- ✅ **Backend API:** يعمل على `https://khawam-pro-production.up.railway.app`
- ✅ **Database:** رفع البيانات بنجاح (7 منتجات، 12 خدمة، 10 أعمال)
- ✅ **APIs:** جميع الـ APIs تعمل

### ما ينقص:
- ⚠️ **Frontend (الواجهات):** غير منشور عالمياً

---

## 🚀 نشر الواجهات على Vercel

### الخطوة 1: أنشئ حساب على Vercel

1. اذهب إلى: https://vercel.com
2. اضغط **"Sign Up"**
3. اختر **"Continue with GitHub"**
4. وافق على الصلاحيات

### الخطوة 2: Import Project

1. بعد تسجيل الدخول، اضغط **"Add New Project"**
2. اختر **"Import Git Repository"**
3. ابحث عن `wael7705/khawam-pro`
4. اضغط **"Import"**

### الخطوة 3: إعدادات Build

في صفحة إعدادات المشروع:

1. **Root Directory:** `frontend`
2. **Framework Preset:** `Vite`
3. **Build Command:** `pnpm build`
4. **Output Directory:** `dist`

### الخطوة 4: Environment Variables

أضف هذه المتغيرات:

```env
VITE_API_URL=https://khawam-pro-production.up.railway.app/api
```

### الخطوة 5: Deploy

1. اضغط **"Deploy"**
2. انتظر 1-2 دقيقة
3. ✅ ستحصل على رابط مثل: `https://khawam-pro.vercel.app`

---

## 🎉 النتيجة النهائية

بعد النشر ستحصل على:

- 🌐 **Frontend (الواجهات):** `https://khawam-pro.vercel.app`
- 🔧 **Backend API:** `https://khawam-pro-production.up.railway.app`
- 💾 **Database:** على Railway

---

## 📝 ملاحظات مهمة

### تحديث API_URL في Frontend

قبل النشر، تأكد من تحديث `frontend/src/lib/api.ts`:

```typescript
const API_URL = import.meta.env.VITE_API_URL || 'https://khawam-pro-production.up.railway.app/api'
```

أو أضف في `frontend/.env.production`:
```env
VITE_API_URL=https://khawam-pro-production.up.railway.app/api
```

---

**ابدأ الآن بنشر الواجهات على Vercel! 🚀**

**Link:** https://vercel.com

