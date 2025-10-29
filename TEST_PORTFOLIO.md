# 🧪 اختبار استيراد الأعمال من قاعدة البيانات

## 📋 خطوات الاختبار:

### الطريقة 1: على Railway Console (مستحسن)

1. **اذهب إلى**: https://railway.com/project/khawam
2. **افتح خدمة**: `khawam-pro`
3. **اذهب إلى**: Settings > Service Console
4. **نفذ الأوامر**:
```bash
cd /app
python backend/test_portfolio_db.py
```

---

### الطريقة 2: محلياً عبر PowerShell/Terminal

**إذا كان لديك Railway CLI مثبت:**

```powershell
railway run python backend/test_portfolio_db.py
```

**أو إذا كنت على Railway:**

```powershell
railway connect
railway run python backend/test_portfolio_db.py
```

---

## 📊 ما سيعرضه الاختبار:

- ✅ عدد الأعمال الإجمالي في قاعدة البيانات
- ✅ الأعمال الظاهرة
- ✅ الأعمال النشطة
- ✅ الأعمال المميزة
- ✅ تفاصيل كل عمل (ID, العنوان, الصورة, الفئة, الحالة)
- ✅ بيانات API التي ستُرسل للواجهة

---

## 🔍 إذا لم توجد أعمال:

1. **أضف أعمال عبر لوحة التحكم**:
   - افتح: https://khawam-pro-production.up.railway.app/dashboard
   - اذهب إلى **إدارة الأعمال**
   - اضغط **إضافة عمل**
   - املأ النموذج وأضف صورة
   - اضغط **إضافة**

2. **أو استخدم سكريبت test_railway.py**:
```bash
python backend/test_railway.py
```

---

## ✅ بعد الاختبار:

إذا نجح الاختبار وأظهر أعمالاً في قاعدة البيانات، لكنها لا تظهر في الواجهة:
- تحقق من endpoint `/api/portfolio/` في Network tab
- تحقق من Console للأخطاء
- تأكد من أن `is_visible=True` و `is_active=True`

---

**شغّل الاختبار الآن!** 🚀

