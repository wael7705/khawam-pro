# إعداد سريع للحسابات

## المشكلة: خطأ 401 عند تسجيل الدخول

السبب: الحسابات الافتراضية لم تُضف بعد إلى قاعدة البيانات على Railway.

## الحل السريع (من المتصفح):

افتح console المتصفح (اضغط F12) ثم انسخ والصق:

```javascript
fetch('https://khawam-pro-production.up.railway.app/api/setup/init-users', {method: 'POST'})
  .then(r => r.json())
  .then(data => {
    console.log('✅ النتيجة:', data);
    alert('تم إنشاء الحسابات بنجاح!\n' + data.message);
  })
  .catch(err => {
    console.error('❌ خطأ:', err);
    alert('حدث خطأ: ' + err.message);
  });
```

**أو استخدم GET (أسهل من المتصفح مباشرة):**

افتح الرابط التالي مباشرة في المتصفح:
```
https://khawam-pro-production.up.railway.app/api/setup/init-users
```

## التحقق من الحسابات:

```javascript
fetch('https://khawam-pro-production.up.railway.app/api/setup/list-all-users')
  .then(r => r.json())
  .then(data => {
    console.log('المستخدمون:', data);
    alert('عدد المستخدمين: ' + data.total);
  });
```

## الحسابات الافتراضية:

- **مدير 1:** `0966320114` / `admin123`
- **مدير 2:** `+963955773227` / `khawam-p`
- **موظف 1:** `khawam-1@gmail.com` / `khawam-1`
- **موظف 2:** `khawam-2@gmail.com` / `khawam-2`
- **موظف 3:** `khawam-3@gmail.com` / `khawam-3`
- **عميل:** `customer@gmail.com` / `963214`

## ملاحظة مهمة:

بعد إنشاء الحسابات، انتظر 2-3 ثواني ثم جرب تسجيل الدخول مرة أخرى.
