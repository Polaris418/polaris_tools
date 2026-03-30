-- Migration: 邮件系统基线表
-- 说明:
-- 1) 本文件创建邮件系统核心表
-- 2) email_audit_log 保持“增量前”结构（不含 updated_at/deleted），由 V1.2 追加

CREATE TABLE IF NOT EXISTS `email_template` (
    `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '模板 ID',
    `code` VARCHAR(50) NOT NULL COMMENT '模板编码',
    `name` VARCHAR(100) NOT NULL COMMENT '模板名称',
    `language` VARCHAR(10) NOT NULL COMMENT '语言',
    `subject` VARCHAR(200) NOT NULL COMMENT '邮件主题',
    `html_content` TEXT NOT NULL COMMENT 'HTML 内容',
    `text_content` TEXT DEFAULT NULL COMMENT '纯文本内容',
    `variables` VARCHAR(500) DEFAULT NULL COMMENT '模板变量(JSON 字符串)',
    `version` INT NOT NULL DEFAULT 1 COMMENT '模板版本',
    `enabled` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否启用',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    `deleted` INT NOT NULL DEFAULT 0 COMMENT '逻辑删除',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_code_language_version` (`code`, `language`, `version`, `deleted`),
    KEY `idx_code_language` (`code`, `language`),
    KEY `idx_enabled` (`enabled`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='邮件模板表';

CREATE TABLE IF NOT EXISTS `email_queue` (
    `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    `recipient` VARCHAR(500) NOT NULL COMMENT '收件人邮箱',
    `subject` VARCHAR(500) NOT NULL COMMENT '邮件主题',
    `html_content` TEXT DEFAULT NULL COMMENT 'HTML内容',
    `text_content` TEXT DEFAULT NULL COMMENT '纯文本内容',
    `email_type` VARCHAR(50) NOT NULL COMMENT '邮件类型',
    `priority` VARCHAR(20) NOT NULL DEFAULT 'MEDIUM' COMMENT '优先级',
    `status` VARCHAR(20) NOT NULL DEFAULT 'PENDING' COMMENT '状态',
    `retry_count` INT NOT NULL DEFAULT 0 COMMENT '重试次数',
    `scheduled_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '计划发送时间',
    `sent_at` DATETIME DEFAULT NULL COMMENT '发送时间',
    `error_message` VARCHAR(1000) DEFAULT NULL COMMENT '错误信息',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    `deleted` INT NOT NULL DEFAULT 0 COMMENT '逻辑删除',
    PRIMARY KEY (`id`),
    KEY `idx_status_priority` (`status`, `priority`),
    KEY `idx_scheduled_at` (`scheduled_at`),
    KEY `idx_status` (`status`),
    KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='邮件队列表';

CREATE TABLE IF NOT EXISTS `email_audit_log` (
    `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    `recipient` VARCHAR(500) NOT NULL COMMENT '收件人邮箱地址',
    `subject` VARCHAR(500) NOT NULL COMMENT '邮件主题',
    `email_type` VARCHAR(50) NOT NULL COMMENT '邮件类型',
    `status` VARCHAR(20) NOT NULL COMMENT '发送状态',
    `message_id` VARCHAR(200) DEFAULT NULL COMMENT '提供商消息ID',
    `error_code` VARCHAR(100) DEFAULT NULL COMMENT '错误代码',
    `error_message` VARCHAR(1000) DEFAULT NULL COMMENT '错误信息',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `sent_at` DATETIME DEFAULT NULL COMMENT '发送时间',
    PRIMARY KEY (`id`),
    KEY `idx_recipient` (`recipient`(255)),
    KEY `idx_status` (`status`),
    KEY `idx_created_at` (`created_at`),
    KEY `idx_email_type` (`email_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='邮件审计日志表';

CREATE TABLE IF NOT EXISTS `email_suppression` (
    `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键 ID',
    `email` VARCHAR(255) NOT NULL COMMENT '邮箱地址',
    `reason` VARCHAR(50) NOT NULL COMMENT '抑制原因',
    `source` VARCHAR(50) NOT NULL DEFAULT 'AWS_SES' COMMENT '来源',
    `soft_bounce_count` INT NOT NULL DEFAULT 0 COMMENT '软退信次数',
    `notes` TEXT DEFAULT NULL COMMENT '备注',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    `deleted` INT NOT NULL DEFAULT 0 COMMENT '逻辑删除',
    PRIMARY KEY (`id`),
    KEY `idx_email` (`email`),
    KEY `idx_reason` (`reason`),
    KEY `idx_deleted` (`deleted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='邮件抑制列表';

CREATE TABLE IF NOT EXISTS `email_metrics` (
    `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    `metric_hour` DATETIME NOT NULL COMMENT '统计小时',
    `sent_count` INT NOT NULL DEFAULT 0 COMMENT '发送数',
    `failed_count` INT NOT NULL DEFAULT 0 COMMENT '失败数',
    `bounce_count` INT NOT NULL DEFAULT 0 COMMENT '退信数',
    `complaint_count` INT NOT NULL DEFAULT 0 COMMENT '投诉数',
    `total_delay_ms` BIGINT NOT NULL DEFAULT 0 COMMENT '总延迟(ms)',
    `success_rate` DOUBLE DEFAULT 0 COMMENT '成功率',
    `failure_rate` DOUBLE DEFAULT 0 COMMENT '失败率',
    `bounce_rate` DOUBLE DEFAULT 0 COMMENT '退信率',
    `complaint_rate` DOUBLE DEFAULT 0 COMMENT '投诉率',
    `avg_delay_ms` DOUBLE DEFAULT 0 COMMENT '平均延迟(ms)',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    `deleted` INT NOT NULL DEFAULT 0 COMMENT '逻辑删除',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_metric_hour` (`metric_hour`),
    KEY `idx_metric_hour` (`metric_hour`),
    KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='邮件指标表';

CREATE TABLE IF NOT EXISTS `email_token` (
    `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键 ID',
    `token_hash` VARCHAR(64) NOT NULL COMMENT 'Token 哈希值(SHA-256)',
    `user_id` BIGINT NOT NULL COMMENT '用户 ID',
    `purpose` VARCHAR(20) NOT NULL COMMENT '用途',
    `expires_at` DATETIME NOT NULL COMMENT '过期时间',
    `used` TINYINT NOT NULL DEFAULT 0 COMMENT '是否已使用',
    `used_at` DATETIME DEFAULT NULL COMMENT '使用时间',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除',
    PRIMARY KEY (`id`),
    KEY `idx_token_hash` (`token_hash`),
    KEY `idx_user_purpose` (`user_id`, `purpose`),
    KEY `idx_expires_at` (`expires_at`),
    KEY `idx_deleted` (`deleted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='邮件 Token 表';

CREATE TABLE IF NOT EXISTS `email_verification_code` (
    `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键 ID',
    `code_hash` VARCHAR(64) NOT NULL COMMENT '验证码哈希值',
    `email` VARCHAR(255) NOT NULL COMMENT '邮箱地址',
    `purpose` VARCHAR(20) NOT NULL COMMENT '用途',
    `expires_at` DATETIME NOT NULL COMMENT '过期时间',
    `used` TINYINT NOT NULL DEFAULT 0 COMMENT '是否已使用',
    `used_at` DATETIME DEFAULT NULL COMMENT '使用时间',
    `fail_count` INT NOT NULL DEFAULT 0 COMMENT '失败次数',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '删除标记',
    PRIMARY KEY (`id`),
    KEY `idx_email_purpose` (`email`, `purpose`),
    KEY `idx_expires_at` (`expires_at`),
    KEY `idx_created_at` (`created_at`),
    KEY `idx_deleted` (`deleted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='邮件验证码表';

CREATE TABLE IF NOT EXISTS `email_verification_log` (
    `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键 ID',
    `email` VARCHAR(255) NOT NULL COMMENT '邮箱地址',
    `purpose` VARCHAR(20) NOT NULL COMMENT '用途',
    `action` VARCHAR(20) NOT NULL COMMENT '操作',
    `ip_address` VARCHAR(45) DEFAULT NULL COMMENT 'IP 地址',
    `user_agent` VARCHAR(500) DEFAULT NULL COMMENT '用户代理',
    `success` TINYINT NOT NULL DEFAULT 0 COMMENT '是否成功',
    `error_message` VARCHAR(500) DEFAULT NULL COMMENT '错误信息',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    PRIMARY KEY (`id`),
    KEY `idx_email` (`email`),
    KEY `idx_created_at` (`created_at`),
    KEY `idx_ip_address` (`ip_address`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='邮件验证日志表';

CREATE TABLE IF NOT EXISTS `t_user_email_preference` (
    `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键 ID',
    `user_id` BIGINT NOT NULL COMMENT '用户 ID',
    `email_type` VARCHAR(50) NOT NULL COMMENT '邮件类型',
    `subscribed` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否订阅',
    `unsubscribed_at` DATETIME DEFAULT NULL COMMENT '退订时间',
    `unsubscribe_reason` VARCHAR(500) DEFAULT NULL COMMENT '退订原因',
    `unsubscribe_token` VARCHAR(100) DEFAULT NULL COMMENT '退订令牌',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    `deleted` INT NOT NULL DEFAULT 0 COMMENT '逻辑删除',
    PRIMARY KEY (`id`),
    KEY `idx_user_id` (`user_id`),
    KEY `idx_email_type` (`email_type`),
    KEY `idx_user_email_type` (`user_id`, `email_type`),
    KEY `idx_unsubscribe_token` (`unsubscribe_token`),
    KEY `idx_deleted` (`deleted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户邮件订阅偏好表';
