# دليل إعادة تهيئة المستخدمين

## المشكلة:
- قاعدة البيانات تحتوي على مستخدمين قدامى
- بعض المستخدمين لديهم `password_hash = NULL`
- البيانات الجديدة لم تُضف بشكل صحيح

## الحل: إعادة تهيئة جدول المستخدمين

### الطريقة 1: مسح وإنشاء جديد (الموصى بها) 🔥

**افتح هذا الرابط في المتصفح:**
```
https://khawam-pro-production.up.railway.app/api/setup/reset-users
```

**أو من console المتصفح:**
```javascript
fetch('https://khawam-pro-production.up.railway.app/api/setup/reset-users', {method: 'POST'})
  .then(r => r.json())
  .then(data => {
    console.log('✅ النتيجة:', data);
    alert('تم إعادة تهيئة المستخدمين!\n' + data.message);
  });
```

### الطريقة 2: إعادة إنشاء مع مسح تلقائي

**استخدم parameter `reset=true`:**
```
https://khawam-pro-production.up.railway.app/api/setup/init-users?reset=true
```

**أو من console:**
```javascript
fetch('https://khawam-pro-production.up.railway.app/api/setup/init-users?reset=true', {method: 'POST'})
  .then(r => r.json())
  .then(console.log);
```

## التحقق من النتيجة:

```javascript
fetch('https://khawam-pro-production.up.railway.app/api/setup/list-all-users')
  .then(r => r.json())
  .then(data => {
    console.log('المستخدمون:', data);
    // تحقق من أن جميع المستخدمين لديهم password_hash
    const usersWithoutPassword = data.users.filter(u => !u.has_password);
    if (usersWithoutPassword.length > 0) {
      console.error('❌ يوجد مستخدمون بدون كلمة مرور:', usersWithoutPassword);
    } else {
      console.log('✅ جميع المستخدمين لديهم كلمات مرور مشفرة');
    }
  });
```

## الحسابات التي سيتم إنشاؤها:

### المديرون:
1. **Phone:** `0966320114` (يُحفظ كـ `+96366320114`)
   - **Password:** `admin123`
   - **Password Hash:** ✅ سيتم إنشاؤه تلقائياً
   
2. **Phone:** `+963955773227`
   - **Password:** `khawam-p`
   - **Password Hash:** ✅ سيتم إنشاؤه تلقائياً

### الموظفون:
1. **Email:** `khawam-1@gmail.com` / **Password:** `khawam-1`
2. **Email:** `khawam-2@gmail.com` / **Password:** `khawam-2`
3. **Email:** `khawam-3@gmail.com` / **Password:** `khawam-3`

### العميل:
- **Email:** `customer@gmail.com` / **Password:** `963214`

## ملاحظات مهمة:

1. ⚠️ **تنبيه:** `reset-users` سيمسح **جميع** المستخدمين الموجودين!
2. ✅ جميع كلمات المرور ستُشفّر تلقائياً في عمود `password_hash`
3. ✅ بعد التنفيذ، انتظر 2-3 ثواني ثم جرّب تسجيل الدخول
4. ✅ يمكنك تشغيل endpoint التهيئة عدة مرات بأمان (لن يُنشئ حسابات مكررة)

## حل المشكلة في Railway:

1. افتح Railway Dashboard → Postgres → Data
2. تأكد من أن جميع المستخدمين لديهم `password_hash` غير NULL
3. إذا كان هناك مستخدمون بدون كلمة مرور، استخدم `reset-users` endpoint

