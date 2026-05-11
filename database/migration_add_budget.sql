-- Migration: Add budget fields to existing reports table
-- Run this to add budget columns without losing existing data

ALTER TABLE reports ADD COLUMN budget DECIMAL(15,2) DEFAULT 0;
ALTER TABLE reports ADD COLUMN budget_approved TINYINT(1) DEFAULT 0;
ALTER TABLE reports ADD COLUMN reassign_reason VARCHAR(255) NULL;

