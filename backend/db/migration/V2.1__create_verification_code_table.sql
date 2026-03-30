-- Migration: 创建邮件验证码表
-- Date: 2026-02-02
-- Author: System
-- 
-- 背景:
-- 实现基于验证码的用户注册、登录、密码重置等功能，替换现有的基于 Token 链接的验证方式。
-- 
-- 功能:
-- 1. 存储 6 位数字验证码的哈希值（SHA-256）
-- 2. 支持多种用途：注册、登录、密码重置、邮箱验证、邮箱修改
-- 3. 验证码有效期 10 分钟
-- 4. 记录验证失败次数，失败 5 次后验证码失效
-- 5. 支持软删除功能（继承 BaseEntity）
-- 
-- 索引说明:
-- - idx_email_purpose: 用于快速查询特定邮箱和用途的验证码
-- - idx_expires_at: 用于定期清理过期验证码
-- - idx_created_at: 用于统计和分析
-- - idx_deleted: 用于 MyBatis-Plus 逻辑删除查询优化

CREATE TABLE IF NOT EXISTS `email_verification_code` (
    `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键 ID',
    `code_hash` VARCHAR(64) NOT NULL COMMENT '验证码哈希值（SHA-256）',
    `email` VARCHAR(255) NOT NULL COMMENT '邮箱地址',
    `purpose` VARCHAR(20) NOT NULL COMMENT '用途：register-注册，login-登录，reset-密码重置，verify-邮箱验证，change-邮箱修改',
    `expires_at` DATETIME NOT NULL COMMENT '过期时间',
    `used` TINYINT NOT NULL DEFAULT 0 COMMENT '是否已使用：0-未使用，1-已使用',
    `used_at` DATETIME NULL COMMENT '使用时间',
    `fail_count` INT NOT NULL DEFAULT 0 COMMENT '验证失败次数',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '删除标记：0-正常，1-已删除',
    PRIMARY KEY (`id`),
    INDEX `idx_email_purpose` (`email`, `purpose`),
    INDEX `idx_expires_at` (`expires_at`),
    INDEX `idx_created_at` (`created_at`),
    INDEX `idx_deleted` (`deleted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='邮件验证码表';
