package com.polaris.email.service;

import com.polaris.email.dto.SendEmailResult;

/**
 * 邮件服务提供商接口
 * 
 * 支持多种邮件服务提供商（AWS SES、Resend 等）
 */
public interface EmailProvider {
    
    /**
     * 获取提供商名称
     * 
     * @return 提供商名称（aws-ses, resend 等）
     */
    String getProviderName();
    
    /**
     * 发送邮件
     * 
     * @param to 收件人邮箱
     * @param subject 邮件主题
     * @param htmlContent HTML 内容
     * @return 发送结果
     */
    SendEmailResult sendEmail(String to, String subject, String htmlContent);
    
    /**
     * 发送邮件（支持纯文本备选）
     * 
     * @param to 收件人邮箱
     * @param subject 邮件主题
     * @param htmlContent HTML 内容
     * @param textContent 纯文本内容（可选）
     * @return 发送结果
     */
    SendEmailResult sendEmail(String to, String subject, String htmlContent, String textContent);
    
    /**
     * 检查提供商是否可用
     * 
     * @return 是否可用
     */
    boolean isAvailable();
}
