package com.polaris.service.impl;

import com.polaris.config.AwsSesConfig;
import com.polaris.dto.email.EmailRequest;
import com.polaris.dto.email.SendEmailResult;
import com.polaris.service.EmailProvider;
import com.polaris.service.SesEmailSender;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * AWS SES 邮件服务提供商实现
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AwsSesEmailProvider implements EmailProvider {
    
    private final SesEmailSender sesEmailSender;
    private final AwsSesConfig awsSesConfig;
    
    @Override
    public String getProviderName() {
        return "aws-ses";
    }
    
    @Override
    public SendEmailResult sendEmail(String to, String subject, String htmlContent) {
        return sendEmail(to, subject, htmlContent, null);
    }
    
    @Override
    public SendEmailResult sendEmail(String to, String subject, String htmlContent, String textContent) {
        if (!isAvailable()) {
            log.warn("AWS SES 邮件服务未启用或配置不完整");
            return SendEmailResult.builder()
                    .success(false)
                    .errorCode("PROVIDER_UNAVAILABLE")
                    .errorMessage("AWS SES 邮件服务未启用")
                    .build();
        }
        
        try {
            log.debug("[AWS SES] 发送邮件请求: to={}, subject={}", to, subject);
            
            // 构建邮件请求
            EmailRequest emailRequest = EmailRequest.builder()
                    .to(List.of(to))
                    .subject(subject)
                    .html(htmlContent)
                    .text(textContent)
                    .build();
            
            // 使用现有的 SesEmailSender 发送
            SendEmailResult result = sesEmailSender.sendEmail(emailRequest);
            
            if (result.isSuccess()) {
                log.info("[AWS SES] 邮件发送成功: to={}, subject={}, messageId={}", 
                        to, subject, result.getMessageId());
            } else {
                log.error("[AWS SES] 邮件发送失败: to={}, subject={}, error={}", 
                        to, subject, result.getErrorMessage());
            }
            
            return result;
        } catch (Exception e) {
            log.error("[AWS SES] 发送邮件异常: to={}, subject={}", to, subject, e);
            return SendEmailResult.builder()
                    .success(false)
                    .errorCode("AWS_SES_EXCEPTION")
                    .errorMessage("发送邮件异常: " + e.getMessage())
                    .build();
        }
    }
    
    @Override
    public boolean isAvailable() {
        return awsSesConfig.isEnabled()
                && awsSesConfig.getFromEmail() != null
                && !awsSesConfig.getFromEmail().isEmpty();
    }
}
