-- PostgreSQL Migration: Add Client Notification Tracking
-- Add columns to track when client is notified (w/ PDF)

ALTER TABLE reports
ADD COLUMN IF NOT EXISTS sent_to_client BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS client_notified_at TIMESTAMP NULL;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_reports_sent_to_client ON reports(sent_to_client);
CREATE INDEX IF NOT EXISTS idx_reports_client_notified_at ON reports(client_notified_at);

-- Update existing completed reports (optional)
-- UPDATE reports SET sent_to_client = FALSE WHERE sent_to_client IS NULL;

-- Verify migration
SELECT
  COUNT(*) as total_reports,
  COUNT(CASE WHEN sent_to_client THEN 1 END) as notified_reports,
  COUNT(client_notified_at) as dated_notifications
FROM reports;