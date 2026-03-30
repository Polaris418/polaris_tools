package com.polaris.email.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

/**
 * 邮件模板类型枚举
 */
@Getter
@AllArgsConstructor
public enum EmailTemplateType {
    
    /**
     * 欢迎邮件
     */
    WELCOME("welcome", "欢迎加入 Polaris Tools"),
    
    /**
     * 密码重置
     */
    PASSWORD_RESET("password_reset", "重置您的密码"),
    
    /**
     * 邮箱验证
     */
    EMAIL_VERIFICATION("email_verification", "验证您的邮箱"),
    
    /**
     * 账户激活
     */
    ACCOUNT_ACTIVATION("account_activation", "激活您的账户"),
    
    /**
     * 登录通知
     */
    LOGIN_NOTIFICATION("login_notification", "新设备登录通知"),
    
    /**
     * 密码更改通知
     */
    PASSWORD_CHANGED("password_changed", "密码已更改"),
    
    /**
     * 订阅确认
     */
    SUBSCRIPTION_CONFIRMED("subscription_confirmed", "订阅确认"),
    
    /**
     * 通用通知
     */
    NOTIFICATION("notification", "通知");
    
    private final String code;
    private final String defaultSubject;
}
