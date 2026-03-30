-- Migration: 开发 Seed 占位迁移
-- 说明:
-- 1) 该迁移默认不写入业务数据，避免在空库迁移阶段因表尚未创建而失败。
-- 2) 本地开发如需初始化演示数据，请使用：backend/db/seed/init.dev.sql
-- 3) 若后续需要启用 Flyway 管理 Seed，可在独立 location 中提供版本化 Seed 脚本。

SELECT 'seed-placeholder' AS message;
