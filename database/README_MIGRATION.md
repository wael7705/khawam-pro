# Migration Guide - Analytics and Order Tracking

## نظرة عامة

تم إضافة جداول جديدة لنظام تتبع الزوار (Analytics) وتتبع حالة الطلبات:

1. **visitor_tracking** - تتبع الزوار والزيارات
2. **page_views** - تتبع مشاهدات الصفحات
3. **order_status_history** - تاريخ تغييرات حالة الطلب

## كيفية تشغيل Migration

### الطريقة 1: استخدام Python Script

```bash
cd database
python migration_analytics_and_orders.py
```

### الطريقة 2: تشغيل SQL مباشرة

يمكنك تشغيل الأوامر SQL التالية مباشرة على قاعدة البيانات:

```sql
-- إنشاء جدول visitor_tracking
CREATE TABLE IF NOT EXISTS visitor_tracking (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(255) NOT NULL,
    user_id INTEGER REFERENCES users(id),
    page_path VARCHAR(500) NOT NULL,
    referrer TEXT,
    user_agent TEXT,
    device_type VARCHAR(50),
    browser VARCHAR(100),
    os VARCHAR(100),
    ip_address VARCHAR(45),
    country VARCHAR(100),
    city VARCHAR(100),
    time_on_page INTEGER DEFAULT 0,
    exit_page BOOLEAN DEFAULT FALSE,
    entry_page BOOLEAN DEFAULT FALSE,
    visit_count INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- إنشاء indexes لـ visitor_tracking
CREATE INDEX IF NOT EXISTS idx_visitor_tracking_session_id ON visitor_tracking(session_id);
CREATE INDEX IF NOT EXISTS idx_visitor_tracking_user_id ON visitor_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_visitor_tracking_created_at ON visitor_tracking(created_at);

-- إنشاء جدول page_views
CREATE TABLE IF NOT EXISTS page_views (
    id SERIAL PRIMARY KEY,
    visitor_id INTEGER REFERENCES visitor_tracking(id),
    session_id VARCHAR(255) NOT NULL,
    page_path VARCHAR(500) NOT NULL,
    time_spent INTEGER DEFAULT 0,
    scroll_depth INTEGER DEFAULT 0,
    actions JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- إنشاء indexes لـ page_views
CREATE INDEX IF NOT EXISTS idx_page_views_visitor_id ON page_views(visitor_id);
CREATE INDEX IF NOT EXISTS idx_page_views_session_id ON page_views(session_id);
CREATE INDEX IF NOT EXISTS idx_page_views_page_path ON page_views(page_path);
CREATE INDEX IF NOT EXISTS idx_page_views_created_at ON page_views(created_at);

-- إنشاء جدول order_status_history
CREATE TABLE IF NOT EXISTS order_status_history (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id),
    status VARCHAR(20) NOT NULL,
    changed_by INTEGER REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- إنشاء indexes لـ order_status_history
CREATE INDEX IF NOT EXISTS idx_order_status_history_order_id ON order_status_history(order_id);
CREATE INDEX IF NOT EXISTS idx_order_status_history_created_at ON order_status_history(created_at);

-- نقل الطلبات الموجودة إلى order_status_history
INSERT INTO order_status_history (order_id, status, created_at)
SELECT id, status, created_at
FROM orders
WHERE NOT EXISTS (
    SELECT 1 FROM order_status_history 
    WHERE order_status_history.order_id = orders.id
);
```

## التحقق من Migration

بعد تشغيل Migration، يمكنك التحقق من إنشاء الجداول:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('visitor_tracking', 'page_views', 'order_status_history');
```

يجب أن ترى 3 جداول في النتيجة.

## ملاحظات

- Migration آمنة - يمكن تشغيلها عدة مرات دون مشاكل (IF NOT EXISTS)
- البيانات الموجودة في orders سيتم نقلها تلقائياً إلى order_status_history
- لا يوجد فقدان للبيانات - جميع البيانات محفوظة

