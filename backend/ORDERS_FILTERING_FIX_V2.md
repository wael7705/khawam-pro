# إصلاح فلترة الطلبات - الإصدار 2

## المشكلة
1. **للمدير**: في صفحة "طلباتي" كانت تظهر جميع الطلبات وليست مرتبطة بـ customer_id
2. **للمستخدمين العاديين والموظفين**: كان يعطي رسالة خطأ

## الحل
تم إضافة query parameter `my_orders` إلى endpoint `/api/orders/`:
- إذا كان `my_orders=True`: يتم فلترة الطلبات بناءً على `customer_id` حتى للمديرين والموظفين (لصفحة "طلباتي")
- إذا كان `my_orders=False`: يعرض جميع الطلبات للمديرين والموظفين (للوحة التحكم)

## التغييرات

### 1. Backend (`backend/routers/orders.py`)

#### إضافة Query Parameter
```python
@router.get("/")
async def get_orders(
    my_orders: bool = Query(False, description="إذا كان True، نفلتر بناءً على customer_id حتى للمديرين"),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
```

#### تعديل منطق المديرين والموظفين
```python
elif user_role in ("مدير", "موظف"):
    if my_orders:
        # فلترة بناءً على customer_id - نفس منطق العملاء
        where_clause = "customer_id = :customer_id"
        params['customer_id'] = current_user.id
    else:
        # جلب جميع الطلبات (للوحة التحكم)
        # ... جلب جميع الطلبات
```

### 2. Frontend (`frontend/src/lib/api.ts`)

#### تحديث ordersAPI
```typescript
export const ordersAPI = {
  getAll: (myOrders: boolean = true) => api.get('/orders/', { params: { my_orders: myOrders } }),
  // ...
}
```

**ملاحظة**: القيمة الافتراضية هي `true` لأن صفحة "طلباتي" (`Orders.tsx`) تستخدم هذا API.

## النتيجة

### للمستخدمين العاديين (عميل):
- ✅ تظهر فقط الطلبات التي لها `customer_id = user.id`

### للمديرين والموظفين:
- ✅ في صفحة "طلباتي": تظهر فقط الطلبات التي لها `customer_id = user.id` (بسبب `my_orders=true`)
- ✅ في لوحة التحكم: تظهر جميع الطلبات (بسبب استخدام `/api/admin/orders/all`)

## كيفية الاختبار

### 1. اختبار صفحة "طلباتي" (`/orders`)

1. سجل دخول كمستخدم عادي (id = 2)
2. اذهب إلى `/orders`
3. يجب أن تظهر فقط الطلبات التي لها `customer_id = 2`

4. سجل دخول كمستخدم آخر (id = 3)
5. اذهب إلى `/orders`
6. يجب أن تظهر طلبات مختلفة (الطلبات الخاصة بالمستخدم 3 فقط)

### 2. اختبار لوحة التحكم (`/dashboard/orders`)

1. سجل دخول كمدير
2. اذهب إلى `/dashboard/orders`
3. يجب أن تظهر جميع الطلبات (لأنها تستخدم `/api/admin/orders/all`)

### 3. اختبار API مباشرة

```bash
# جلب طلبات المستخدم الحالي (my_orders=true)
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "https://your-api.com/api/orders/?my_orders=true"

# جلب جميع الطلبات للمدير (my_orders=false)
curl -H "Authorization: Bearer ADMIN_TOKEN" \
  "https://your-api.com/api/orders/?my_orders=false"
```

## الملفات المعدلة

1. `backend/routers/orders.py`:
   - إضافة `my_orders` query parameter
   - تعديل منطق المديرين والموظفين لاستخدام `my_orders`
   - إضافة import للـ `Query` من fastapi

2. `frontend/src/lib/api.ts`:
   - تحديث `ordersAPI.getAll()` لاستخدام `my_orders=true` كقيمة افتراضية

## ملاحظات مهمة

1. **صفحة "طلباتي"** (`Orders.tsx`) تستخدم `ordersAPI.getAll()` الذي يستدعي `/api/orders/?my_orders=true` تلقائياً
2. **لوحة التحكم** (`OrdersManagement.tsx`) تستخدم `adminAPI.orders.getAll()` الذي يستدعي `/api/admin/orders/all` (endpoint منفصل)
3. القيمة الافتراضية لـ `my_orders` في API هي `true` لضمان الفلترة الصحيحة في صفحة "طلباتي"

## التحقق من الإصلاح

بعد تطبيق التغييرات، تأكد من:

1. ✅ صفحة "طلباتي" تظهر فقط طلبات المستخدم الحالي (حتى للمديرين)
2. ✅ لوحة التحكم تظهر جميع الطلبات للمديرين والموظفين
3. ✅ لا توجد رسائل خطأ للمستخدمين العاديين أو الموظفين
4. ✅ الطلبات مربوطة بشكل صحيح بـ `customer_id`

