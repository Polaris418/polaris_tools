-- Migration: 为 t_user_favorite 表添加 updated_at 和 deleted 列
-- Date: 2026-02-01
-- Author: System
-- 
-- 背景:
-- UserFavorite 实体类继承 BaseEntity,而 BaseEntity 定义了 id, created_at, updated_at, deleted 等字段。
-- MyBatis-Plus 在插入数据时会自动填充这些字段,并且启用了全局逻辑删除功能。
-- 
-- 问题:
-- 1. t_user_favorite 表缺少 updated_at 列,导致添加收藏时报错:
--    "Unknown column 'updated_at' in 'field list'"
-- 2. t_user_favorite 表缺少 deleted 列,导致查询/删除收藏时报错:
--    "Unknown column 'deleted' in 'field list'"
--    MyBatis-Plus 会自动在所有查询中添加 WHERE deleted=0 条件
-- 
-- 解决方案:
-- 1. 添加 updated_at 列用于记录最后更新时间,使用 ON UPDATE CURRENT_TIMESTAMP 自动更新
-- 2. 添加 deleted 列用于逻辑删除功能(0-正常, 1-已删除)
-- 3. 为 deleted 列创建索引以优化查询性能

-- 添加 updated_at 列（若不存在）
SET @fav_col_updated_at_exists := (
    SELECT COUNT(1)
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 't_user_favorite'
      AND column_name = 'updated_at'
);
SET @fav_add_updated_at_sql := IF(
    @fav_col_updated_at_exists = 0,
    'ALTER TABLE t_user_favorite ADD COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT ''更新时间'' AFTER created_at',
    'SELECT 1'
);
PREPARE stmt_fav_add_updated_at FROM @fav_add_updated_at_sql;
EXECUTE stmt_fav_add_updated_at;
DEALLOCATE PREPARE stmt_fav_add_updated_at;

-- 添加 deleted 列用于逻辑删除（若不存在）
SET @fav_col_deleted_exists := (
    SELECT COUNT(1)
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 't_user_favorite'
      AND column_name = 'deleted'
);
SET @fav_add_deleted_sql := IF(
    @fav_col_deleted_exists = 0,
    'ALTER TABLE t_user_favorite ADD COLUMN deleted TINYINT NOT NULL DEFAULT 0 COMMENT ''删除标记：0-正常，1-已删除'' AFTER updated_at',
    'SELECT 1'
);
PREPARE stmt_fav_add_deleted FROM @fav_add_deleted_sql;
EXECUTE stmt_fav_add_deleted;
DEALLOCATE PREPARE stmt_fav_add_deleted;

-- 为 deleted、user_id、(user_id, tool_id) 添加索引与唯一约束（若不存在）
SET @fav_idx_deleted_exists := (
    SELECT COUNT(1)
    FROM information_schema.statistics
    WHERE table_schema = DATABASE()
      AND table_name = 't_user_favorite'
      AND index_name = 'idx_deleted'
);
SET @fav_add_idx_deleted_sql := IF(
    @fav_idx_deleted_exists = 0,
    'CREATE INDEX idx_deleted ON t_user_favorite(deleted)',
    'SELECT 1'
);
PREPARE stmt_fav_add_idx_deleted FROM @fav_add_idx_deleted_sql;
EXECUTE stmt_fav_add_idx_deleted;
DEALLOCATE PREPARE stmt_fav_add_idx_deleted;

SET @fav_idx_user_id_exists := (
    SELECT COUNT(1)
    FROM information_schema.statistics
    WHERE table_schema = DATABASE()
      AND table_name = 't_user_favorite'
      AND index_name = 'idx_user_id'
);
SET @fav_add_idx_user_id_sql := IF(
    @fav_idx_user_id_exists = 0,
    'CREATE INDEX idx_user_id ON t_user_favorite(user_id)',
    'SELECT 1'
);
PREPARE stmt_fav_add_idx_user_id FROM @fav_add_idx_user_id_sql;
EXECUTE stmt_fav_add_idx_user_id;
DEALLOCATE PREPARE stmt_fav_add_idx_user_id;

SET @fav_uk_user_tool_exists := (
    SELECT COUNT(1)
    FROM information_schema.table_constraints
    WHERE table_schema = DATABASE()
      AND table_name = 't_user_favorite'
      AND constraint_type = 'UNIQUE'
      AND constraint_name = 'uk_user_tool'
);
SET @fav_add_uk_user_tool_sql := IF(
    @fav_uk_user_tool_exists = 0,
    'ALTER TABLE t_user_favorite ADD CONSTRAINT uk_user_tool UNIQUE (user_id, tool_id)',
    'SELECT 1'
);
PREPARE stmt_fav_add_uk_user_tool FROM @fav_add_uk_user_tool_sql;
EXECUTE stmt_fav_add_uk_user_tool;
DEALLOCATE PREPARE stmt_fav_add_uk_user_tool;

-- 将历史数据的 updated_at 回填为 created_at，保持时间语义一致
UPDATE t_user_favorite
SET updated_at = created_at
WHERE updated_at IS NULL;

-- 验证表结构
-- DESCRIBE t_user_favorite;
