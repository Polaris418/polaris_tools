package com.polaris.email.entity;

import com.baomidou.mybatisplus.annotation.*;
import com.polaris.common.base.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;
import java.time.LocalDateTime;

/**
 * 邮件队列实体
 * 对应表：email_queue
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("email_queue")
public class EmailQueue extends BaseEntity {
    
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
     * HTML 内容
     */
    @TableField("html_content")
    private String htmlContent;
    
    /**
     * 纯文本内容
     */
    @TableField("text_content")
    private String textContent;
    
    /**
     * 邮件类型
     */
    @TableField("email_type")
    private String emailType;
    
    /**
     * 优先级：HIGH(高), MEDIUM(中), LOW(低)
     */
    @TableField("priority")
    private EmailPriority priority;
    
    /**
     * 队列状态
     */
    @TableField("status")
    private EmailQueueStatus status;
    
    /**
     * 重试次数
     */
    @TableField("retry_count")
    private Integer retryCount;
    
    /**
     * 计划发送时间
     */
    @TableField("scheduled_at")
    private LocalDateTime scheduledAt;
    
    /**
     * 实际发送时间
     */
    @TableField("sent_at")
    private LocalDateTime sentAt;
    
    /**
     * 错误消息
     */
    @TableField("error_message")
    private String errorMessage;
}
