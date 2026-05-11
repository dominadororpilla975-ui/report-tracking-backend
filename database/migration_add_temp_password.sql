-- Migration to add temp_password column to users table
-- Run this after updating the schema

USE report_tracking;

ALTER TABLE users ADD COLUMN temp_password VARCHAR(255) NULL;

-- Optional: Update existing clients with a default temp password if needed
-- But since passwords are hashed, this is not necessary