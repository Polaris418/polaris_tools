-- Migration: 核心业务基线表
-- 说明:
-- 1) 本文件仅包含核心业务表与文档模块表
-- 2) 邮件系统相关表在 V1.1 中创建
-- 3) 为兼容后续增量迁移，以下字段保持“增量前”状态：
--    - t_user 不包含 language（由 V3.1 增加）
--    - t_user_favorite 不包含 updated_at/deleted（由 V1.3 增加）

CREATE TABLE IF NOT EXISTS `t_user` (
    `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '用户 ID',
    `username` VARCHAR(50) NOT NULL COMMENT '用户名',
    `password` VARCHAR(255) NOT NULL COMMENT 'BCrypt 加密密码',
    `email` VARCHAR(100) NOT NULL COMMENT '邮箱',
    `nickname` VARCHAR(50) DEFAULT NULL COMMENT '昵称',
    `avatar` VARCHAR(500) DEFAULT NULL COMMENT '头像 URL',
    `avatar_config` TEXT DEFAULT NULL COMMENT '头像配置(JSON)',
    `bio` VARCHAR(500) DEFAULT NULL COMMENT '个人简介',
    `plan_type` SMALLINT NOT NULL DEFAULT 0 COMMENT '会员类型: 0-Free, 1-Pro, 2-Enterprise, 999-Admin',
    `plan_expired_at` DATETIME DEFAULT NULL COMMENT '会员到期时间',
    `status` TINYINT NOT NULL DEFAULT 1 COMMENT '状态: 0-禁用, 1-正常',
    `last_login_at` DATETIME DEFAULT NULL COMMENT '最后登录时间',
    `last_login_ip` VARCHAR(50) DEFAULT NULL COMMENT '最后登录 IP',
    `phone` VARCHAR(20) DEFAULT NULL COMMENT '手机号',
    `phone_verified` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '手机号是否已验证',
    `phone_verified_at` DATETIME DEFAULT NULL COMMENT '手机号验证时间',
    `register_type` TINYINT NOT NULL DEFAULT 1 COMMENT '注册方式: 1-邮箱注册, 2-手机号注册',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除: 0-未删除, 1-已删除',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_username` (`username`),
    UNIQUE KEY `uk_email` (`email`),
    UNIQUE KEY `uk_phone` (`phone`),
    KEY `idx_status` (`status`),
    KEY `idx_plan_type` (`plan_type`),
    KEY `idx_phone_verified` (`phone_verified`),
    KEY `idx_register_type` (`register_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';

CREATE TABLE IF NOT EXISTS `t_category` (
    `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '分类 ID',
    `name` VARCHAR(50) NOT NULL COMMENT '分类名称（英文）',
    `name_zh` VARCHAR(50) DEFAULT NULL COMMENT '分类名称（中文）',
    `icon` VARCHAR(50) NOT NULL COMMENT '图标名',
    `accent_color` VARCHAR(50) NOT NULL COMMENT '强调色',
    `description` VARCHAR(255) DEFAULT NULL COMMENT '描述',
    `sort_order` INT NOT NULL DEFAULT 0 COMMENT '排序值',
    `status` TINYINT NOT NULL DEFAULT 1 COMMENT '状态: 0-禁用, 1-正常',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除: 0-未删除, 1-已删除',
    PRIMARY KEY (`id`),
    KEY `idx_sort_order` (`sort_order`),
    KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='工具分类表';

CREATE TABLE IF NOT EXISTS `t_tool` (
    `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '工具 ID',
    `category_id` BIGINT NOT NULL COMMENT '分类 ID',
    `name` VARCHAR(100) NOT NULL COMMENT '工具名称（英文）',
    `name_zh` VARCHAR(100) DEFAULT NULL COMMENT '工具名称（中文）',
    `description` VARCHAR(500) DEFAULT NULL COMMENT '描述（英文）',
    `description_zh` VARCHAR(500) DEFAULT NULL COMMENT '描述（中文）',
    `icon` VARCHAR(50) NOT NULL COMMENT '图标名',
    `url` VARCHAR(500) DEFAULT NULL COMMENT '工具链接',
    `color_class` VARCHAR(100) DEFAULT NULL COMMENT '文字颜色类',
    `bg_hover_class` VARCHAR(100) DEFAULT NULL COMMENT '悬停背景色类',
    `tool_type` TINYINT NOT NULL DEFAULT 0 COMMENT '工具类型: 0-外链, 1-内置',
    `is_featured` TINYINT NOT NULL DEFAULT 0 COMMENT '是否精选',
    `view_count` BIGINT NOT NULL DEFAULT 0 COMMENT '浏览次数',
    `use_count` BIGINT NOT NULL DEFAULT 0 COMMENT '使用次数',
    `rating_score` DECIMAL(3,2) DEFAULT 0.00 COMMENT '平均评分',
    `rating_count` BIGINT DEFAULT 0 COMMENT '评分人数',
    `review_count` BIGINT DEFAULT 0 COMMENT '评论数量',
    `sort_order` INT NOT NULL DEFAULT 0 COMMENT '排序值',
    `status` TINYINT NOT NULL DEFAULT 1 COMMENT '状态: 0-禁用, 1-正常',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除: 0-未删除, 1-已删除',
    PRIMARY KEY (`id`),
    KEY `idx_category_id` (`category_id`),
    KEY `idx_status_sort` (`status`, `sort_order`),
    KEY `idx_featured` (`is_featured`),
    KEY `idx_view_count` (`view_count`),
    KEY `idx_use_count` (`use_count`),
    KEY `idx_rating` (`rating_score`),
    FULLTEXT KEY `ft_search` (`name`, `name_zh`, `description`, `description_zh`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='工具表';

CREATE TABLE IF NOT EXISTS `t_tool_usage` (
    `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '记录 ID',
    `user_id` BIGINT NOT NULL COMMENT '用户 ID, 0 表示匿名用户',
    `tool_id` BIGINT NOT NULL COMMENT '工具 ID',
    `used_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '使用时间',
    `duration` INT DEFAULT NULL COMMENT '使用时长（秒）',
    `ip_address` VARCHAR(50) DEFAULT NULL COMMENT 'IP 地址',
    `user_agent` VARCHAR(500) DEFAULT NULL COMMENT 'User-Agent',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '删除标记: 0-正常, 1-已删除',
    PRIMARY KEY (`id`),
    KEY `idx_user_time` (`user_id`, `used_at`),
    KEY `idx_tool_time` (`tool_id`, `used_at`),
    KEY `idx_used_at` (`used_at`),
    KEY `idx_deleted` (`deleted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='工具使用记录表';

CREATE TABLE IF NOT EXISTS `t_user_favorite` (
    `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '收藏 ID',
    `user_id` BIGINT NOT NULL COMMENT '用户 ID',
    `tool_id` BIGINT NOT NULL COMMENT '工具 ID',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '收藏时间',
    PRIMARY KEY (`id`),
    KEY `idx_tool_id` (`tool_id`),
    KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户收藏表';

CREATE TABLE IF NOT EXISTS `t_notification` (
    `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '通知 ID',
    `user_id` BIGINT NOT NULL COMMENT '用户 ID',
    `is_global` TINYINT NOT NULL DEFAULT 0 COMMENT '是否全局通知',
    `global_notification_id` BIGINT DEFAULT NULL COMMENT '全局通知批次 ID',
    `type` VARCHAR(50) NOT NULL COMMENT '通知类型',
    `title` VARCHAR(100) NOT NULL COMMENT '通知标题',
    `content` TEXT DEFAULT NULL COMMENT '通知内容',
    `link_url` VARCHAR(500) DEFAULT NULL COMMENT '点击跳转链接',
    `is_read` TINYINT NOT NULL DEFAULT 0 COMMENT '是否已读: 0-未读, 1-已读',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    `read_at` DATETIME DEFAULT NULL COMMENT '阅读时间',
    `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除: 0-未删除, 1-已删除',
    PRIMARY KEY (`id`),
    KEY `idx_user_read` (`user_id`, `is_read`),
    KEY `idx_created_at` (`created_at`),
    KEY `idx_type` (`type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='通知表';

CREATE TABLE IF NOT EXISTS `t_document_folder` (
    `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
    `user_id` BIGINT NOT NULL COMMENT '用户ID',
    `name` VARCHAR(100) NOT NULL COMMENT '文件夹名称',
    `parent_id` BIGINT DEFAULT NULL COMMENT '父文件夹ID',
    `sort_order` INT NOT NULL DEFAULT 0 COMMENT '排序顺序',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '删除标记',
    PRIMARY KEY (`id`),
    KEY `idx_user_id` (`user_id`),
    KEY `idx_parent_id` (`parent_id`),
    KEY `idx_sort_order` (`sort_order`),
    KEY `idx_deleted` (`deleted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='文档文件夹表';

CREATE TABLE IF NOT EXISTS `t_user_document` (
    `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
    `user_id` BIGINT NOT NULL COMMENT '用户ID',
    `title` VARCHAR(200) NOT NULL COMMENT '文档标题',
    `content` LONGTEXT DEFAULT NULL COMMENT '文档内容（Markdown格式）',
    `format` VARCHAR(20) NOT NULL DEFAULT 'markdown' COMMENT '文档格式',
    `folder_id` BIGINT DEFAULT NULL COMMENT '文件夹ID',
    `tags` VARCHAR(500) DEFAULT NULL COMMENT '标签（逗号分隔）',
    `is_template` TINYINT NOT NULL DEFAULT 0 COMMENT '是否模板',
    `view_count` BIGINT NOT NULL DEFAULT 0 COMMENT '浏览次数',
    `export_count` BIGINT NOT NULL DEFAULT 0 COMMENT '导出次数',
    `expire_at` DATETIME NOT NULL COMMENT '过期时间',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '删除标记',
    PRIMARY KEY (`id`),
    KEY `idx_user_id` (`user_id`),
    KEY `idx_folder_id` (`folder_id`),
    KEY `idx_expire_at` (`expire_at`),
    KEY `idx_created_at` (`created_at`),
    KEY `idx_is_template` (`is_template`),
    KEY `idx_deleted` (`deleted`),
    FULLTEXT KEY `ft_title_content` (`title`, `content`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户文档表';

CREATE TABLE IF NOT EXISTS `t_document_version` (
    `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
    `document_id` BIGINT NOT NULL COMMENT '文档ID',
    `content` LONGTEXT NOT NULL COMMENT '版本内容',
    `version_number` INT NOT NULL COMMENT '版本号',
    `expire_at` DATETIME NOT NULL COMMENT '过期时间',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '删除标记',
    PRIMARY KEY (`id`),
    KEY `idx_document_id` (`document_id`),
    KEY `idx_expire_at` (`expire_at`),
    KEY `idx_created_at` (`created_at`),
    KEY `idx_version_number` (`version_number`),
    KEY `idx_deleted` (`deleted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='文档版本历史表';

CREATE TABLE IF NOT EXISTS `t_document_export` (
    `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',
    `document_id` BIGINT NOT NULL COMMENT '文档ID',
    `user_id` BIGINT NOT NULL COMMENT '用户ID',
    `format` VARCHAR(20) NOT NULL COMMENT '导出格式',
    `file_size` BIGINT DEFAULT NULL COMMENT '文件大小（字节）',
    `file_url` VARCHAR(500) DEFAULT NULL COMMENT '文件URL',
    `batch_id` VARCHAR(50) DEFAULT NULL COMMENT '批量导出ID',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '删除标记',
    PRIMARY KEY (`id`),
    KEY `idx_document_id` (`document_id`),
    KEY `idx_user_id` (`user_id`),
    KEY `idx_batch_id` (`batch_id`),
    KEY `idx_created_at` (`created_at`),
    KEY `idx_format` (`format`),
    KEY `idx_deleted` (`deleted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='导出记录表';

-- 文档模块常用组合索引
CREATE INDEX `idx_user_document_user_folder` ON `t_user_document` (`user_id`, `folder_id`, `deleted`);
CREATE INDEX `idx_user_document_user_expire` ON `t_user_document` (`user_id`, `expire_at`, `deleted`);
CREATE INDEX `idx_document_folder_user_parent` ON `t_document_folder` (`user_id`, `parent_id`);
CREATE INDEX `idx_document_version_doc_expire` ON `t_document_version` (`document_id`, `expire_at`);
CREATE INDEX `idx_document_export_user_batch` ON `t_document_export` (`user_id`, `batch_id`);
