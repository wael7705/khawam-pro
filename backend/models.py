from sqlalchemy import Column, Integer, String, Text, Boolean, DECIMAL, TIMESTAMP, ForeignKey, ARRAY, JSON
from sqlalchemy.sql import func
from database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    phone = Column(String(20), unique=True, nullable=False)
    name = Column(String(100), nullable=False)
    email = Column(String(100))
    password_hash = Column(String(255))
    user_type_id = Column(Integer, ForeignKey("user_types.id"))
    is_active = Column(Boolean, default=True)
    created_at = Column(TIMESTAMP, server_default=func.now())

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
    total_amount = Column(DECIMAL(12, 2), nullable=False)
    final_amount = Column(DECIMAL(12, 2), nullable=False)
    payment_status = Column(String(20), default="pending")
    delivery_type = Column(String(20), default="self")  # self or delivery
    delivery_address = Column(Text)
    delivery_latitude = Column(DECIMAL(10, 8))  # خط العرض
    delivery_longitude = Column(DECIMAL(11, 8))  # خط الطول
    notes = Column(Text)  # ملاحظات العميل
    staff_notes = Column(Text)  # ملاحظات الموظف
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