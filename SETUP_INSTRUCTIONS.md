# تعليمات تهيئة قاعدة البيانات والمستخدمين

## المشكلة
الحسابات الافتراضية غير موجودة في قاعدة البيانات على Railway.

## الحل - الطريقة السهلة

بعد نشر التحديثات على Railway، قم بزيارة الرابط التالي في المتصفح أو استخدم curl:

```
POST https://khawam-pro-production.up.railway.app/api/setup/init-users
```

**أو باستخدام PowerShell:**
```powershell
Invoke-WebRequest -Uri "https://khawam-pro-production.up.railway.app/api/setup/init-users" -Method POST
```

**أو باستخدام curl:**
```bash
curl -X POST "https://khawam-pro-production.up.railway.app/api/setup/init-users"
```

## التحقق من الحسابات

### 1. عرض جميع المستخدمين:
```
GET https://khawam-pro-production.up.railway.app/api/setup/list-all-users
```

### 2. التحقق من مستخدم محدد:
```
GET https://khawam-pro-production.up.railway.app/api/setup/check-user/0966320114
GET https://khawam-pro-production.up.railway.app/api/setup/check-user/customer@gmail.com
```

## الحسابات الافتراضية التي سيتم إنشاؤها:

### المديرون:
1. **Phone:** `0966320114` → يُحفظ كـ `+96366320114`
   - **Password:** `admin123`
   
2. **Phone:** `+963955773227`
   - **Password:** `khawam-p`

### الموظفون:
1. **Email:** `khawam-1@gmail.com` / **Password:** `khawam-1`
2. **Email:** `khawam-2@gmail.com` / **Password:** `khawam-2`
3. **Email:** `khawam-3@gmail.com` / **Password:** `khawam-3`

### العميل:
- **Email:** `customer@gmail.com` / **Password:** `963214`

## ملاحظات مهمة:

1. ✅ يمكن تشغيل endpoint التهيئة عدة مرات - لن يُنشئ حسابات مكررة
2. ✅ الرقم `0966320114` يُطبّع تلقائياً إلى `+96366320114` في قاعدة البيانات
3. ✅ عند تسجيل الدخول، يمكنك استخدام أي من الصيغ:
   - `0966320114` ✅
   - `+96366320114` ✅
   - `66320114` (سيتم إضافة +963 تلقائياً) ✅

## طريقة استخدام endpoint التهيئة من المتصفح:

يمكنك استخدام أداة مثل Postman أو حتى المتصفح مع JavaScript:

```javascript
// في console المتصفح
fetch('https://khawam-pro-production.up.railway.app/api/setup/init-users', {
  method: 'POST'
})
.then(r => r.json())
.then(console.log)
```
