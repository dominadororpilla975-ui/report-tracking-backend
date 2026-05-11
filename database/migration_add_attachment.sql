-- Add attachment_path to reports table
ALTER TABLE reports ADD COLUMN attachment_path VARCHAR(500) NULL DEFAULT NULL AFTER budget;

