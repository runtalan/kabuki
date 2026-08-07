-- Add order column to categories table for drag-to-reorder budget tiles
ALTER TABLE categories
ADD COLUMN IF NOT EXISTS "order" integer;
