# إصلاح مشكلة عدم ظهور صورة Services

## المشكلة

الصورة `/khawam_services.png` لا تُحمّل في production.

## التحليل

1. **الصورة موجودة** في `frontend/public/khawam_services.png`
2. **في Vite:** ملفات `public/` تُنسخ إلى `dist/` root
3. **في Docker:** `dist/` تُنسخ إلى `/app/static` في backend
4. **المشكلة:** قد تكون الصورة لا تُنسخ بشكل صحيح أو المسار خاطئ

## الحلول المطبقة

### 1. تحسين معالجة تحميل الصورة
- إضافة retry logic مع عدة محاولات
- تحسين error handling
- إضافة console logs للتشخيص

### 2. التحقق من المسار
- المسار الصحيح: `/khawam_services.png` (من root)
- في Vite dev: من `public/`
- في production: من `dist/` root

## خطوات التحقق

### 1. تحقق من وجود الصورة في dist
```bash
cd frontend
npm run build
ls -la dist/khawam_services.png
```

### 2. تحقق من وجود الصورة في Docker
```bash
# في Railway logs أو Docker container
ls -la /app/static/khawam_services.png
```

### 3. تحقق من Network tab
- افتح Developer Tools → Network
- ابحث عن `khawam_services.png`
- تحقق من Status Code (يجب أن يكون 200)
- تحقق من Request URL

## حلول إضافية محتملة

### إذا لم تعمل الصورة:

1. **استخدام import للصورة:**
```typescript
import servicesImage from '/khawam_services.png'
// ثم استخدم servicesImage في src
```

2. **التحقق من vite.config.ts:**
```typescript
publicDir: 'public', // يجب أن يكون موجود
```

3. **التحقق من Dockerfile:**
```dockerfile
COPY --from=frontend-builder /frontend/dist /app/static
```

## النتيجة المتوقعة

- ✅ الصورة تظهر في development
- ✅ الصورة تظهر في production
- ✅ Console logs تساعد في التشخيص
- ✅ Placeholder يظهر إذا فشل التحميل

