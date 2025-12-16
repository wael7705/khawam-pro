from sqlalchemy import Column, Integer, String, Text, Boolean, DECIMAL, TIMESTAMP, Date, ForeignKey, ARRAY, JSON
from sqlalchemy.sql import func
from database import Base

class UserType(Base):
    __tablename__ = "user_types"
    
    id = Column(Integer, primary_key=True, index=True)
    type_name = Column(String(50), nullable=False, unique=True)
    description = Column(Text, nullable=True)
    name_ar = Column(Text, nullable=True)  # الاسم العربي (مدير، موظف، عميل)
    permissions = Column(JSON, nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now(), nullable=True)

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    phone = Column(String(20), nullable=True)  # يمكن أن يكون NULL إذا سجل بالبريد الإلكتروني
    name = Column(String(100), nullable=False)
    email = Column(String(100), nullable=True)  # يمكن أن يكون NULL إذا سجل بالهاتف
    password_hash = Column(String(255), nullable=False)
    user_type_id = Column(Integer, ForeignKey("user_types.id"), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(TIMESTAMP, server_default=func.now())
    
    # Unique constraint on phone or email (at least one must be provided)
    # We'll handle this at application level since SQL doesn't support conditional unique constraints well

class ProductCategory(Base):
    __tablename__ = "product_categories"
    
    id = Column(Integer, primary_key=True, index=True)
    name_ar = Column(String(100), nullable=False)
    name_en = Column(String(100))
    description_ar = Column(Text)
    description_en = Column(Text)
    is_active = Column(Boolean, default=True)
    display_order = Column(Integer, default=0)
    created_at = Column(TIMESTAMP, server_default=func.now())

class Product(Base):
    __tablename__ = "products"
    
    id = Column(Integer, primary_key=True, index=True)
    name_ar = Column(String(100), nullable=False)
    name = Column(String(100))
    description_ar = Column(Text)
    description = Column(Text)
    category_id = Column(Integer, ForeignKey("product_categories.id"))
    price = Column(DECIMAL(10, 2))
    base_price = Column(DECIMAL(10, 2))
    image_url = Column(Text)
    images = Column(ARRAY(Text))
    is_active = Column(Boolean, default=True)
    is_visible = Column(Boolean, default=True)
    is_featured = Column(Boolean, default=False)
    display_order = Column(Integer, default=0)
    created_at = Column(TIMESTAMP, server_default=func.now())

class Service(Base):
    __tablename__ = "services"
    
    id = Column(Integer, primary_key=True, index=True)
    name_ar = Column(String(200), nullable=False)
    name_en = Column(String(200), nullable=False)
    description_ar = Column(Text)
    description_en = Column(Text)
    icon = Column(String(50))
    image_url = Column(Text)
    base_price = Column(DECIMAL(10, 2), default=0)
    is_active = Column(Boolean, default=True)
    is_visible = Column(Boolean, default=True)
    display_order = Column(Integer, default=0)
    features = Column(JSON)
    created_at = Column(TIMESTAMP, server_default=func.now())

class PortfolioWork(Base):
    __tablename__ = "portfolio_works"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)  # العنوان الإنجليزي - العمود الفعلي في DB
    title_ar = Column(String(200), nullable=False)  # العنوان العربي
    description = Column(Text)  # الوصف الإنجليزي - العمود الفعلي في DB
    description_ar = Column(Text)  # الوصف العربي
    image_url = Column(Text, nullable=False)  # الصورة الأساسية
    images = Column(ARRAY(Text), nullable=True, default=[])  # الصور الثانوية/المرافقة
    category = Column(String(100))  # الفئة الإنجليزية - العمود الفعلي في DB
    category_ar = Column(String(100))  # الفئة العربية
    is_featured = Column(Boolean, default=False)
    is_visible = Column(Boolean, default=True)
    display_order = Column(Integer, default=0)
    created_at = Column(TIMESTAMP, server_default=func.now())

class PaymentSettings(Base):
    __tablename__ = "payment_settings"
    
    id = Column(Integer, primary_key=True, index=True)
    payment_method = Column(String(50), default="sham_cash")  # sham_cash, etc.
    account_name = Column(String(200))  # اسم الحساب
    account_number = Column(String(100))  # رقم الحساب
    phone_number = Column(String(20))  # رقم الهاتف المرتبط بالحساب
    api_key = Column(String(255))  # مفتاح API إذا لزم الأمر
    api_secret = Column(String(255))  # سر API إذا لزم الأمر
    is_active = Column(Boolean, default=True)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

class Order(Base):
    __tablename__ = "orders"
    
    id = Column(Integer, primary_key=True, index=True)
    order_number = Column(String(20), unique=True)
    customer_id = Column(Integer, ForeignKey("users.id"))
    customer_name = Column(String(100))  # اسم العميل
    customer_phone = Column(String(20))  # رقم العميل
    customer_whatsapp = Column(String(20))  # رقم واتساب
    shop_name = Column(String(200))  # اسم المتجر
    status = Column(String(20), default="pending")  # pending, accepted, preparing, shipping, awaiting_pickup, completed, cancelled, rejected
    total_amount = Column(DECIMAL(12, 2), nullable=False)  # المبلغ الأصلي
    final_amount = Column(DECIMAL(12, 2), nullable=False)  # المبلغ النهائي بعد الخصومات
    # نظام التقسيط - قد لا تكون موجودة في قاعدة البيانات
    paid_amount = Column(DECIMAL(12, 2), default=0, nullable=True)  # المبلغ المدفوع
    remaining_amount = Column(DECIMAL(12, 2), default=0, nullable=True)  # المبلغ المتبقي
    payment_method = Column(String(50), default="sham_cash")  # طريقة الدفع
    payment_status = Column(String(20), default="pending")  # pending, partial, paid, refunded
    delivery_type = Column(String(20), default="self")  # self or delivery
    delivery_address = Column(Text)
    delivery_latitude = Column(DECIMAL(10, 8))  # خط العرض
    delivery_longitude = Column(DECIMAL(11, 8))  # خط الطول
    delivery_date = Column(Date, nullable=True)  # تاريخ التسليم
    completed_at = Column(TIMESTAMP, nullable=True)  # تاريخ الإكمال
    notes = Column(Text)  # ملاحظات العميل
    staff_notes = Column(Text)  # ملاحظات الموظف
    rating = Column(Integer)  # التقييم (1-5 نجوم)
    rating_comment = Column(Text)  # تعليق التقييم
    created_at = Column(TIMESTAMP, server_default=func.now())

class OrderItem(Base):
    __tablename__ = "order_items"
    
    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"))
    product_id = Column(Integer, ForeignKey("products.id"))
    product_name = Column(String(100))
    quantity = Column(Integer)
    unit_price = Column(DECIMAL(10, 2))
    total_price = Column(DECIMAL(12, 2))
    size_id = Column(Integer)
    material_id = Column(Integer)
    specifications = Column(JSON)
    design_files = Column(ARRAY(Text))
    production_notes = Column(Text)
    status = Column(String(20), default="pending")
    created_at = Column(TIMESTAMP, server_default=func.now())

class PricingCategory(Base):
    """فئات التسعير الرئيسية (مثل: الطباعة على ورق)"""
    __tablename__ = "pricing_categories"
    
    id = Column(Integer, primary_key=True, index=True)
    name_ar = Column(String(200), nullable=False)  # اسم الفئة
    name_en = Column(String(200))
    description_ar = Column(Text)
    description_en = Column(Text)
    icon = Column(String(50))  # أيقونة الفئة
    is_active = Column(Boolean, default=True)
    display_order = Column(Integer, default=0)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

class PricingConfig(Base):
    """إعدادات التسعير الهرمية مع الأسعار"""
    __tablename__ = "pricing_configs"
    
    id = Column(Integer, primary_key=True, index=True)
    category_id = Column(Integer, ForeignKey("pricing_categories.id"), nullable=False)
    
    # القياس (A1, A2, A3, A4, A5, B1, B2, B3, B4, B5)
    paper_size = Column(String(10), nullable=False)  # A4, A3, etc.
    
    # نوع الورق (اختياري - يمكن أن يكون null إذا كان ينطبق على جميع الأنواع)
    paper_type = Column(String(50), nullable=True)  # normal, glossy, etc.
    
    # نوع الطباعة
    print_type = Column(String(20), nullable=False)  # "bw" (أبيض وأسود) أو "color" (ملون)
    
    # نوع الدقة (للملون فقط)
    quality_type = Column(String(20), nullable=True)  # "standard" (عادية) أو "laser" (ليزرية/عالية)
    
    # السعر لكل صفحة
    price_per_page = Column(DECIMAL(10, 4), nullable=False)
    
    # الوحدة
    unit = Column(String(50), default="صفحة")
    
    # حالة التفعيل
    is_active = Column(Boolean, default=True)
    
    # ترتيب العرض
    display_order = Column(Integer, default=0)
    
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

class ServiceWorkflow(Base):
    """مراحل الطلب لكل خدمة - خوارزميات مختلفة لكل خدمة"""
    __tablename__ = "service_workflows"
    
    id = Column(Integer, primary_key=True, index=True)
    service_id = Column(Integer, ForeignKey("services.id"), nullable=False)
    
    # رقم المرحلة (1, 2, 3, 4, 5, ...)
    step_number = Column(Integer, nullable=False)
    
    # اسم المرحلة
    step_name_ar = Column(String(200), nullable=False)
    step_name_en = Column(String(200))
    
    # وصف المرحلة
    step_description_ar = Column(Text)
    step_description_en = Column(Text)
    
    # نوع المرحلة (مثل: dimensions, colors, files, quantity, pages, print_options, etc.)
    step_type = Column(String(50), nullable=False)  # dimensions, colors, files, quantity, pages, print_options, customer_info, delivery
    
    # إعدادات المرحلة (JSON) - يمكن أن تحتوي على حقول مطلوبة، خيارات، إلخ
    step_config = Column(JSON, nullable=True)  # مثل: {"fields": ["length", "width"], "required": true, "unit": "cm", "options": [...]}
    
    # ترتيب العرض
    display_order = Column(Integer, default=0)
    
    # حالة التفعيل
    is_active = Column(Boolean, default=True)
    
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

class HeroSlide(Base):
    """سلايدات Hero للصفحة الرئيسية"""
    __tablename__ = "hero_slides"
    
    id = Column(Integer, primary_key=True, index=True)
    image_url = Column(Text, nullable=False)  # رابط الصورة
    is_logo = Column(Boolean, default=False)  # هل هذه السلايدة هي اللوغو؟
    is_active = Column(Boolean, default=True)  # هل السلايدة نشطة؟
    display_order = Column(Integer, default=0)  # ترتيب العرض
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

class PricingRule(Base):
    """قواعد التسعير القديمة (للتوافق مع النظام القديم)"""
    __tablename__ = "pricing_rules"
    
    id = Column(Integer, primary_key=True, index=True)
    name_ar = Column(String(200), nullable=False)  # اسم قاعدة السعر
    name_en = Column(String(200))
    description_ar = Column(Text)  # وصف قاعدة السعر
    description_en = Column(Text)
    
    # نوع الحساب: "piece" (قطعة), "area" (متر مربع), "page" (صفحة)
    calculation_type = Column(String(20), nullable=False)  # piece, area, page
    
    # السعر الأساسي
    base_price = Column(DECIMAL(10, 4), nullable=False)  # السعر الأساسي
    
    # معاملات إضافية للسعر (JSON)
    # مثال: {"color": {"bw": 1.0, "color": 1.5}, "sides": {"single": 1.0, "double": 1.3}}
    price_multipliers = Column(JSON, nullable=True)
    
    # المواصفات (JSON)
    # مثال: {"paper_size": "A4", "paper_type": "normal", "color": true/false}
    specifications = Column(JSON, nullable=True)
    
    # الوحدة
    unit = Column(String(50), nullable=True)  # قطعة، متر مربع، صفحة
    
    # حالة التفعيل
    is_active = Column(Boolean, default=True)
    
    # ترتيب العرض
    display_order = Column(Integer, default=0)
    
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

class VisitorTracking(Base):
    """تتبع الزوار والزيارات"""
    __tablename__ = "visitor_tracking"
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(255), nullable=False, index=True)  # معرف الجلسة
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)  # المستخدم المسجل (إن وجد)
    page_path = Column(String(500), nullable=False)  # مسار الصفحة
    referrer = Column(Text, nullable=True)  # الصفحة المرجعية
    user_agent = Column(Text, nullable=True)  # معلومات المتصفح
    device_type = Column(String(50), nullable=True)  # desktop, mobile, tablet
    browser = Column(String(100), nullable=True)  # Chrome, Firefox, Safari, etc.
    os = Column(String(100), nullable=True)  # Windows, macOS, Linux, iOS, Android
    ip_address = Column(String(45), nullable=True)  # IPv4 or IPv6
    country = Column(String(100), nullable=True)
    city = Column(String(100), nullable=True)
    time_on_page = Column(Integer, default=0)  # الوقت على الصفحة بالثواني
    exit_page = Column(Boolean, default=False)  # هل هذه صفحة الخروج؟
    entry_page = Column(Boolean, default=False)  # هل هذه صفحة الدخول؟
    visit_count = Column(Integer, default=1)  # عدد الزيارات لهذا المستخدم
    created_at = Column(TIMESTAMP, server_default=func.now(), index=True)
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

class PageView(Base):
    """تتبع مشاهدات الصفحات"""
    __tablename__ = "page_views"
    
    id = Column(Integer, primary_key=True, index=True)
    visitor_id = Column(Integer, ForeignKey("visitor_tracking.id"), nullable=True, index=True)
    session_id = Column(String(255), nullable=False, index=True)  # معرف الجلسة
    page_path = Column(String(500), nullable=False, index=True)  # مسار الصفحة
    time_spent = Column(Integer, default=0)  # الوقت على الصفحة بالثواني
    scroll_depth = Column(Integer, default=0)  # عمق التمرير (0-100)
    actions = Column(JSON, nullable=True)  # الأحداث (clicks, form submissions, etc.)
    created_at = Column(TIMESTAMP, server_default=func.now(), index=True)

class OrderStatusHistory(Base):
    """تاريخ تغييرات حالة الطلب"""
    __tablename__ = "order_status_history"
    
    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False, index=True)
    status = Column(String(20), nullable=False)  # الحالة الجديدة
    changed_by = Column(Integer, ForeignKey("users.id"), nullable=True)  # المستخدم الذي غيّر الحالة
    notes = Column(Text, nullable=True)  # ملاحظات التغيير
    created_at = Column(TIMESTAMP, server_default=func.now(), index=True)