package com.polaris.email.entity;

/**
 * 邮件优先级枚举
 */
public enum EmailPriority {
    /**
     * 高优先级（验证码、密码重置等）
     */
    HIGH,
    
    /**
     * 中优先级（登录通知等）
     */
    MEDIUM,
    
    /**
     * 低优先级（营销邮件等）
     */
    LOW
}
