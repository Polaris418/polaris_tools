package com.polaris.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.polaris.common.base.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;

/**
 * 验证码告警历史实体
 * 记录所有告警事件
 * 
 * Requirements: 需求13 - 监控和日志
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("verification_alert_history")
public class VerificationAlertHistory extends BaseEntity {
    
    /**
     * 告警类型
     * SEND_FAILURE_RATE: 发送失败率告警
     * VERIFY_FAILURE_RATE: 验证失败率告警
     * RATE_LIMIT_TRIGGERS: 限流触发告警
     * ANOMALY_DETECTION: 异常行为检测告警
     */
    private String alertType;
    
    /**
     * 告警标题
     */
    private String title;
    
    /**
     * 告警消息
     */
    private String message;
    
    /**
     * 告警级别
     * INFO: 信息
     * WARNING: 警告
     * CRITICAL: 严重
     */
    private String level;
    
    /**
     * 告警时间
     */
    private LocalDateTime alertTime;
    
    /**
     * 是否已处理
     */
    private Boolean resolved;
    
    /**
     * 处理时间
     */
    private LocalDateTime resolvedTime;
    
    /**
     * 处理人
     */
    private String resolvedBy;
    
    /**
     * 处理备注
     */
    private String resolveNote;
}
