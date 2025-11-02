-- Script to add rating columns to orders table
-- Run this on your PostgreSQL database

-- Add rating column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'rating'
    ) THEN
        ALTER TABLE orders ADD COLUMN rating INTEGER;
        RAISE NOTICE 'Added rating column';
    END IF;
END $$;

-- Add rating_comment column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'rating_comment'
    ) THEN
        ALTER TABLE orders ADD COLUMN rating_comment TEXT;
        RAISE NOTICE 'Added rating_comment column';
    END IF;
END $$;

-- Verify columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'orders' 
AND column_name IN ('rating', 'rating_comment');

