# 🔧 إضافة البيانات على Railway - التعليمات

## 📋 الطريقة: استخدام Railway Console

### 1️⃣ افتح Railway Console:
1. اذهب إلى: https://railway.com/project/khawam
2. اضغط على خدمة `khawam-pro`
3. اختر **"Settings"** > **"Service Console"**
4. أو اضغط على **"Shell"** أو **"Console"**

### 2️⃣ نفذ هذه الأوامر في Console:

```bash
cd backend
python add_sample_data.py
```

### 3️⃣ إذا لم تعمل، جرب:

```bash
python3 backend/add_sample_data.py
```

---

## 🔄 طريقة بديلة: استخدام Railway CLI

في PowerShell محلياً:

```powershell
railway run python backend/add_sample_data.py
```

---

## ✅ التحقق من البيانات:

بعد إضافة البيانات:
1. افتح: https://khawam-pro-production.up.railway.app/api/products/
2. يجب أن ترى قائمة المنتجات
3. افتح: https://khawam-pro-production.up.railway.app/api/services/
4. يجب أن ترى قائمة الخدمات

---

## 📊 البيانات التي ستُضاف:

- 3 منتجات تجريبية
- 3 خدمات تجريبية
- 3 أعمال تجريبية
- 3 فئات منتجات

**نفذ الآن عبر Railway Console!**

