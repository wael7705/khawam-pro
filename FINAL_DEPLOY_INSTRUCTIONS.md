# 🎯 تعليمات النشر النهائية - نفذ هذه الخطوات الآن

## الخدمة: `ideal-amazement`

---

## ⚡ الخطوة 1: اضغط Deploy

في صفحة Architecture على Railway:
- اضغط على **"Deploy"** في الشريط الأرجواني
- انتظر 30 ثانية

---

## ⚡ الخطوة 2: افتح الخدمة ideal-amazement

1. اضغط على كارد **`ideal-amazement`** (الأخضر)
2. سيُفتح لك صفحة الخدمة

---

## ⚡ الخطوة 3: تخصيص Root Directory

1. في أعلى الصفحة اضغط **"Settings"**
2. في قسم **"Build & Deploy"**
3. ابحث عن حقل **"Root Directory"**
4. **اكتب بالضبط**: `frontend`
5. اضغط **"Save"** أو **"Update"**

---

## ⚡ الخطوة 4: إضافة Environment Variables (مهم جداً)

### أ. في Settings
1. اختر تبويب **"Variables"** في الأعلى
2. اضغط **"New Variable"** أو **"+ Add Variable"**

### ب. أضف هذا المتغير بالضبط:

**Variable Name:** 
```
VITE_API_URL
```

**Variable Value:**
```
https://khawam-pro-production.up.railway.app
```

### ج. احفظ
- اضغط **"Add"** أو **"Save"**

---

## ⚡ الخطوة 5: متابعة النشر

1. ارجع إلى **"Deployments"** tab
2. ستشاهد Railway يبدأ البناء تلقائياً
3. انتظر 2-3 دقائق
4. سترى في Logs:
   - "Installing dependencies..."
   - "Building frontend..."
   - "Build successful"

---

## ⚡ الخطوة 6: الحصول على Frontend URL

بعد اكتمال النشر:

1. في صفحة الخدمة **`ideal-amazement`**
2. ابحث عن **"Public Domain"** أو **"Generate Domain"**
3. اضغط عليه
4. ستحصل على URL مثل:
   ```
   https://ideal-amazement-production.up.railway.app
   ```

---

## ✅ النتيجة النهائية:

بعد اكتمال هذه الخطوات:

- ✅ **Backend API**: `https://khawam-pro-production.up.railway.app`
- ✅ **Frontend**: `https://ideal-amazement-production.up.railway.app`
- ✅ **Database**: Postgres متصل

---

## 🎯 خطأ شائع وإصلاحه:

**إذا ظهر خطأ**: "cannot find module" أو "pnpm not found"

**الحل**: تأكد من:
1. Root Directory = `frontend` (بدون مسافات)
2. VITE_API_URL موجود في Variables

---

**نفذ هذه الخطوات الآن بالضبط كما هي!** 🚀

