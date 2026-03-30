-- Migration: 为 email_audit_log 表添加 updated_at 和 deleted 列
-- Date: 2026-02-01
-- Author: System
-- 
-- 背景:
-- EmailAuditLog 实体类继承 BaseEntity,而 BaseEntity 定义了 id, created_at, updated_at, deleted 等字段。
-- MyBatis-Plus 配置了逻辑删除功能(deleted=0表示正常,1表示删除),所有继承 BaseEntity 的实体
-- 在执行查询时都会自动添加 WHERE deleted=0 条件。
-- 
-- 问题:
-- email_audit_log 表在创建时缺少 updated_at 和 deleted 列,导致后端查询邮件审计日志时报错:
-- "Unknown column 'deleted' in 'where clause'"
-- 
-- 解决方案:
-- 1. 添加 updated_at 列用于记录记录的最后更新时间
-- 2. 添加 deleted 列用于 MyBatis-Plus 的逻辑删除功能
-- 3. 为 deleted 列创建索引以优化查询性能

-- 添加 updated_at 列（若不存在）
SET @col_updated_at_exists := (
    SELECT COUNT(1)
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'email_audit_log'
      AND column_name = 'updated_at'
);
SET @add_updated_at_sql := IF(
    @col_updated_at_exists = 0,
    'ALTER TABLE email_audit_log ADD COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT ''更新时间'' AFTER created_at',
    'SELECT 1'
);
PREPARE stmt_add_updated_at FROM @add_updated_at_sql;
EXECUTE stmt_add_updated_at;
DEALLOCATE PREPARE stmt_add_updated_at;

-- 添加 deleted 列（若不存在）
SET @col_deleted_exists := (
    SELECT COUNT(1)
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'email_audit_log'
      AND column_name = 'deleted'
);
SET @add_deleted_sql := IF(
    @col_deleted_exists = 0,
    'ALTER TABLE email_audit_log ADD COLUMN deleted TINYINT NOT NULL DEFAULT 0 COMMENT ''逻辑删除标志(0=正常,1=已删除)'' AFTER updated_at',
    'SELECT 1'
);
PREPARE stmt_add_deleted FROM @add_deleted_sql;
EXECUTE stmt_add_deleted;
DEALLOCATE PREPARE stmt_add_deleted;

-- 为 deleted 列添加索引（若不存在）
SET @idx_deleted_exists := (
    SELECT COUNT(1)
    FROM information_schema.statistics
    WHERE table_schema = DATABASE()
      AND table_name = 'email_audit_log'
      AND index_name = 'idx_deleted'
);
SET @add_idx_deleted_sql := IF(
    @idx_deleted_exists = 0,
    'CREATE INDEX idx_deleted ON email_audit_log (deleted)',
    'SELECT 1'
);
PREPARE stmt_add_idx_deleted FROM @add_idx_deleted_sql;
EXECUTE stmt_add_idx_deleted;
DEALLOCATE PREPARE stmt_add_idx_deleted;

-- 验证表结构
-- DESCRIBE email_audit_log;
