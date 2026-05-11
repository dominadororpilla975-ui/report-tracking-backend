-- Migration to add password reset fields
USE report_tracking;

ALTER TABLE users ADD COLUMN reset_token VARCHAR(500) NULL;
ALTER TABLE users ADD COLUMN reset_token_expires DATETIME NULL;
ALTER TABLE users ADD COLUMN needs_password_change TINYINT(1) DEFAULT 0;

-- Optional: Add index for faster token lookups
CREATE INDEX idx_reset_token ON users(reset_token);
