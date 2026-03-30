package com.polaris.email.service;

import com.polaris.entity.VerificationPurpose;

import java.util.concurrent.CompletableFuture;

/**
 * 异步验证码邮件服务接口
 * 使用消息队列异步发送验证码邮件，提高系统性能
 */
public interface AsyncVerificationEmailService {
    
    /**
     * 异步发送验证码邮件
     * 
     * @param email 收件人邮箱
     * @param code 验证码
     * @param purpose 验证码用途
     * @param language 语言代码（zh-CN 或 en-US）
     * @return CompletableFuture，包含发送结果
     */
    CompletableFuture<Boolean> sendVerificationCodeAsync(
            String email, 
            String code, 
            VerificationPurpose purpose, 
            String language
    );
    
    /**
     * 异步发送邮箱修改通知邮件
     * 
     * @param oldEmail 旧邮箱地址
     * @param newEmail 新邮箱地址
     * @param language 语言代码
     * @return CompletableFuture，包含发送结果
     */
    CompletableFuture<Boolean> sendEmailChangeNotificationAsync(
            String oldEmail, 
            String newEmail, 
            String language
    );
    
    /**
     * 获取邮件队列长度
     * 
     * @return 队列长度
     */
    long getQueueLength();
    
    /**
     * 获取邮件发送成功率
     * 
     * @return 成功率（0.0 - 1.0）
     */
    double getSuccessRate();
}
