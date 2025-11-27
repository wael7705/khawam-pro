# إصلاح مشكلة 502 Bad Gateway

## المشاكل المحتملة والحلول

### 1. مشكلة في asyncio.create_task()

**المشكلة:**
- استخدام `asyncio.create_task()` مباشرة في lifespan قد لا يعمل بشكل صحيح
- قد يحتاج إلى event loop نشط

**الحل:**
- استخدام `loop.create_task()` بدلاً من `asyncio.create_task()`
- الحصول على event loop الحالي أولاً

### 2. مشكلة في Import Errors

**المشكلة:**
- إذا فشل import router، التطبيق قد لا يبدأ
- الأخطاء قد تكون مخفية

**الحل:**
- إضافة `traceback.print_exc()` لعرض الأخطاء الكاملة
- التأكد من أن جميع imports تعمل بشكل صحيح

### 3. مشكلة في WebSocket Router

**المشكلة:**
- notifications router مسجل بدون prefix صحيح
- WebSocket endpoint قد لا يكون متاحاً

**الحل:**
- ✅ تم إصلاحه: إضافة `prefix="/api"` للـ router
- ✅ WebSocket endpoint الآن: `/api/ws/orders`

## التحقق من الإصلاحات

1. ✅ إصلاح `asyncio.create_task()` في lifespan
2. ✅ إضافة traceback للأخطاء
3. ✅ إصلاح notifications router prefix

## الخطوات التالية

1. نشر التغييرات
2. مراقبة Railway logs
3. التحقق من أن التطبيق يبدأ بنجاح
4. اختبار WebSocket connection

---

**تاريخ الإصلاح**: 2024

