-- =====================================================
-- قاعدة بيانات شركة خوام - ملف واحد شامل
-- Khawam Database - All in One File
-- =====================================================
-- 
-- هذا الملف يحتوي على جميع جداول قاعدة البيانات
-- This file contains all database tables
-- 
-- التشغيل: 
-- psql -h localhost -p 5432 -U postgres -d khawam_local -f KHAWAM_DB.sql
-- 
-- أو في pgAdmin: 
-- Query Tool → Open File → KHAWAM_DB.sql → F5
-- 
-- بيانات الاتصال المحلية:
-- Database: khawam_local
-- Host: localhost  
-- Port: 5432
-- User: postgres
-- Password: [كلمة المرور الخاصة بك]
-- 
-- =====================================================

-- حذف كل شيء وإعادة البناء من الصفر
DROP TABLE IF EXISTS login_history CASCADE;
DROP TABLE IF EXISTS backup_logs CASCADE;
DROP TABLE IF EXISTS activity_logs CASCADE;
DROP TABLE IF EXISTS system_settings CASCADE;
DROP TABLE IF EXISTS daily_sales_stats CASCADE;
DROP TABLE IF EXISTS custom_reports CASCADE;
DROP TABLE IF EXISTS inventory_transactions CASCADE;
DROP TABLE IF EXISTS inventory CASCADE;
DROP TABLE IF EXISTS passport_templates CASCADE;
DROP TABLE IF EXISTS image_processing_logs CASCADE;
DROP TABLE IF EXISTS studio_projects CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS order_status_history CASCADE;
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS material_types CASCADE;
DROP TABLE IF EXISTS product_sizes CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS product_categories CASCADE;
DROP TABLE IF EXISTS customer_communications CASCADE;
DROP TABLE IF EXISTS customer_profiles CASCADE;
DROP TABLE IF EXISTS user_sessions CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS user_types CASCADE;

DROP VIEW IF EXISTS user_permissions CASCADE;
DROP VIEW IF EXISTS rls_policies CASCADE;
DROP VIEW IF EXISTS vip_customers CASCADE;
DROP VIEW IF EXISTS top_selling_products CASCADE;
DROP VIEW IF EXISTS order_statistics CASCADE;

DROP FUNCTION IF EXISTS set_current_user(integer) CASCADE;
DROP FUNCTION IF EXISTS get_current_user() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS generate_order_number() CASCADE;
DROP FUNCTION IF EXISTS generate_invoice_number() CASCADE;

DROP ROLE IF EXISTS admin_1, admin_2, admin_3;
DROP ROLE IF EXISTS emp_front_1, emp_front_2, emp_front_3;
DROP ROLE IF EXISTS cust_1, cust_2, cust_3;
DROP ROLE IF EXISTS khawam_admin_role;
DROP ROLE IF EXISTS khawam_employee_role;
DROP ROLE IF EXISTS khawam_customer_role;

-- =====================================================
-- الجداول
-- =====================================================

CREATE TABLE user_types (
    id SERIAL PRIMARY KEY,
    type_name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    permissions JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    phone VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE,
    password_hash VARCHAR(255),
    user_type_id INTEGER REFERENCES user_types(id),
    is_active BOOLEAN DEFAULT true,
    is_employee BOOLEAN DEFAULT false,
    employee_id VARCHAR(20) UNIQUE,
    department VARCHAR(50),
    position VARCHAR(50),
    salary DECIMAL(10,2),
    hire_date DATE,
    profile_image TEXT,
    address TEXT,
    city VARCHAR(50),
    notes TEXT,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE customer_profiles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    company_name VARCHAR(100),
    business_type VARCHAR(50),
    tax_number VARCHAR(50),
    credit_limit DECIMAL(12,2) DEFAULT 0,
    payment_terms INTEGER DEFAULT 30,
    preferred_contact_method VARCHAR(20),
    marketing_consent BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE customer_communications (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES users(id),
    communication_type VARCHAR(20) NOT NULL,
    subject VARCHAR(200),
    content TEXT,
    direction VARCHAR(10) NOT NULL,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE product_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    name_ar VARCHAR(100) NOT NULL,
    description TEXT,
    description_ar TEXT,
    icon VARCHAR(50),
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    name_ar VARCHAR(100) NOT NULL,
    description TEXT,
    description_ar TEXT,
    category_id INTEGER REFERENCES product_categories(id),
    base_price DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'SYP',
    unit VARCHAR(20) DEFAULT 'piece',
    min_quantity INTEGER DEFAULT 1,
    max_quantity INTEGER,
    is_active BOOLEAN DEFAULT true,
    is_digital BOOLEAN DEFAULT false,
    requires_design BOOLEAN DEFAULT false,
    production_time_days INTEGER DEFAULT 1,
    specifications JSONB,
    images TEXT[],
    tags TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE product_sizes (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    size_name VARCHAR(50) NOT NULL,
    width_cm DECIMAL(8,2),
    height_cm DECIMAL(8,2),
    width_px INTEGER,
    height_px INTEGER,
    price_multiplier DECIMAL(4,2) DEFAULT 1.0,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE material_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    name_ar VARCHAR(100) NOT NULL,
    category VARCHAR(50),
    weight_gsm INTEGER,
    thickness_mm DECIMAL(4,2),
    color VARCHAR(50),
    finish VARCHAR(50),
    price_per_sqm DECIMAL(8,2),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    order_number VARCHAR(20) UNIQUE NOT NULL DEFAULT 'ORD-TEMP',
    customer_id INTEGER REFERENCES users(id),
    status VARCHAR(20) DEFAULT 'pending',
    priority VARCHAR(10) DEFAULT 'normal',
    total_amount DECIMAL(12,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'SYP',
    discount_amount DECIMAL(10,2) DEFAULT 0,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    final_amount DECIMAL(12,2) NOT NULL,
    payment_status VARCHAR(20) DEFAULT 'pending',
    payment_method VARCHAR(50),
    delivery_method VARCHAR(50),
    delivery_address TEXT,
    delivery_date DATE,
    notes TEXT,
    internal_notes TEXT,
    created_by INTEGER REFERENCES users(id),
    assigned_to INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id),
    product_name VARCHAR(100) NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(12,2) NOT NULL,
    size_id INTEGER REFERENCES product_sizes(id),
    material_id INTEGER REFERENCES material_types(id),
    specifications JSONB,
    design_files TEXT[],
    production_notes TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE order_status_history (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL,
    notes TEXT,
    changed_by INTEGER REFERENCES users(id),
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id),
    amount DECIMAL(12,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'SYP',
    payment_method VARCHAR(50) NOT NULL,
    payment_type VARCHAR(20) NOT NULL,
    transaction_id VARCHAR(100),
    reference_number VARCHAR(100),
    status VARCHAR(20) DEFAULT 'pending',
    payment_date TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE invoices (
    id SERIAL PRIMARY KEY,
    invoice_number VARCHAR(20) UNIQUE NOT NULL DEFAULT 'INV-TEMP',
    order_id INTEGER REFERENCES orders(id),
    customer_id INTEGER REFERENCES users(id),
    issue_date DATE NOT NULL,
    due_date DATE,
    subtotal DECIMAL(12,2) NOT NULL,
    tax_rate DECIMAL(5,2) DEFAULT 0,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(12,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'draft',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE studio_projects (
    id SERIAL PRIMARY KEY,
    project_name VARCHAR(100) NOT NULL,
    user_id INTEGER REFERENCES users(id),
    original_image_url TEXT,
    processed_image_url TEXT,
    project_type VARCHAR(50),
    settings JSONB,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE image_processing_logs (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES studio_projects(id),
    tool_used VARCHAR(50) NOT NULL,
    input_image_url TEXT,
    output_image_url TEXT,
    processing_time_ms INTEGER,
    settings JSONB,
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE passport_templates (
    id SERIAL PRIMARY KEY,
    template_name VARCHAR(100) NOT NULL,
    template_type VARCHAR(20) DEFAULT '4x2',
    width_mm INTEGER NOT NULL,
    height_mm INTEGER NOT NULL,
    image_width_px INTEGER NOT NULL,
    image_height_px INTEGER NOT NULL,
    template_file_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE inventory (
    id SERIAL PRIMARY KEY,
    material_id INTEGER REFERENCES material_types(id),
    quantity_available DECIMAL(10,2) NOT NULL DEFAULT 0,
    quantity_reserved DECIMAL(10,2) NOT NULL DEFAULT 0,
    unit VARCHAR(20) DEFAULT 'sqm',
    min_stock_level DECIMAL(10,2) DEFAULT 0,
    max_stock_level DECIMAL(10,2),
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER REFERENCES users(id)
);

CREATE TABLE inventory_transactions (
    id SERIAL PRIMARY KEY,
    material_id INTEGER REFERENCES material_types(id),
    transaction_type VARCHAR(20) NOT NULL,
    quantity DECIMAL(10,2) NOT NULL,
    unit VARCHAR(20) DEFAULT 'sqm',
    reference_type VARCHAR(50),
    reference_id INTEGER,
    notes TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE custom_reports (
    id SERIAL PRIMARY KEY,
    report_name VARCHAR(100) NOT NULL,
    report_type VARCHAR(50) NOT NULL,
    description TEXT,
    query_sql TEXT NOT NULL,
    parameters JSONB,
    created_by INTEGER REFERENCES users(id),
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE daily_sales_stats (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL UNIQUE,
    total_orders INTEGER DEFAULT 0,
    total_revenue DECIMAL(12,2) DEFAULT 0,
    total_quantity INTEGER DEFAULT 0,
    average_order_value DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE system_settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    setting_type VARCHAR(20) DEFAULT 'string',
    description TEXT,
    is_public BOOLEAN DEFAULT false,
    updated_by INTEGER REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE activity_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id INTEGER,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE backup_logs (
    id SERIAL PRIMARY KEY,
    backup_type VARCHAR(50) NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT,
    status VARCHAR(20) DEFAULT 'completed',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE login_history (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) NOT NULL,
    login_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address INET,
    user_agent TEXT,
    success BOOLEAN DEFAULT true,
    failure_reason TEXT
);

-- =====================================================
-- الفهارس
-- =====================================================

CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_type ON users(user_type_id);
CREATE INDEX idx_users_employee ON users(is_employee);
CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_date ON orders(created_at);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_payments_order ON payments(order_id);
CREATE INDEX idx_studio_projects_user ON studio_projects(user_id);

-- =====================================================
-- الدوال
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
BEGIN
    NEW.order_number = 'ORD-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD(NEW.id::TEXT, 4, '0');
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TRIGGER AS $$
BEGIN
    NEW.invoice_number = 'INV-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD(NEW.id::TEXT, 4, '0');
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE FUNCTION set_current_user(user_id integer)
RETURNS void AS $$
BEGIN
  PERFORM set_config('app.current_user_id', user_id::text, false);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_current_user()
RETURNS integer AS $$
BEGIN
  RETURN current_setting('app.current_user_id', true)::integer;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- المحفزات
-- =====================================================

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_studio_projects_updated_at BEFORE UPDATE ON studio_projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customer_profiles_updated_at BEFORE UPDATE ON customer_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER generate_order_number_trigger BEFORE INSERT ON orders
    FOR EACH ROW EXECUTE FUNCTION generate_order_number();

CREATE TRIGGER generate_invoice_number_trigger BEFORE INSERT ON invoices
    FOR EACH ROW EXECUTE FUNCTION generate_invoice_number();

-- =====================================================
-- البيانات الأساسية
-- =====================================================

INSERT INTO user_types (type_name, description, permissions) VALUES
('admin', 'مدير النظام', '{"all": true}'),
('employee', 'موظف', '{"orders": true, "customers": true, "studio": true}'),
('customer', 'عميل', '{"orders": true, "studio": false}'),
('guest', 'زائر', '{"view": true}');

INSERT INTO product_categories (name, name_ar, icon, sort_order) VALUES
('Posters', 'البوسترات', '📄', 1),
('Flex', 'الفليكس', '🖼️', 2),
('Banners', 'البانرات', '🎉', 3),
('Business Cards', 'الكروت الشخصية', '💳', 4),
('Stickers', 'الملصقات', '🏷️', 5),
('Design', 'التصميم', '🎨', 6);

INSERT INTO products (name_ar, name, category_id, base_price, unit, min_quantity, production_time_days) VALUES
('بوستر A4', 'A4 Poster', 1, 2000.00, 'piece', 1, 1),
('بوستر A3', 'A3 Poster', 1, 3500.00, 'piece', 1, 1),
('فليكس خارجي', 'Outdoor Flex', 2, 3000.00, 'sqm', 1, 2),
('بانر احتفالي', 'Event Banner', 3, 5000.00, 'piece', 1, 3),
('كارت شخصي', 'Business Card', 4, 500.00, 'piece', 100, 1),
('ملصق لاصق', 'Adhesive Sticker', 5, 1000.00, 'piece', 50, 1),
('تصميم جرافيكي', 'Graphic Design', 6, 3000.00, 'hour', 1, 2);

INSERT INTO material_types (name_ar, name, category, weight_gsm, price_per_sqm) VALUES
('ورق لامع 135 جرام', 'Glossy Paper 135gsm', 'paper', 135, 500.00),
('ورق غير لامع 135 جرام', 'Matte Paper 135gsm', 'paper', 135, 450.00),
('فليكس خارجي', 'Outdoor Flex', 'vinyl', 500, 2000.00),
('فليكس داخلي', 'Indoor Flex', 'vinyl', 300, 1500.00),
('بانر فينيل', 'Vinyl Banner', 'vinyl', 600, 2500.00),
('فينيل لاصق', 'Adhesive Vinyl', 'vinyl', 200, 1000.00);

INSERT INTO system_settings (setting_key, setting_value, description, is_public) VALUES
('company_name', 'شركة خوام للطباعة', 'اسم الشركة', true),
('company_phone', '+963112134640', 'هاتف الشركة', true),
('company_email', 'eyadmrx@gmail.com', 'بريد الشركة', true),
('company_address', 'دمشق - البرامكة', 'عنوان الشركة', true),
('studio_enabled', 'true', 'تفعيل الاستديو', false);

INSERT INTO passport_templates (template_name, template_type, width_mm, height_mm, image_width_px, image_height_px) VALUES
('Passport 4x2', '4x2', 140, 100, 1654, 1181),
('Passport 6x4', '6x4', 150, 100, 1772, 1181),
('ID Photo 4x6', '4x6', 100, 150, 1181, 1772);

INSERT INTO users (phone, name, email, user_type_id, is_employee, employee_id, department, position) VALUES
('+963112134640', 'أياد مرعي', 'eyadmrx@gmail.com', 1, true, 'EMP001', 'الإدارة', 'مدير عام'),
('+963999123456', 'أحمد محمد', 'ahmed@khawam.com', 2, true, 'EMP002', 'الطباعة', 'فني طباعة'),
('+963988765432', 'فاطمة علي', 'fatima@khawam.com', 2, true, 'EMP003', 'التصميم', 'مصممة جرافيك'),
('+963911111111', 'محمد حسن', 'mohammad@test.com', 3, false, NULL, NULL, NULL),
('+963922222222', 'سارة أحمد', 'sara@test.com', 3, false, NULL, NULL, NULL),
('+963933333333', 'خالد علي', 'khaled@test.com', 3, false, NULL, NULL, NULL),
('+963944444444', 'ليلى محمود', 'layla@test.com', 3, false, NULL, NULL, NULL),
('+963955555555', 'عمر يوسف', 'omar@test.com', 3, false, NULL, NULL, NULL);

-- =====================================================
-- بيانات وهمية للطلبات
-- =====================================================

INSERT INTO orders (customer_id, total_amount, final_amount, status, payment_status, notes, created_by) VALUES
(4, 5000, 5000, 'completed', 'paid', 'طلب بوسترات A4', 1),
(5, 15000, 15000, 'in_production', 'partial', 'طلب فليكس خارجي كبير', 1),
(6, 8000, 8000, 'pending', 'pending', 'طلب كروت شخصية', 2),
(7, 12000, 12000, 'completed', 'paid', 'طلب بانر احتفالي', 1),
(8, 3000, 3000, 'pending', 'pending', 'طلب ملصقات', 2),
(4, 7000, 7000, 'completed', 'paid', 'طلب تصميم جرافيكي', 1),
(5, 4500, 4500, 'in_production', 'paid', 'طلب بوسترات A3', 2),
(6, 20000, 20000, 'pending', 'pending', 'طلب فليكس وبانرات', 1);

INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, total_price) VALUES
(1, 1, 'بوستر A4', 2, 2000, 4000),
(1, 5, 'كارت شخصي', 100, 5, 500),
(2, 3, 'فليكس خارجي', 5, 3000, 15000),
(3, 5, 'كارت شخصي', 500, 5, 2500),
(4, 4, 'بانر احتفالي', 2, 5000, 10000),
(5, 6, 'ملصق لاصق', 100, 10, 1000),
(6, 7, 'تصميم جرافيكي', 2, 3000, 6000),
(7, 2, 'بوستر A3', 1, 3500, 3500),
(8, 3, 'فليكس خارجي', 3, 3000, 9000);

INSERT INTO payments (order_id, amount, payment_method, payment_type, status, payment_date) VALUES
(1, 5000, 'cash', 'full', 'completed', CURRENT_TIMESTAMP),
(2, 7500, 'bank_transfer', 'deposit', 'completed', CURRENT_TIMESTAMP),
(4, 12000, 'cash', 'full', 'completed', CURRENT_TIMESTAMP),
(6, 7000, 'card', 'full', 'completed', CURRENT_TIMESTAMP),
(7, 4500, 'cash', 'full', 'completed', CURRENT_TIMESTAMP);

-- =====================================================
-- بيانات وهمية للاستديو
-- =====================================================

INSERT INTO studio_projects (project_name, user_id, project_type, settings, status) VALUES
('مشروع إزالة خلفية 1', 4, 'background_removal', '{"quality": "high"}', 'completed'),
('صور شخصية للموظفين', 1, 'passport', '{"template": "4x2"}', 'completed'),
('تحويل أبيض وأسود', 5, 'bw_conversion', '{"brightness": 10, "contrast": 20}', 'active'),
('اقتصاص وتدوير', 6, 'crop_rotate', '{"rotation": 90}', 'completed'),
('فلاتر ألوان', 4, 'color_filter', '{"filter": "vintage"}', 'active');

INSERT INTO image_processing_logs (project_id, tool_used, processing_time_ms, success) VALUES
(1, 'background_removal', 2500, true),
(2, 'passport_generator', 3200, true),
(3, 'bw_converter', 1800, true),
(4, 'crop_rotate', 1200, true),
(5, 'color_filters', 1500, true);

-- =====================================================
-- الأدوار والصلاحيات
-- =====================================================

CREATE ROLE khawam_admin_role NOINHERIT;
CREATE ROLE khawam_employee_role NOINHERIT;
CREATE ROLE khawam_customer_role NOINHERIT;

CREATE ROLE admin_1 WITH LOGIN PASSWORD 'Admin!234';
CREATE ROLE admin_2 WITH LOGIN PASSWORD 'Admin!235';
CREATE ROLE admin_3 WITH LOGIN PASSWORD 'Admin!236';
GRANT khawam_admin_role TO admin_1, admin_2, admin_3;

CREATE ROLE emp_front_1 WITH LOGIN PASSWORD 'EmpFront!11';
CREATE ROLE emp_front_2 WITH LOGIN PASSWORD 'EmpFront!12';
CREATE ROLE emp_front_3 WITH LOGIN PASSWORD 'EmpFront!13';
GRANT khawam_employee_role TO emp_front_1, emp_front_2, emp_front_3;

CREATE ROLE cust_1 WITH LOGIN PASSWORD 'Cust!101';
CREATE ROLE cust_2 WITH LOGIN PASSWORD 'Cust!102';
CREATE ROLE cust_3 WITH LOGIN PASSWORD 'Cust!103';
GRANT khawam_customer_role TO cust_1, cust_2, cust_3;

-- صلاحيات المديرين (كل شيء)
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO khawam_admin_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO khawam_admin_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO khawam_admin_role;
GRANT USAGE ON SCHEMA public TO khawam_admin_role;

-- صلاحيات الموظفين (قراءة وكتابة)
GRANT USAGE ON SCHEMA public TO khawam_employee_role;
GRANT SELECT, INSERT, UPDATE ON orders, order_items, products, payments, studio_projects TO khawam_employee_role;
GRANT SELECT ON users, customer_profiles, product_categories, material_types, inventory TO khawam_employee_role;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO khawam_employee_role;

-- صلاحيات العملاء (قراءة فقط)
GRANT USAGE ON SCHEMA public TO khawam_customer_role;
GRANT SELECT ON products, product_categories, material_types, passport_templates TO khawam_customer_role;
GRANT SELECT ON orders, studio_projects TO khawam_customer_role;

-- تفعيل RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE studio_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY rls_customer_orders ON orders
  FOR SELECT
  USING (customer_id = current_setting('app.current_user_id', true)::int);

CREATE POLICY rls_customer_studio ON studio_projects
  FOR SELECT
  USING (user_id = current_setting('app.current_user_id', true)::int);

-- =====================================================
-- Views
-- =====================================================

CREATE VIEW order_statistics AS
SELECT 
    DATE(created_at) as order_date,
    COUNT(*) as total_orders,
    SUM(final_amount) as total_revenue,
    AVG(final_amount) as average_order_value
FROM orders
GROUP BY DATE(created_at)
ORDER BY order_date DESC;

CREATE VIEW top_selling_products AS
SELECT 
    p.name_ar,
    COUNT(oi.id) as total_orders,
    SUM(oi.quantity) as total_quantity,
    SUM(oi.total_price) as total_revenue
FROM products p
LEFT JOIN order_items oi ON p.id = oi.product_id
GROUP BY p.id, p.name_ar
ORDER BY total_quantity DESC;

CREATE VIEW vip_customers AS
SELECT 
    u.name,
    u.phone,
    COUNT(o.id) as total_orders,
    SUM(o.final_amount) as total_spent
FROM users u
JOIN orders o ON u.id = o.customer_id
WHERE u.user_type_id = 3
GROUP BY u.id, u.name, u.phone
HAVING COUNT(o.id) >= 2 OR SUM(o.final_amount) >= 10000
ORDER BY total_spent DESC;

-- =====================================================
-- رسالة النجاح
-- =====================================================

SELECT 
    '====================================' as " ",
    NULL, NULL, NULL, NULL, NULL
UNION ALL
SELECT '✅ قاعدة البيانات جاهزة!', NULL, NULL, NULL, NULL, NULL
UNION ALL
SELECT '====================================', NULL, NULL, NULL, NULL, NULL
UNION ALL
SELECT 'الجداول:', (SELECT COUNT(*)::text FROM information_schema.tables WHERE table_schema = 'public'), NULL, NULL, NULL, NULL
UNION ALL
SELECT 'المستخدمين:', (SELECT COUNT(*)::text FROM users), NULL, NULL, NULL, NULL
UNION ALL
SELECT 'المنتجات:', (SELECT COUNT(*)::text FROM products), NULL, NULL, NULL, NULL
UNION ALL
SELECT 'الطلبات:', (SELECT COUNT(*)::text FROM orders), NULL, NULL, NULL, NULL
UNION ALL
SELECT 'مشاريع الاستديو:', (SELECT COUNT(*)::text FROM studio_projects), NULL, NULL, NULL, NULL
UNION ALL
SELECT '====================================', NULL, NULL, NULL, NULL, NULL
UNION ALL
SELECT 'الحسابات:', NULL, NULL, NULL, NULL, NULL
UNION ALL
SELECT 'admin_1 / Admin!234', NULL, NULL, NULL, NULL, NULL
UNION ALL
SELECT 'emp_front_1 / EmpFront!11', NULL, NULL, NULL, NULL, NULL
UNION ALL
SELECT 'cust_1 / Cust!101', NULL, NULL, NULL, NULL, NULL
UNION ALL
SELECT '====================================', NULL, NULL, NULL, NULL, NULL;

-- =====================================================
-- جداول إضافية من الملفات الأخرى
-- Additional Tables from Other Files
-- =====================================================

-- جدول الخدمات (من services_table.sql)
CREATE TABLE IF NOT EXISTS services (
    id SERIAL PRIMARY KEY,
    name_ar VARCHAR(200) NOT NULL,
    name_en VARCHAR(200) NOT NULL,
    description_ar TEXT,
    description_en TEXT,
    icon VARCHAR(50),
    image_url TEXT,
    base_price DECIMAL(10,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    is_visible BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    features JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- جدول خيارات الخدمة
CREATE TABLE IF NOT EXISTS service_options (
    id SERIAL PRIMARY KEY,
    service_id INTEGER REFERENCES services(id) ON DELETE CASCADE,
    option_type VARCHAR(50) NOT NULL, -- 'material', 'size', 'finish', 'color'
    option_name_ar VARCHAR(100) NOT NULL,
    option_name_en VARCHAR(100) NOT NULL,
    price_modifier DECIMAL(10,2) DEFAULT 0,
    is_percentage BOOLEAN DEFAULT false,
    is_default BOOLEAN DEFAULT false,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- جدول أعمال المحفظة (من admin_tables.sql)
CREATE TABLE IF NOT EXISTS portfolio_works (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    title_ar VARCHAR(200) NOT NULL,
    description TEXT,
    description_ar TEXT,
    image_url TEXT NOT NULL,
    category VARCHAR(100),
    category_ar VARCHAR(100),
    is_featured BOOLEAN DEFAULT false,
    is_visible BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    client_name VARCHAR(100),
    completion_date DATE,
    tags TEXT[],
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- جدول الملفات المرفوعة
CREATE TABLE IF NOT EXISTS uploaded_files (
    id SERIAL PRIMARY KEY,
    original_name VARCHAR(255) NOT NULL,
    filename VARCHAR(255) NOT NULL UNIQUE,
    file_path TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- جدول التقييمات
CREATE TABLE IF NOT EXISTS reviews (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    product_id INTEGER REFERENCES products(id),
    work_id INTEGER REFERENCES portfolio_works(id),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- جدول الإعجابات
CREATE TABLE IF NOT EXISTS likes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    product_id INTEGER REFERENCES products(id),
    work_id INTEGER REFERENCES portfolio_works(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, product_id),
    UNIQUE(user_id, work_id)
);

-- =====================================================
-- تحديثات الجداول الموجودة
-- Updates to Existing Tables
-- =====================================================

-- إضافة حقول جديدة للمنتجات
ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS description_ar TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS sales INTEGER DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS price DECIMAL(12,2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_visible BOOLEAN DEFAULT true;
ALTER TABLE products ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS featured_image TEXT;

-- جعل الاسم الإنجليزي اختيارياً
ALTER TABLE products ALTER COLUMN name DROP NOT NULL;

-- تحديث السعر من base_price إذا كان موجوداً
UPDATE products SET price = base_price WHERE price IS NULL AND base_price IS NOT NULL;

-- إضافة حقول للمستخدمين
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_orders INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_spent DECIMAL(12,2) DEFAULT 0;

-- =====================================================
-- الفهارس الجديدة
-- New Indexes
-- =====================================================

-- فهارس للخدمات
CREATE INDEX IF NOT EXISTS idx_services_visible ON services(is_visible);
CREATE INDEX IF NOT EXISTS idx_services_active ON services(is_active);
CREATE INDEX IF NOT EXISTS idx_service_options_service ON service_options(service_id);
CREATE INDEX IF NOT EXISTS idx_service_options_type ON service_options(option_type);

-- فهارس لأعمال المحفظة
CREATE INDEX IF NOT EXISTS idx_portfolio_works_visible ON portfolio_works(is_visible);
CREATE INDEX IF NOT EXISTS idx_portfolio_works_featured ON portfolio_works(is_featured);
CREATE INDEX IF NOT EXISTS idx_portfolio_works_category ON portfolio_works(category);

-- فهارس للمنتجات
CREATE INDEX IF NOT EXISTS idx_products_visible ON products(is_visible);
CREATE INDEX IF NOT EXISTS idx_products_featured ON products(is_featured);
CREATE INDEX IF NOT EXISTS idx_products_sales ON products(sales DESC);
CREATE INDEX IF NOT EXISTS idx_products_price ON products(price);

-- فهارس للملفات المرفوعة
CREATE INDEX IF NOT EXISTS idx_uploaded_files_filename ON uploaded_files(filename);

-- =====================================================
-- Triggers الجديدة
-- New Triggers
-- =====================================================

-- Trigger للخدمات
DROP TRIGGER IF EXISTS update_services_updated_at ON services;
CREATE TRIGGER update_services_updated_at 
BEFORE UPDATE ON services
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger لأعمال المحفظة
DROP TRIGGER IF EXISTS update_portfolio_works_updated_at ON portfolio_works;
CREATE TRIGGER update_portfolio_works_updated_at 
BEFORE UPDATE ON portfolio_works
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Views الجديدة
-- New Views
-- =====================================================

-- View للخدمات مع خياراتها
CREATE OR REPLACE VIEW services_with_options AS
SELECT 
    s.*,
    json_agg(
        json_build_object(
            'id', so.id,
            'option_type', so.option_type,
            'option_name_ar', so.option_name_ar,
            'option_name_en', so.option_name_en,
            'price_modifier', so.price_modifier,
            'is_percentage', so.is_percentage,
            'is_default', so.is_default
        ) ORDER BY so.option_type, so.display_order
    ) FILTER (WHERE so.id IS NOT NULL) as options
FROM services s
LEFT JOIN service_options so ON s.id = so.service_id
GROUP BY s.id
ORDER BY s.display_order;

-- View لإحصائيات العملاء
CREATE OR REPLACE VIEW customer_stats AS
SELECT 
    u.id,
    u.name,
    u.phone,
    u.email,
    u.address,
    u.city,
    u.created_at as registration_date,
    COUNT(DISTINCT o.id) as total_orders,
    COALESCE(SUM(o.final_amount), 0) as total_spent,
    COALESCE(AVG(o.final_amount), 0) as average_order_value,
    MAX(o.created_at) as last_order_date
FROM users u
LEFT JOIN orders o ON u.id = o.customer_id
WHERE u.user_type_id = 3 AND u.is_active = true
GROUP BY u.id, u.name, u.phone, u.email, u.address, u.city, u.created_at
ORDER BY total_spent DESC;

-- View لإحصائيات المنتجات
CREATE OR REPLACE VIEW product_stats AS
SELECT 
    p.id,
    p.name_ar,
    p.name,
    p.base_price,
    p.is_active,
    p.is_visible,
    pc.name_ar as category_name,
    COUNT(DISTINCT oi.order_id) as total_orders,
    COALESCE(SUM(oi.quantity), 0) as total_quantity_sold,
    COALESCE(SUM(oi.total_price), 0) as total_revenue
FROM products p
LEFT JOIN product_categories pc ON p.category_id = pc.id
LEFT JOIN order_items oi ON p.id = oi.product_id
GROUP BY p.id, p.name_ar, p.name, p.base_price, p.is_active, p.is_visible, pc.name_ar
ORDER BY total_revenue DESC;

-- =====================================================
-- بيانات تجريبية للخدمات
-- Sample Services Data
-- =====================================================

INSERT INTO services (name_ar, name_en, description_ar, description_en, icon, base_price, display_order) VALUES
('طباعة البوسترات', 'Poster Printing', 'طباعة بوسترات عالية الجودة بجميع المقاسات', 'High quality poster printing in all sizes', '📄', 2000.00, 1),
('طباعة الفليكس', 'Flex Printing', 'طباعة فليكس خارجي وداخلي بأحجام كبيرة', 'Indoor and outdoor flex printing in large sizes', '🖼️', 3000.00, 2),
('البانرات الإعلانية', 'Advertising Banners', 'تصميم وطباعة بانرات إعلانية احترافية', 'Professional advertising banner design and printing', '🎉', 5000.00, 3),
('الكروت الشخصية', 'Business Cards', 'طباعة كروت شخصية بتصاميم احترافية', 'Professional business card printing', '💳', 500.00, 4),
('الملصقات', 'Stickers', 'طباعة ملصقات بجميع الأشكال والأحجام', 'Sticker printing in all shapes and sizes', '🏷️', 1000.00, 5),
('التصميم الجرافيكي', 'Graphic Design', 'خدمات التصميم الجرافيكي الاحترافي', 'Professional graphic design services', '🎨', 3000.00, 6)
ON CONFLICT (id) DO NOTHING;

-- خيارات للبوسترات
INSERT INTO service_options (service_id, option_type, option_name_ar, option_name_en, price_modifier, display_order) VALUES
(1, 'size', 'A4', 'A4', 0, 1),
(1, 'size', 'A3', 'A3', 1500, 2),
(1, 'size', 'A2', 'A2', 3000, 3),
(1, 'size', 'A1', 'A1', 5000, 4),
(1, 'material', 'ورق لامع', 'Glossy Paper', 0, 1),
(1, 'material', 'ورق مطفي', 'Matte Paper', 200, 2),
(1, 'material', 'ورق فاخر', 'Premium Paper', 500, 3)
ON CONFLICT (id) DO NOTHING;

-- خيارات للفليكس
INSERT INTO service_options (service_id, option_type, option_name_ar, option_name_en, price_modifier, display_order) VALUES
(2, 'material', 'فليكس خارجي', 'Outdoor Flex', 0, 1),
(2, 'material', 'فليكس داخلي', 'Indoor Flex', -500, 2),
(2, 'finish', 'لامع', 'Glossy', 0, 1),
(2, 'finish', 'مطفي', 'Matte', 200, 2)
ON CONFLICT (id) DO NOTHING;

-- خيارات للكروت الشخصية
INSERT INTO service_options (service_id, option_type, option_name_ar, option_name_en, price_modifier, is_percentage, display_order) VALUES
(4, 'material', 'ورق عادي', 'Standard Paper', 0, false, 1),
(4, 'material', 'ورق فاخر', 'Premium Paper', 200, false, 2),
(4, 'material', 'بلاستيك PVC', 'PVC Plastic', 500, false, 3),
(4, 'finish', 'لامع', 'Glossy', 0, false, 1),
(4, 'finish', 'مطفي', 'Matte', 100, false, 2),
(4, 'finish', 'مع تذهيب', 'With Gold Foil', 300, false, 3)
ON CONFLICT (id) DO NOTHING;

-- خيارات للملصقات
INSERT INTO service_options (service_id, option_type, option_name_ar, option_name_en, price_modifier, display_order) VALUES
(5, 'material', 'فينيل لاصق', 'Adhesive Vinyl', 0, 1),
(5, 'material', 'ورق لاصق', 'Adhesive Paper', -200, 2),
(5, 'material', 'شفاف', 'Transparent', 300, 3),
(5, 'finish', 'لامع', 'Glossy', 0, 1),
(5, 'finish', 'مطفي', 'Matte', 100, 2)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- بيانات تجريبية لأعمال المحفظة
-- Sample Portfolio Works Data
-- =====================================================

INSERT INTO portfolio_works (title, title_ar, description, description_ar, image_url, category, category_ar, is_featured, is_visible) VALUES
('Modern Business Cards', 'كروت عمل عصرية', 'Professional business cards design for tech company', 'تصميم كروت عمل احترافية لشركة تقنية', '/images/works/work1.jpg', 'Business Cards', 'كروت العمل', true, true),
('Event Banner Design', 'تصميم بانر فعالية', 'Large format banner for corporate event', 'بانر كبير لفعالية شركة', '/images/works/work2.jpg', 'Banners', 'البانرات', true, true),
('Product Packaging', 'تغليف منتجات', 'Custom packaging design for retail products', 'تصميم تغليف مخصص لمنتجات التجزئة', '/images/works/work3.jpg', 'Packaging', 'التغليف', false, true),
('Restaurant Menu', 'قائمة مطعم', 'Elegant menu design for fine dining restaurant', 'تصميم قائمة أنيقة لمطعم فاخر', '/images/works/work4.jpg', 'Menus', 'القوائم', false, true),
('Corporate Brochure', 'بروشور شركة', 'Multi-page brochure for corporate presentation', 'بروشور متعدد الصفحات لعرض الشركة', '/images/works/work5.jpg', 'Brochures', 'البروشورات', true, true)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- رسالة النجاح النهائية
-- Final Success Message
-- =====================================================

SELECT '🎉 تم دمج جميع ملفات SQL في ملف KHAWAM_DB.sql واحد!' as message;
SELECT '✅ تم إنشاء جميع الجداول والبيانات بنجاح!' as status;
SELECT '📊 الجداول المتاحة: users, products, services, portfolio_works, orders, etc.' as tables;
