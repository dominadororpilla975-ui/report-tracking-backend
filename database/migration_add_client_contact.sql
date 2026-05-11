-- Migration: Add client contact fields to reports
-- For admin-triggered account creation from report client_email

ALTER TABLE reports 
ADD COLUMN IF NOT EXISTS client_email VARCHAR(255) NULL,
ADD COLUMN IF NOT EXISTS client_name VARCHAR(255) NULL;

-- Index
CREATE INDEX IF NOT EXISTS idx_reports_client_email ON reports(client_email);

-- Verify
SELECT id, title, client_email, client_name, client_id FROM reports LIMIT 5;

