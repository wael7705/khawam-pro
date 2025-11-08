-- Adds customer-related fields to orders table if they do not already exist.
ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS customer_name VARCHAR(100),
    ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(20),
    ADD COLUMN IF NOT EXISTS customer_whatsapp VARCHAR(20),
    ADD COLUMN IF NOT EXISTS shop_name VARCHAR(200),
    ADD COLUMN IF NOT EXISTS delivery_type VARCHAR(20) DEFAULT 'self',
    ADD COLUMN IF NOT EXISTS delivery_latitude DECIMAL(10, 8),
    ADD COLUMN IF NOT EXISTS delivery_longitude DECIMAL(11, 8),
    ADD COLUMN IF NOT EXISTS notes TEXT,
    ADD COLUMN IF NOT EXISTS staff_notes TEXT,
    ADD COLUMN IF NOT EXISTS paid_amount DECIMAL(12, 2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS remaining_amount DECIMAL(12, 2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS rating INTEGER,
    ADD COLUMN IF NOT EXISTS rating_comment TEXT;

-- Ensure order_items specifications and design_files columns are JSONB for flexible metadata.
ALTER TABLE order_items
    ADD COLUMN IF NOT EXISTS specifications JSONB;

DO $$
DECLARE
    current_type text;
BEGIN
    SELECT data_type INTO current_type
    FROM information_schema.columns
    WHERE table_name = 'order_items' AND column_name = 'design_files';

    IF current_type IS NULL THEN
        ALTER TABLE order_items ADD COLUMN design_files JSONB;
    ELSIF current_type NOT IN ('json', 'jsonb') THEN
        BEGIN
            ALTER TABLE order_items
                ALTER COLUMN design_files TYPE JSONB USING to_jsonb(design_files);
        EXCEPTION
            WHEN others THEN
                ALTER TABLE order_items DROP COLUMN design_files;
                ALTER TABLE order_items ADD COLUMN design_files JSONB;
        END;
    END IF;
END;
$$ LANGUAGE plpgsql;

