package com.polaris.email.entity;

import com.baomidou.mybatisplus.annotation.*;
import com.polaris.common.base.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;
import java.time.LocalDateTime;

/**
 * 邮件审计日志实体
 * 对应表：email_audit_log
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("email_audit_log")
public class EmailAuditLog extends BaseEntity {
    
    /**
     * 收件人邮箱地址
     */
    @TableField("recipient")
    private String recipient;
    
    /**
     * 邮件主题
     */
    @TableField("subject")
    private String subject;
    
    /**
     * 邮件类型
     */
    @TableField("email_type")
    private String emailType;
    
    /**
     * 发送状态
     */
    @TableField("status")
    private EmailStatus status;
    
    /**
     * AWS SES 消息 ID
     */
    @TableField("message_id")
    private String messageId;
    
    /**
     * 错误代码
     */
    @TableField("error_code")
    private String errorCode;
    
    /**
     * 错误消息
     */
    @TableField("error_message")
    private String errorMessage;
    
    /**
     * 发送时间
     */
    @TableField("sent_at")
    private LocalDateTime sentAt;
}
