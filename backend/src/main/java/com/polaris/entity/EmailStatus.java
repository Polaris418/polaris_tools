package com.polaris.entity;

/**
 * 邮件发送状态枚举
 */
public enum EmailStatus {
    /**
     * 待发送
     */
    PENDING,
    
    /**
     * 已发送
     */
    SENT,
    
    /**
     * 发送失败
     */
    FAILED,
    
    /**
     * 重试中
     */
    RETRYING
}
