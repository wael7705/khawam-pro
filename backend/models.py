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
    title_ar = Column(String(200), nullable=False)
    title = Column(String(200), nullable=False)
    description_ar = Column(Text)
    description = Column(Text)
    image_url = Column(Text, nullable=False)
    category_ar = Column(String(100))
    category = Column(String(100))
    is_featured = Column(Boolean, default=False)
    is_visible = Column(Boolean, default=True)
    display_order = Column(Integer, default=0)
    created_at = Column(TIMESTAMP, server_default=func.now())

class Order(Base):
    __tablename__ = "orders"
    
    id = Column(Integer, primary_key=True, index=True)
    order_number = Column(String(20), unique=True)
    customer_id = Column(Integer, ForeignKey("users.id"))
    status = Column(String(20), default="pending")
    total_amount = Column(DECIMAL(12, 2), nullable=False)
    final_amount = Column(DECIMAL(12, 2), nullable=False)
    payment_status = Column(String(20), default="pending")
    delivery_address = Column(Text)
    notes = Column(Text)
    created_at = Column(TIMESTAMP, server_default=func.now())