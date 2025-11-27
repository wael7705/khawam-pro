# دليل استكشاف أخطاء نظام الإشعارات

## المشاكل المحتملة والحلول

### 1. WebSocket لا يتصل

**الأعراض:**
- `isConnected` يبقى `false`
- لا تظهر رسائل "WebSocket connected" في console

**التحقق:**
1. افتح Developer Tools → Console
2. ابحث عن رسائل:
   - `🔌 Connecting to WebSocket...`
   - `✅ WebSocket connected` أو `❌ WebSocket error`

**الأسباب المحتملة:**
- ❌ Token غير صالح أو منتهي الصلاحية
- ❌ المستخدم ليس موظفاً أو مديراً
- ❌ WebSocket URL خاطئ
- ❌ CORS blocking WebSocket
- ❌ Backend لا يدعم WebSocket

**الحل:**
1. تحقق من Token في localStorage:
```javascript
console.log(localStorage.getItem('auth_token'))
```

2. تحقق من WebSocket URL في console
3. تحقق من Backend logs لرؤية محاولات الاتصال

### 2. WebSocket يتصل لكن لا يستقبل إشعارات

**الأعراض:**
- `isConnected` = `true`
- لكن لا تظهر إشعارات عند إنشاء طلب جديد

**التحقق:**
1. افتح Backend logs
2. ابحث عن: `📡 Broadcasting to X WebSocket connection(s)`
3. تحقق من أن `order_notifications.broadcast()` يتم استدعاؤه

**الأسباب المحتملة:**
- ❌ لا يوجد اتصالات WebSocket نشطة
- ❌ `broadcast()` يفشل بصمت
- ❌ الرسالة لا تصل للعميل

**الحل:**
1. تحقق من عدد الاتصالات في Backend logs
2. أضف logging في `broadcast()` function
3. تحقق من أن الرسالة تصل للعميل في `ws.onmessage`

### 3. الإشعارات تظهر لكن بدون صوت

**الأعراض:**
- إشعارات المتصفح تظهر
- لكن لا صوت تنبيه

**التحقق:**
1. تحقق من `enableSoundNotifications` = `true`
2. تحقق من console للأخطاء

**الأسباب المحتملة:**
- ❌ Web Audio API غير مدعوم
- ❌ المتصفح يحظر الأصوات
- ❌ خطأ في `playNotificationSound()`

**الحل:**
1. تحقق من console للأخطاء
2. جرب متصفح آخر
3. تحقق من إعدادات المتصفح للأصوات

### 4. الإشعارات المكررة

**الأعراض:**
- نفس الطلب يظهر عدة مرات

**التحقق:**
1. تحقق من `knownOrderIdsRef`
2. تحقق من `tag` في إشعارات المتصفح

**الحل:**
- ✅ النظام يستخدم `knownOrderIdsRef` لمنع التكرار
- ✅ إشعارات المتصفح تستخدم `tag` لمنع التكرار

### 5. WebSocket ينقطع باستمرار

**الأعراض:**
- `isConnected` يتغير بين `true` و `false`
- رسائل "Reconnecting" متكررة

**الأسباب المحتملة:**
- ❌ Network issues
- ❌ Backend restart
- ❌ Timeout

**الحل:**
- ✅ النظام يعيد الاتصال تلقائياً كل 3 ثوان
- ✅ تحقق من Backend stability

## كيفية الاختبار

### 1. اختبار WebSocket Connection

```javascript
// في Browser Console
const ws = new WebSocket('wss://www.khawam.net/api/ws/orders?token=YOUR_TOKEN')
ws.onopen = () => console.log('✅ Connected')
ws.onmessage = (e) => console.log('📨 Message:', e.data)
ws.onerror = (e) => console.error('❌ Error:', e)
ws.onclose = (e) => console.log('⚠️ Closed:', e.code, e.reason)
```

### 2. اختبار Broadcast من Backend

```python
# في Python console
from notifications import order_notifications
await order_notifications.broadcast({
    "event": "order_created",
    "data": {
        "order_id": 999,
        "order_number": "TEST-001",
        "customer_name": "Test",
        "customer_phone": "09991234567",
        "total_amount": 100,
        "final_amount": 100,
        "delivery_type": "self",
        "items_count": 1,
        "created_at": "2024-01-01T00:00:00"
    }
})
```

### 3. مراقبة Logs

**Backend:**
- `🔍 WebSocket connection attempt`
- `✅ WebSocket: Connection established`
- `📡 Broadcasting to X connections`
- `✅ Successfully broadcasted`

**Frontend:**
- `🔌 Connecting to WebSocket...`
- `✅ WebSocket connected`
- `📨 WebSocket message received`
- `✅ New order notification`

## الإصلاحات المطبقة

1. ✅ إضافة prefix `/api` لـ notifications router
2. ✅ تحسين WebSocket URL بناء في Frontend
3. ✅ إضافة logging أفضل في Backend
4. ✅ تحسين معالجة الأخطاء في Frontend
5. ✅ إضافة معالجة ping/pong messages

## الخطوات التالية للاختبار

1. نشر التغييرات
2. فتح لوحة التحكم
3. فتح Developer Tools → Console
4. إنشاء طلب جديد
5. مراقبة Logs في Backend و Frontend

---

**تاريخ الإنشاء**: 2024  
**الحالة**: ✅ جاهز للاختبار

