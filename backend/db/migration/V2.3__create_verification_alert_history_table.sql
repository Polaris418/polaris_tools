-- 创建验证码告警历史表
-- Requirements: 需求13 - 监控和日志

CREATE TABLE IF NOT EXISTS verification_alert_history (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键ID',
    alert_type VARCHAR(50) NOT NULL COMMENT '告警类型: SEND_FAILURE_RATE/VERIFY_FAILURE_RATE/RATE_LIMIT_TRIGGERS/ANOMALY_DETECTION',
    title VARCHAR(200) NOT NULL COMMENT '告警标题',
    message TEXT COMMENT '告警消息',
    level VARCHAR(20) NOT NULL COMMENT '告警级别: INFO/WARNING/CRITICAL',
    alert_time DATETIME NOT NULL COMMENT '告警时间',
    resolved TINYINT DEFAULT 0 COMMENT '是否已处理: 0-未处理, 1-已处理',
    resolved_time DATETIME COMMENT '处理时间',
    resolved_by VARCHAR(100) COMMENT '处理人',
    resolve_note VARCHAR(500) COMMENT '处理备注',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    deleted TINYINT DEFAULT 0 COMMENT '软删除标记: 0-未删除, 1-已删除',
    
    INDEX idx_alert_type (alert_type),
    INDEX idx_alert_time (alert_time),
    INDEX idx_level (level),
    INDEX idx_resolved (resolved),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='验证码告警历史表';
