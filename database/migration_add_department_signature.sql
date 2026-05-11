-- Migration to add uploadable department signatures for receiving copies.

USE report_tracking;

ALTER TABLE departments ADD COLUMN signature_path VARCHAR(255) NULL;
