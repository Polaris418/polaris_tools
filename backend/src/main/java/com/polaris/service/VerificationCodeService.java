package com.polaris.service;

import com.polaris.dto.verification.SendVerificationCodeResponse;
import com.polaris.entity.VerificationPurpose;

/**
 * 验证码服务接口
 * 负责验证码的生成、验证和管理
 */
public interface VerificationCodeService {
    
    /**
     * 生成并发送验证码
     * 
     * @param email 邮箱地址
     * @param purpose 验证码用途
     * @param language 语言代码（zh-CN 或 en-US）
     * @return 发送结果，包含冷却时间和过期时间
     */
    SendVerificationCodeResponse generateAndSendCode(String email, VerificationPurpose purpose, String language);
    
    /**
     * 验证验证码
     * 
     * @param email 邮箱地址
     * @param code 验证码（6位数字）
     * @param purpose 验证码用途
     * @return 验证是否成功
     */
    boolean verifyCode(String email, String code, VerificationPurpose purpose);
    
    /**
     * 使验证码失效
     * 
     * @param email 邮箱地址
     * @param purpose 验证码用途
     */
    void invalidateCode(String email, VerificationPurpose purpose);
}
