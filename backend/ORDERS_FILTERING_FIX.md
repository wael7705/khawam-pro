# إصلاح فلترة الطلبات بناءً على customer_id

## المشكلة
كانت الطلبات في قسم "طلباتي" تظهر لجميع المستخدمين بناءً على رقم الهاتف (`customer_phone`) بدلاً من `customer_id`. هذا يعني أن المستخدمين الذين لديهم نفس رقم الهاتف كانوا يرون طلبات بعضهم البعض.

## الحل
تم تعديل الكود في `backend/routers/orders.py` لاستخدام `customer_id` فقط عند فلترة الطلبات للعملاء.

## التغييرات

### 1. فلترة الطلبات للعملاء (السطر 1105-1140)

**قبل:**
```python
# كان يستخدم OR بين customer_id و customer_phone
where_conditions.append("customer_id = :customer_id")
where_conditions.append(f"customer_phone IN ({phone_placeholders})")
where_clause = " OR ".join([f"({cond})" for cond in where_conditions])
```

**بعد:**
```python
# الآن يستخدم customer_id فقط
if current_user and current_user.id:
    where_clause = "customer_id = :customer_id"
    params['customer_id'] = current_user.id
    params['limit'] = 100
```

### 2. إزالة البحث النصي بناءً على رقم الهاتف
تم إزالة الكود الذي كان يبحث عن الطلبات بناءً على رقم الهاتف كحل بديل، لأنه قد يعرض طلبات مستخدمين آخرين.

### 3. تحديث منطق "unknown role"
تم تحديث الكود للتعامل مع المستخدمين ذوي الدور غير المعروف لاستخدام `customer_id` فقط.

## النتيجة

الآن عندما يسجل المستخدم دخوله (مثلاً id = 2)، ستظهر فقط الطلبات التي لها `customer_id = 2` في قسم "طلباتي".

## كيفية الاختبار

### 1. اختبار يدوي من الواجهة

1. سجل دخول كمستخدم (مثلاً id = 2)
2. اذهب إلى قسم "طلباتي"
3. يجب أن تظهر فقط الطلبات التي تخص هذا المستخدم
4. سجل دخول كمستخدم آخر (مثلاً id = 3)
5. يجب أن تظهر طلبات مختلفة (الطلبات الخاصة بالمستخدم 3 فقط)

### 2. اختبار من قاعدة البيانات

قم بتشغيل الاستعلام التالي للتحقق من أن الطلبات مربوطة بشكل صحيح:

```sql
-- التحقق من الطلبات للمستخدم ID = 2
SELECT id, order_number, customer_id, customer_name, customer_phone, status, created_at
FROM orders
WHERE customer_id = 2
ORDER BY created_at DESC;

-- التحقق من أن الطلبات الأخرى لا تظهر
SELECT COUNT(*) as other_orders_count
FROM orders
WHERE customer_id IS NOT NULL AND customer_id != 2;
```

### 3. اختبار إنشاء طلب جديد

1. سجل دخول كمستخدم
2. أنشئ طلب جديد
3. تحقق من قاعدة البيانات أن الطلب مربوط بـ `customer_id` الصحيح:

```sql
SELECT id, order_number, customer_id, customer_name
FROM orders
WHERE order_number = 'ORD...'  -- استبدل برقم الطلب الجديد
```

يجب أن يكون `customer_id` مساوياً لـ id المستخدم الذي أنشأ الطلب.

## الملفات المعدلة

- `backend/routers/orders.py`: تم تعديل دالة `get_orders()` لاستخدام `customer_id` فقط

## ملاحظات

- الكود في `create_order()` كان يربط الطلبات بـ `customer_id` بشكل صحيح بالفعل (السطر 734-738)
- الطلبات القديمة التي لا تحتوي على `customer_id` لن تظهر لأي مستخدم عند استخدام هذا الفلتر
- إذا كنت تريد ربط الطلبات القديمة بـ `customer_id`، يمكنك استخدام استعلام SQL:

```sql
-- مثال: ربط الطلبات القديمة بناءً على رقم الهاتف
UPDATE orders o
SET customer_id = u.id
FROM users u
WHERE o.customer_phone = u.phone
AND o.customer_id IS NULL;
```

## التحقق من الإصلاح

بعد تطبيق التغييرات، تأكد من:

1. ✅ الطلبات تظهر فقط للمستخدم الذي يملكها
2. ✅ الطلبات الجديدة مربوطة بـ `customer_id` بشكل صحيح
3. ✅ المستخدمون المختلفون لا يرون طلبات بعضهم البعض
4. ✅ المديرون والموظفون ما زالوا يرون جميع الطلبات (لم يتغير)


