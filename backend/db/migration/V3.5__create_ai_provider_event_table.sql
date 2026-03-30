-- Migration: 创建 AI 提供商事件表
-- Date: 2026-03-15
-- Author: Codex
--
-- 背景:
-- 将 AI 提供商运行态事件持久化，用于后台监控按时间范围筛选、
-- 最近失败排查以及 provider 历史趋势图。

CREATE TABLE IF NOT EXISTS `ai_provider_event` (
    `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键 ID',
    `provider_id` BIGINT NOT NULL COMMENT 'AI 提供商配置 ID',
    `provider_name` VARCHAR(100) NOT NULL COMMENT '提供商名称快照',
    `provider_type` VARCHAR(50) NOT NULL COMMENT '提供商类型快照',
    `related_provider_id` BIGINT NULL COMMENT '关联提供商 ID，例如发生降级时的来源提供商',
    `related_provider_name` VARCHAR(100) NULL COMMENT '关联提供商名称',
    `event_type` VARCHAR(50) NOT NULL COMMENT '事件类型：chat_success/chat_failure/fallback/test_success/test_failure',
    `success` TINYINT NOT NULL DEFAULT 0 COMMENT '事件是否成功',
    `latency_ms` BIGINT NULL COMMENT '本次事件耗时',
    `message` VARCHAR(1000) NULL COMMENT '错误信息或事件说明',
    `metric_hour` DATETIME NOT NULL COMMENT '小时维度桶，便于趋势聚合',
    `occurred_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '事件发生时间',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '删除标记：0-正常，1-已删除',
    PRIMARY KEY (`id`),
    INDEX `idx_ai_provider_event_provider_time` (`provider_id`, `occurred_at`),
    INDEX `idx_ai_provider_event_type_time` (`event_type`, `occurred_at`),
    INDEX `idx_ai_provider_event_metric_hour` (`metric_hour`),
    INDEX `idx_ai_provider_event_deleted` (`deleted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='AI 提供商运行态事件表';
