package com.polaris.email.service;

import com.polaris.email.dto.SendEmailRequest;
import com.polaris.email.dto.SendEmailResponse;

import java.util.Map;

/**
 * 邮件服务接口
 */
public interface EmailService {
    
    /**
     * 发送邮件
     * 
     * @param request 发送邮件请求
     * @return 发送结果
     */
    SendEmailResponse sendEmail(SendEmailRequest request);
    
    /**
     * 发送简单邮件
     * 
     * @param to 收件人
     * @param subject 主题
     * @param htmlContent HTML 内容
     * @return 发送结果
     */
    SendEmailResponse sendSimpleEmail(String to, String subject, String htmlContent);
    
    /**
     * 发送欢迎邮件
     * 
     * @param to 收件人
     * @param username 用户名
     * @return 发送结果
     */
    SendEmailResponse sendWelcomeEmail(String to, String username);
    
    /**
     * 发送密码重置邮件
     * 
     * @param to 收件人
     * @param username 用户名
     * @param resetLink 重置链接
     * @return 发送结果
     */
    SendEmailResponse sendPasswordResetEmail(String to, String username, String resetLink);
    
    /**
     * 发送邮箱验证邮件
     * 
     * @param to 收件人
     * @param username 用户名
     * @param verificationCode 验证码
     * @return 发送结果
     */
    SendEmailResponse sendEmailVerification(String to, String username, String verificationCode);
    
    /**
     * 发送密码修改验证码邮件
     * 
     * @param to 收件人
     * @param username 用户名
     * @param verificationCode 验证码
     * @param language 语言代码
     * @return 发送结果
     */
    SendEmailResponse sendPasswordChangeCode(String to, String username, String verificationCode, String language);
    
    /**
     * 发送登录验证码邮件
     * 
     * @param to 收件人
     * @param username 用户名
     * @param verificationCode 验证码
     * @param language 语言代码
     * @return 发送结果
     */
    SendEmailResponse sendLoginCode(String to, String username, String verificationCode, String language);
    
    /**
     * 发送密码重置验证码邮件
     * 
     * @param to 收件人
     * @param username 用户名
     * @param verificationCode 验证码
     * @param language 语言代码
     * @return 发送结果
     */
    SendEmailResponse sendPasswordResetCode(String to, String username, String verificationCode, String language);
    
    /**
     * 发送登录通知邮件
     * 
     * @param to 收件人
     * @param username 用户名
     * @param loginTime 登录时间
     * @param ipAddress IP 地址
     * @param device 设备信息
     * @return 发送结果
     */
    SendEmailResponse sendLoginNotification(String to, String username, String loginTime, String ipAddress, String device);
    
    /**
     * 发送邮箱验证邮件（使用 Token）
     * 生成验证 Token 并发送验证邮件
     * 
     * @param userId 用户 ID
     * @param to 收件人
     * @param username 用户名
     * @return 发送结果
     */
    SendEmailResponse sendEmailVerificationWithToken(Long userId, String to, String username);
    
    /**
     * 发送密码重置邮件（使用 Token）
     * 生成重置 Token 并发送重置邮件
     * 
     * @param userId 用户 ID
     * @param to 收件人
     * @param username 用户名
     * @return 发送结果
     */
    SendEmailResponse sendPasswordResetWithToken(Long userId, String to, String username);
    
    /**
     * 使用模板系统发送邮件
     * 
     * @param to 收件人
     * @param templateCode 模板代码
     * @param language 语言代码
     * @param variables 模板变量
     * @return 发送结果
     */
    SendEmailResponse sendEmailWithTemplate(String to, String templateCode, String language, Map<String, Object> variables);
}
