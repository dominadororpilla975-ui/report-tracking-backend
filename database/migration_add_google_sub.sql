USE report_tracking;

SET @add_google_sub_column = (
    SELECT IF(
        EXISTS (
            SELECT 1
            FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'users'
              AND COLUMN_NAME = 'google_sub'
        ),
        'SELECT 1',
        'ALTER TABLE users ADD COLUMN google_sub VARCHAR(255) NULL UNIQUE AFTER email'
    )
);

PREPARE stmt FROM @add_google_sub_column;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
