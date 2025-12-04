# 📚 دليل نظام الأرشيف والتخزين اليومي
# Archive System and Daily Storage Documentation

## 📋 نظرة عامة

نظام الأرشيف هو نظام تلقائي لإدارة الطلبات المكتملة وتخزينها بشكل يومي. النظام يقوم تلقائياً بنقل الطلبات المكتملة والمدفوعة إلى الأرشيف، وإنشاء أرشيف منفصل لكل يوم.

---

## 🎯 الميزات الرئيسية

### 1. **الأرشيف التلقائي**
- ✅ الطلبات المكتملة (`status = 'delivered'` و `is_paid = true`) تنتقل تلقائياً للأرشيف
- ✅ الطلبات الملغية (`status = 'cancelled'`) تنتقل أيضاً للأرشيف
- ✅ الطلبات النشطة لا تظهر في الأرشيف

### 2. **التخزين اليومي**
- ✅ كل يوم يتم إنشاء أرشيف جديد تلقائياً
- ✅ الطلبات مرتبة حسب التاريخ
- ✅ يمكن عرض الأرشيف اليومي أو الأيام السابقة

### 3. **التقارير المالية**
- ✅ حساب إجمالي المبيعات لكل يوم
- ✅ حساب إجمالي المصروفات لكل يوم
- ✅ حساب صافي الربح (المبيعات - المصروفات)
- ✅ إحصائيات مفصلة لكل يوم

### 4. **التصدير**
- ✅ تصدير الأرشيف إلى Excel
- ✅ تصدير التقارير المالية
- ✅ حفظ البيانات للرجوع إليها لاحقاً

---

## 🔄 آلية العمل

### 1. **نقل الطلبات إلى الأرشيف**

#### في Backend (`backend/app/routes/orders.py`):

```python
@router.patch("/{order_id}/status", response_model=schemas.Order)
def update_order_status(order_id: int, status: str, db: Session = Depends(get_db)):
    # ... التحقق من الطلب ...
    
    # تعيين الحالة
    db_order.status = order_status
    
    # إذا تم تحديث الحالة إلى 'delivered'، قم بتحديث is_paid تلقائياً
    if order_status == models.OrderStatus.delivered:
        db_order.is_paid = True
        print(f"✅ تم تحديث الطلب {order_id} إلى delivered و is_paid=True")
    
    db.commit()
    db.refresh(db_order)
    return db_order
```

#### في Frontend (`frontend/src/pages/CashierInterface.tsx`):

```typescript
const handlePayment = async () => {
  if (!selectedOrder) return;

  const orderId = selectedOrder.id;
  const orderNumber = selectedOrder.order_number;

  try {
    // تحديث الحالة إلى مكتمل (سيضبط is_paid تلقائياً في الـ API)
    await apiService.updateOrderStatus(orderId, 'delivered');
    
    // إزالة الطلب من قائمة الطلبات المعروضة محلياً فوراً
    queryClient.setQueryData(['orders', 'cashier', showArchived], (oldOrders: Order[] | undefined) => {
      if (!oldOrders) return [];
      return oldOrders.filter(order => order.id !== orderId);
    });

    // تحديث جميع queries المتعلقة بالطلبات والأرشيف
    await queryClient.invalidateQueries({ queryKey: ['orders'] });
    await queryClient.invalidateQueries({ queryKey: ['archive'] });
    
    // إغلاق النافذة
    setSelectedOrder(null);
    
    console.log(`✅ تم إزالة الطلب ${orderNumber} من الكاشير - يظهر الآن في الأرشيف فقط`);
  } catch (error) {
    console.error('خطأ في معالجة الدفع:', error);
  }
};
```

### 2. **فلترة الطلبات**

#### في Backend:

```python
# الطلبات المكتملة والمدفوعة تعتبر مؤرشفة
is_archived = order.status == 'delivered' and order.is_paid == True
```

#### في Frontend (`frontend/src/pages/CashierInterface.tsx`):

```typescript
const notArchived = ordersList.filter((order: Order) => {
  // التحقق من أن الطلب مكتمل ومدفوع
  const isArchived = order.status === 'delivered' && order.is_paid === true;
  const isCancelled = order.status === 'cancelled';

  // إذا كان showArchived = true، نعرض جميع الطلبات
  if (showArchived) {
    return true;
  }

  // استبعاد المكتملة والملغية
  return !isArchived && !isCancelled;
});
```

### 3. **عرض الأرشيف اليومي**

#### في Frontend (`frontend/src/pages/Archive.tsx`):

```typescript
// جلب بيانات اليوم الحالي
const { data: todayData } = useQuery({
  queryKey: ['archive', 'today'],
  queryFn: async () => {
    const orders = await apiService.getOrders();
    const today = new Date().toISOString().split('T')[0];
    const expenses = await apiService.getExpenses({
      start_date: today,
      end_date: today
    });
    
    // فلترة الطلبات المكتملة والمدفوعة لليوم
    const completedOrders = orders.filter((order: Order) => {
      const isCompleted = order.status === 'delivered' && order.is_paid === true;
      const orderDate = new Date(order.created_at).toISOString().split('T')[0];
      return isCompleted && orderDate === today;
    });
    
    // حساب الإجماليات
    const totalAmount = completedOrders.reduce((sum, order) => sum + (order.total_amount || 0), 0);
    const totalExpenses = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
    const netProfit = totalAmount - totalExpenses;
    
    return {
      date: today,
      orders: completedOrders,
      expenses,
      totalOrders: completedOrders.length,
      totalAmount,
      totalExpenses,
      netProfit
    };
  },
  refetchInterval: 5000 // تحديث كل 5 ثواني
});
```

### 4. **عرض الأرشيف التاريخي**

```typescript
// جلب بيانات الأيام السابقة
const { data: historicalData } = useQuery({
  queryKey: ['archive', 'historical', selectedDate],
  queryFn: async () => {
    const orders = await apiService.getOrders();
    const expenses = await apiService.getExpenses({
      start_date: selectedDate,
      end_date: selectedDate
    });
    
    // فلترة حسب التاريخ المحدد
    const dateOrders = orders.filter((order: Order) => {
      const orderDate = new Date(order.created_at).toISOString().split('T')[0];
      const isCompleted = order.status === 'delivered' && order.is_paid === true;
      return isCompleted && orderDate === selectedDate;
    });
    
    // حساب الإجماليات
    // ... (نفس منطق اليوم الحالي)
  }
});
```

---

## 📊 هيكل البيانات

### Order Model

```python
class Order(Base):
    __tablename__ = "orders"
    
    id = Column(Integer, primary_key=True)
    order_number = Column(String(20))
    status = Column(Enum(OrderStatus))  # pending, preparing, ready, delivered, cancelled
    is_paid = Column(Boolean, default=False)  # حالة الدفع
    total_amount = Column(Numeric(10, 2))
    created_at = Column(TIMESTAMP, server_default=func.now())
    # ... باقي الحقول
```

### شروط الأرشيف

الطلب يعتبر **مؤرشف** إذا:
- `status == 'delivered'` **و** `is_paid == True`

الطلب يعتبر **ملغى** إذا:
- `status == 'cancelled'`

---

## 🔧 التطبيق في مشروع جديد

### 1. **إعداد Backend**

#### أ. تحديث Order Model:

```python
# في models.py
class OrderStatus(str, enum.Enum):
    delivered = "delivered"
    cancelled = "cancelled"
    # ... باقي الحالات

class Order(Base):
    # ... الحقول الموجودة ...
    status = Column(Enum(OrderStatus))
    is_paid = Column(Boolean, default=False)
```

#### ب. تحديث Order Status Endpoint:

```python
@router.patch("/{order_id}/status", response_model=schemas.Order)
def update_order_status(order_id: int, status: str, db: Session = Depends(get_db)):
    db_order = db.query(models.Order).filter(models.Order.id == order_id).first()
    
    if not db_order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # تعيين الحالة
    db_order.status = models.OrderStatus(status)
    
    # إذا تم تحديث الحالة إلى 'delivered'، قم بتحديث is_paid تلقائياً
    if db_order.status == models.OrderStatus.delivered:
        db_order.is_paid = True
    
    db.commit()
    db.refresh(db_order)
    return db_order
```

#### ج. فلترة الطلبات في Get Orders:

```python
@router.get("/", response_model=List[schemas.Order])
def get_orders(
    show_archived: bool = False,  # معامل اختياري لعرض الأرشيف
    db: Session = Depends(get_db)
):
    query = db.query(models.Order)
    
    if not show_archived:
        # استبعاد الطلبات المؤرشفة
        query = query.filter(
            ~((models.Order.status == models.OrderStatus.delivered) & 
              (models.Order.is_paid == True))
        ).filter(
            models.Order.status != models.OrderStatus.cancelled
        )
    
    return query.all()
```

### 2. **إعداد Frontend**

#### أ. إنشاء Archive Page:

```typescript
// frontend/src/pages/Archive.tsx
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiService } from '../services/api';

const Archive = () => {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  
  // جلب بيانات اليوم
  const { data: todayData } = useQuery({
    queryKey: ['archive', 'today'],
    queryFn: async () => {
      const orders = await apiService.getOrders();
      const today = new Date().toISOString().split('T')[0];
      
      // فلترة الطلبات المكتملة لليوم
      const completedOrders = orders.filter((order: Order) => {
        const isCompleted = order.status === 'delivered' && order.is_paid === true;
        const orderDate = new Date(order.created_at).toISOString().split('T')[0];
        return isCompleted && orderDate === today;
      });
      
      return {
        date: today,
        orders: completedOrders,
        totalOrders: completedOrders.length,
        totalAmount: completedOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0)
      };
    },
    refetchInterval: 5000
  });
  
  // ... باقي الكود
};
```

#### ب. تحديث Cashier Interface:

```typescript
// في handlePayment
const handlePayment = async () => {
  await apiService.updateOrderStatus(orderId, 'delivered');
  
  // إزالة الطلب من القائمة
  queryClient.setQueryData(['orders', 'cashier'], (oldOrders) => {
    return oldOrders?.filter(order => order.id !== orderId) || [];
  });
  
  // تحديث الأرشيف
  queryClient.invalidateQueries({ queryKey: ['archive'] });
};
```

#### ج. فلترة الطلبات في Cashier:

```typescript
const { data: orders } = useQuery({
  queryKey: ['orders', 'cashier'],
  queryFn: async () => {
    const allOrders = await apiService.getOrders();
    
    // فلترة الطلبات المؤرشفة
    return allOrders.filter((order: Order) => {
      const isArchived = order.status === 'delivered' && order.is_paid === true;
      const isCancelled = order.status === 'cancelled';
      return !isArchived && !isCancelled;
    });
  },
  refetchInterval: 2000
});
```

### 3. **إعداد Routes**

```typescript
// في App.tsx أو router
<Route path="/archive" element={<Archive />} />
```

---

## 📅 التخزين اليومي

### آلية التخزين

1. **كل يوم تلقائياً:**
   - النظام يقوم بفلترة الطلبات حسب التاريخ
   - كل يوم له أرشيف منفصل
   - لا حاجة لإنشاء أرشيف يدوياً

2. **عرض الأرشيف:**
   - اليوم الحالي: يتم تحديثه تلقائياً كل 5 ثواني
   - الأيام السابقة: يتم جلبها عند اختيار التاريخ

3. **التقارير:**
   - إجمالي الطلبات لكل يوم
   - إجمالي المبيعات لكل يوم
   - إجمالي المصروفات لكل يوم
   - صافي الربح لكل يوم

---

## 🔍 استعلامات قاعدة البيانات

### جلب الطلبات المؤرشفة لليوم:

```sql
SELECT * FROM orders
WHERE status = 'delivered'
  AND is_paid = true
  AND DATE(created_at) = CURRENT_DATE;
```

### جلب الطلبات المؤرشفة لتاريخ محدد:

```sql
SELECT * FROM orders
WHERE status = 'delivered'
  AND is_paid = true
  AND DATE(created_at) = '2024-12-02';
```

### جلب إحصائيات اليوم:

```sql
SELECT 
  COUNT(*) as total_orders,
  SUM(total_amount) as total_revenue
FROM orders
WHERE status = 'delivered'
  AND is_paid = true
  AND DATE(created_at) = CURRENT_DATE;
```

---

## 📤 التصدير

### تصدير إلى Excel:

```typescript
const exportToExcel = (data: ArchiveData) => {
  const worksheet = XLSX.utils.json_to_sheet(
    data.orders.map(order => ({
      'رقم الطلب': order.order_number,
      'التاريخ': new Date(order.created_at).toLocaleDateString('ar-SY'),
      'المبلغ': order.total_amount,
      'طريقة الدفع': order.payment_method,
      'الحالة': order.status
    }))
  );
  
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'الأرشيف');
  XLSX.writeFile(workbook, `archive-${data.date}.xlsx`);
};
```

---

## ✅ Checklist للتطبيق

### Backend:
- [ ] تحديث Order Model لإضافة `is_paid`
- [ ] تحديث Order Status Enum
- [ ] تحديث `update_order_status` endpoint
- [ ] تحديث `get_orders` endpoint للفلترة
- [ ] إضافة endpoint للحصول على المصروفات (إن وجد)

### Frontend:
- [ ] إنشاء Archive Page
- [ ] تحديث Cashier Interface لفلترة الطلبات
- [ ] تحديث `handlePayment` لإزالة الطلب من القائمة
- [ ] إضافة route للأرشيف
- [ ] إضافة ميزة التصدير (اختياري)

### Database:
- [ ] التأكد من وجود `is_paid` column
- [ ] التأكد من وجود `status` column
- [ ] إضافة indexes إذا لزم الأمر

---

## 🎯 الخلاصة

نظام الأرشيف يعمل تلقائياً:
1. ✅ الطلبات المكتملة (`delivered` + `is_paid = true`) تنتقل للأرشيف تلقائياً
2. ✅ كل يوم له أرشيف منفصل
3. ✅ يمكن عرض الأرشيف اليومي أو الأيام السابقة
4. ✅ التقارير المالية محسوبة تلقائياً
5. ✅ يمكن تصدير البيانات

**لا حاجة لإنشاء أرشيف يدوياً - النظام يقوم بذلك تلقائياً!**

---

**تاريخ الإنشاء:** 2024-12-02  
**آخر تحديث:** 2024-12-02  
**الإصدار:** 1.0.0

