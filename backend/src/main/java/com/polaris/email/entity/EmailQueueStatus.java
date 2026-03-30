package com.polaris.email.entity;

/**
 * 邮件队列状态枚举
 */
public enum EmailQueueStatus {
    /**
     * 待发送
     */
    PENDING,
    
    /**
     * 处理中
     */
    PROCESSING,
    
    /**
     * 已发送
     */
    SENT,
    
    /**
     * 发送失败
     */
    FAILED
}
