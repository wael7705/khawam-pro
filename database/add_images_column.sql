-- Migration script to add images column to portfolio_works table
-- Run this on Railway PostgreSQL database

ALTER TABLE portfolio_works 
ADD COLUMN IF NOT EXISTS images TEXT[];

-- Update existing records to have empty array if NULL
UPDATE portfolio_works 
SET images = ARRAY[]::TEXT[] 
WHERE images IS NULL;

COMMENT ON COLUMN portfolio_works.images IS 'Array of additional image URLs for the work';

