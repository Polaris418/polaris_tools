-- Migration: Optimize verification code table indexes
-- Date: 2026-02-02
-- Author: System

-- Performance optimization task 22.3 - Optimize database queries
-- Add composite indexes based on actual query patterns

-- Drop old single-column index if present (MySQL 8.x doesn't support DROP INDEX IF EXISTS in ALTER TABLE)
SET @drop_idx_deleted_sql = (
    SELECT IF(
        EXISTS (
            SELECT 1
            FROM information_schema.statistics
            WHERE table_schema = DATABASE()
              AND table_name = 'email_verification_code'
              AND index_name = 'idx_deleted'
        ),
        'ALTER TABLE email_verification_code DROP INDEX idx_deleted',
        'SELECT 1'
    )
);
PREPARE stmt_drop_idx_deleted FROM @drop_idx_deleted_sql;
EXECUTE stmt_drop_idx_deleted;
DEALLOCATE PREPARE stmt_drop_idx_deleted;

-- Add composite index for most common query pattern
CREATE INDEX idx_email_purpose_valid ON email_verification_code 
    (email, purpose, deleted, used, expires_at);

-- Add composite index for cleanup tasks
CREATE INDEX idx_expires_deleted ON email_verification_code 
    (expires_at, deleted);

-- Add composite index for statistics
CREATE INDEX idx_created_deleted ON email_verification_code 
    (created_at, deleted);

-- Add composite index for email history
CREATE INDEX idx_email_created_deleted ON email_verification_code 
    (email, created_at, deleted);

-- Optimize verification log table indexes
CREATE INDEX idx_email_created ON email_verification_log 
    (email, created_at);

CREATE INDEX idx_ip_created ON email_verification_log 
    (ip_address, created_at);

CREATE INDEX idx_purpose_action_created ON email_verification_log 
    (purpose, action, created_at);

CREATE INDEX idx_success_created ON email_verification_log 
    (success, created_at);

-- Analyze tables to update statistics
ANALYZE TABLE email_verification_code;
ANALYZE TABLE email_verification_log;
