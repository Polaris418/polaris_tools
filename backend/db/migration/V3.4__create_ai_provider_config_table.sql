-- Migration: 创建 AI 提供商配置表
-- Date: 2026-03-14
-- Author: Codex
--
-- 背景:
-- 为 Markdown to Word AI 格式助手提供可配置的大模型供应商能力。
-- 管理员可以维护多家供应商，设置主用与优先级，并支持故障自动降级。

CREATE TABLE IF NOT EXISTS `ai_provider_config` (
    `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键 ID',
    `name` VARCHAR(100) NOT NULL COMMENT '配置名称，管理员可读',
    `provider_type` VARCHAR(50) NOT NULL COMMENT '提供商类型：nvidia / openai-compatible',
    `base_url` VARCHAR(500) NOT NULL COMMENT 'Chat Completions 接口地址或基础地址',
    `api_key_encrypted` TEXT NOT NULL COMMENT '加密后的 API Key',
    `model` VARCHAR(200) NOT NULL COMMENT '模型名称',
    `enabled` TINYINT NOT NULL DEFAULT 1 COMMENT '是否启用：0-禁用，1-启用',
    `is_primary` TINYINT NOT NULL DEFAULT 0 COMMENT '是否为主用提供商：0-否，1-是',
    `priority` INT NOT NULL DEFAULT 100 COMMENT '降级优先级，数值越小越优先',
    `timeout_ms` INT NOT NULL DEFAULT 15000 COMMENT '请求超时时间（毫秒）',
    `temperature` DECIMAL(4,2) NOT NULL DEFAULT 0.20 COMMENT '采样温度',
    `top_p` DECIMAL(4,2) NOT NULL DEFAULT 0.90 COMMENT 'Top P 采样参数',
    `max_tokens` INT NOT NULL DEFAULT 2048 COMMENT '最大输出 Token',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '删除标记：0-正常，1-已删除',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_ai_provider_name` (`name`),
    INDEX `idx_ai_provider_enabled` (`enabled`),
    INDEX `idx_ai_provider_primary_priority` (`is_primary`, `priority`),
    INDEX `idx_ai_provider_deleted` (`deleted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='AI 提供商配置表';
