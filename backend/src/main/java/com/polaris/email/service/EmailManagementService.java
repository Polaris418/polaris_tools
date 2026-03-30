package com.polaris.email.service;

import com.polaris.dto.verification.ChangeEmailRequest;
import com.polaris.dto.verification.SendVerificationCodeResponse;
import com.polaris.dto.verification.VerifyEmailChangeRequest;

/**
 * 邮箱管理服务接口
 * 负责邮箱修改相关的业务逻辑
 */
public interface EmailManagementService {
    
    /**
     * 发送邮箱修改验证码
     * 验证当前密码，检查新邮箱唯一性，生成并发送验证码到新邮箱
     * 
     * @param request 邮箱修改请求
     * @return 发送结果，包含冷却时间和过期时间
     */
    SendVerificationCodeResponse sendChangeEmailCode(ChangeEmailRequest request);
    
    /**
     * 验证邮箱修改
     * 验证验证码，更新用户邮箱，标记新邮箱为已验证，发送通知邮件到旧邮箱
     * 
     * @param request 验证邮箱修改请求
     */
    void verifyEmailChange(VerifyEmailChangeRequest request);
}
