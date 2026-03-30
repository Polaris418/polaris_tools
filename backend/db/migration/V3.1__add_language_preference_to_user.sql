-- 添加用户语言偏好字段
-- V3.1__add_language_preference_to_user.sql

SET @col_language_exists := (
    SELECT COUNT(1)
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 't_user'
      AND column_name = 'language'
);
SET @add_language_sql := IF(
    @col_language_exists = 0,
    'ALTER TABLE t_user ADD COLUMN language VARCHAR(10) DEFAULT ''zh-CN'' COMMENT ''用户语言偏好: zh-CN(简体中文), en-US(英语)'' AFTER bio',
    'SELECT 1'
);
PREPARE stmt_add_language FROM @add_language_sql;
EXECUTE stmt_add_language;
DEALLOCATE PREPARE stmt_add_language;

-- 为现有用户设置默认语言
UPDATE t_user SET language = 'zh-CN' WHERE language IS NULL;
