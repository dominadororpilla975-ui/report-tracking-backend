-- PostgreSQL Migration: Add budget fields to existing reports table
-- Run this to add budget columns without losing existing data

ALTER TABLE reports ADD COLUMN IF NOT EXISTS budget DECIMAL(15,2) DEFAULT 0;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS budget_approved BOOLEAN DEFAULT FALSE;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS reassign_reason VARCHAR(255) NULL;