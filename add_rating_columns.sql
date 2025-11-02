-- Script to add rating columns to orders table
-- Run this on your PostgreSQL database
-- Compatible with PostgreSQL 9.5+ (supports IF NOT EXISTS)

-- Add rating column if it doesn't exist (PostgreSQL 9.5+)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS rating INTEGER;

-- Add rating_comment column if it doesn't exist
ALTER TABLE orders ADD COLUMN IF NOT EXISTS rating_comment TEXT;

-- Verify columns were added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'orders' 
AND column_name IN ('rating', 'rating_comment')
ORDER BY column_name;
