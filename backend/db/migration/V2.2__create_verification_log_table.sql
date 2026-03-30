-- Migration: 创建邮件验证日志表
-- Date: 2026-02-02
-- Author: System
-- 
-- 背景:
-- 记录验证码发送和验证的所有操作日志，用于监控、审计和安全分析。
-- 
-- 功能:
-- 1. 记录验证码发送事件（包含 IP 地址和 User-Agent）
-- 2. 记录验证码验证事件（成功和失败）
-- 3. 记录错误信息用于故障排查
-- 4. 支持按邮箱、时间、IP 地址查询日志
-- 
-- 索引说明:
-- - idx_email: 用于查询特定邮箱的操作历史
-- - idx_created_at: 用于按时间范围查询和定期清理旧日志
-- - idx_ip_address: 用于检测异常行为和 IP 级限流

CREATE TABLE IF NOT EXISTS `email_verification_log` (
    `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键 ID',
    `email` VARCHAR(255) NOT NULL COMMENT '邮箱地址',
    `purpose` VARCHAR(20) NOT NULL COMMENT '用途：register-注册，login-登录，reset-密码重置，verify-邮箱验证，change-邮箱修改',
    `action` VARCHAR(20) NOT NULL COMMENT '操作：send-发送，verify-验证，fail-失败',
    `ip_address` VARCHAR(45) NULL COMMENT 'IP 地址',
    `user_agent` VARCHAR(500) NULL COMMENT '用户代理',
    `success` TINYINT NOT NULL DEFAULT 0 COMMENT '是否成功：0-失败，1-成功',
    `error_message` VARCHAR(500) NULL COMMENT '错误信息',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    PRIMARY KEY (`id`),
    INDEX `idx_email` (`email`),
    INDEX `idx_created_at` (`created_at`),
    INDEX `idx_ip_address` (`ip_address`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='邮件验证日志表';
