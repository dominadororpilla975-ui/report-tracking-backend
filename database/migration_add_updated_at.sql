-- Add updated_at column to reports table for analytics
ALTER TABLE reports ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP;

-- Update existing reports to set initial updated_at
UPDATE reports SET updated_at = created_at WHERE updated_at IS NULL OR updated_at = '0000-00-00 00:00:00';

