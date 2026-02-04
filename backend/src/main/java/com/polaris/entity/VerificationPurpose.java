package com.polaris.entity;

/**
 * 验证码用途枚举
 */
public enum VerificationPurpose {
    /**
     * 注册
     */
    REGISTER,
    
    /**
     * 登录
     */
    LOGIN,
    
    /**
     * 密码重置
     */
    RESET,
    
    /**
     * 邮箱验证
     */
    VERIFY,
    
    /**
     * 邮箱修改
     */
    CHANGE
}
