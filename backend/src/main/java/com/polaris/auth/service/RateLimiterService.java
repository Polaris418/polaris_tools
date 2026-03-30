package com.polaris.auth.service;

import com.polaris.entity.VerificationPurpose;

/**
 * 限流服务接口
 * 用于防止验证码滥用和攻击
 */
public interface RateLimiterService {
    
    /**
     * 检查邮箱级限流
     * 
     * @param email 邮箱地址
     * @param purpose 验证码用途
     * @return 是否允许发送（true: 允许, false: 被限流）
     */
    boolean checkEmailRateLimit(String email, VerificationPurpose purpose);
    
    /**
     * 检查IP级限流
     * 
     * @param ipAddress IP地址
     * @return 是否允许发送（true: 允许, false: 被限流）
     */
    boolean checkIpRateLimit(String ipAddress);
    
    /**
     * 记录发送尝试
     * 
     * @param email 邮箱地址
     * @param purpose 验证码用途
     * @param ipAddress IP地址
     */
    void recordAttempt(String email, VerificationPurpose purpose, String ipAddress);
    
    /**
     * 获取邮箱剩余冷却时间（秒）
     * 
     * @param email 邮箱地址
     * @param purpose 验证码用途
     * @return 剩余冷却时间（秒），0表示无冷却
     */
    long getEmailCooldownSeconds(String email, VerificationPurpose purpose);
    
    /**
     * 获取IP剩余冷却时间（秒）
     * 
     * @param ipAddress IP地址
     * @return 剩余冷却时间（秒），0表示无冷却
     */
    long getIpCooldownSeconds(String ipAddress);
    
    /**
     * 检查邮箱是否被封禁
     * 
     * @param email 邮箱地址
     * @param purpose 验证码用途
     * @return 是否被封禁
     */
    boolean isEmailBlocked(String email, VerificationPurpose purpose);
    
    /**
     * 封禁邮箱（验证失败次数过多）
     * 
     * @param email 邮箱地址
     * @param purpose 验证码用途
     * @param durationMinutes 封禁时长（分钟）
     */
    void blockEmail(String email, VerificationPurpose purpose, int durationMinutes);
    
    /**
     * 重置限流计数器（管理员功能）
     * 
     * @param email 邮箱地址
     * @param purpose 验证码用途
     */
    void resetEmailRateLimit(String email, VerificationPurpose purpose);
    
    /**
     * 重置IP限流计数器（管理员功能）
     * 
     * @param ipAddress IP地址
     */
    void resetIpRateLimit(String ipAddress);
}
