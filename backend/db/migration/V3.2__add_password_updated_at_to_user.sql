-- Migration: 为 t_user 添加密码更新时间字段
-- 来源: backend/sql-scripts/alter_user_add_password_updated_at.sql

-- 兼容 MySQL 8.x：使用 information_schema 检查字段是否存在后再执行 DDL
SET @col_password_updated_at_exists := (
    SELECT COUNT(1)
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 't_user'
      AND column_name = 'password_updated_at'
);
SET @add_password_updated_at_sql := IF(
    @col_password_updated_at_exists = 0,
    'ALTER TABLE t_user ADD COLUMN password_updated_at DATETIME NULL COMMENT ''密码最后修改时间'' AFTER password',
    'SELECT 1'
);
PREPARE stmt_add_password_updated_at FROM @add_password_updated_at_sql;
EXECUTE stmt_add_password_updated_at;
DEALLOCATE PREPARE stmt_add_password_updated_at;

-- 历史用户回填：若为空则以创建时间作为初始值
UPDATE t_user
SET password_updated_at = created_at
WHERE password_updated_at IS NULL;
