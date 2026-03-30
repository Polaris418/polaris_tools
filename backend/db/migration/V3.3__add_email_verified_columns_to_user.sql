-- Migration: 为 t_user 添加邮箱验证字段
-- 来源: backend/sql-scripts/alter_user_add_email_verified.sql

-- 兼容 MySQL 8.x：按字段逐一判断并动态执行
SET @col_email_verified_exists := (
    SELECT COUNT(1)
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 't_user'
      AND column_name = 'email_verified'
);
SET @add_email_verified_sql := IF(
    @col_email_verified_exists = 0,
    'ALTER TABLE t_user ADD COLUMN email_verified TINYINT(1) DEFAULT 0 COMMENT ''邮箱是否已验证: 0-未验证, 1-已验证''',
    'SELECT 1'
);
PREPARE stmt_add_email_verified FROM @add_email_verified_sql;
EXECUTE stmt_add_email_verified;
DEALLOCATE PREPARE stmt_add_email_verified;

SET @col_email_verified_at_exists := (
    SELECT COUNT(1)
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 't_user'
      AND column_name = 'email_verified_at'
);
SET @add_email_verified_at_sql := IF(
    @col_email_verified_at_exists = 0,
    'ALTER TABLE t_user ADD COLUMN email_verified_at DATETIME DEFAULT NULL COMMENT ''邮箱验证时间''',
    'SELECT 1'
);
PREPARE stmt_add_email_verified_at FROM @add_email_verified_at_sql;
EXECUTE stmt_add_email_verified_at;
DEALLOCATE PREPARE stmt_add_email_verified_at;

-- 历史用户回填默认值
UPDATE t_user
SET email_verified = 0
WHERE email_verified IS NULL;

-- 兼容 MySQL 版本：通过 information_schema 判断索引是否存在
SET @idx_email_verified_exists := (
    SELECT COUNT(1)
    FROM information_schema.statistics
    WHERE table_schema = DATABASE()
      AND table_name = 't_user'
      AND index_name = 'idx_email_verified'
);
SET @create_idx_email_verified_sql := IF(
    @idx_email_verified_exists = 0,
    'CREATE INDEX idx_email_verified ON t_user(email_verified)',
    'SELECT 1'
);
PREPARE stmt_idx_email_verified FROM @create_idx_email_verified_sql;
EXECUTE stmt_idx_email_verified;
DEALLOCATE PREPARE stmt_idx_email_verified;
