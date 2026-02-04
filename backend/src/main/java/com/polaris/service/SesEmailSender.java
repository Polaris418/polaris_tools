package com.polaris.service;

import com.polaris.config.AwsSesConfig;
import com.polaris.dto.email.EmailRequest;
import com.polaris.dto.email.SendEmailResult;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import software.amazon.awssdk.services.sesv2.SesV2Client;
import software.amazon.awssdk.services.sesv2.model.*;

/**
 * AWS SES 邮件发送器
 * 封装 AWS SDK 调用，负责实际的邮件发送操作
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class SesEmailSender {
    
    private final SesV2Client sesV2Client;
    private final AwsSesConfig config;
    
    /**
     * 发送邮件
     * 
     * @param request 邮件请求
     * @return 发送结果
     */
    public SendEmailResult sendEmail(EmailRequest request) {
        try {
            // 构建目标地址
            Destination.Builder destinationBuilder = Destination.builder();
            
            if (request.getTo() != null && !request.getTo().isEmpty()) {
                destinationBuilder.toAddresses(request.getTo());
            }
            
            if (request.getCc() != null && !request.getCc().isEmpty()) {
                destinationBuilder.ccAddresses(request.getCc());
            }
            
            if (request.getBcc() != null && !request.getBcc().isEmpty()) {
                destinationBuilder.bccAddresses(request.getBcc());
            }
            
            Destination destination = destinationBuilder.build();
            
            // 构建邮件内容
            Content subject = Content.builder()
                    .data(request.getSubject())
                    .charset("UTF-8")
                    .build();
            
            Body.Builder bodyBuilder = Body.builder();
            
            if (request.getHtml() != null && !request.getHtml().isEmpty()) {
                Content htmlContent = Content.builder()
                        .data(request.getHtml())
                        .charset("UTF-8")
                        .build();
                bodyBuilder.html(htmlContent);
            }
            
            if (request.getText() != null && !request.getText().isEmpty()) {
                Content textContent = Content.builder()
                        .data(request.getText())
                        .charset("UTF-8")
                        .build();
                bodyBuilder.text(textContent);
            }
            
            Message message = Message.builder()
                    .subject(subject)
                    .body(bodyBuilder.build())
                    .build();
            
            EmailContent emailContent = EmailContent.builder()
                    .simple(message)
                    .build();
            
            // 构建发送请求
            // 根据邮件类型自动选择发件人地址
            String fromEmail = request.getFromEmail();
            if (fromEmail == null || fromEmail.isEmpty()) {
                // 如果请求中未指定发件人，根据邮件类型自动选择
                if (request.getEmailType() != null && !request.getEmailType().isEmpty()) {
                    fromEmail = config.getFromEmailByType(request.getEmailType());
                } else {
                    // 使用默认发件人地址
                    fromEmail = config.getDefaultFromEmail();
                }
            }
            
            software.amazon.awssdk.services.sesv2.model.SendEmailRequest.Builder requestBuilder = 
                    software.amazon.awssdk.services.sesv2.model.SendEmailRequest.builder()
                    .fromEmailAddress(fromEmail)
                    .destination(destination)
                    .content(emailContent);
            
            // 设置回复地址
            if (request.getReplyTo() != null && !request.getReplyTo().isEmpty()) {
                requestBuilder.replyToAddresses(request.getReplyTo());
            } else if (request.getEmailType() != null && !request.getEmailType().isEmpty()) {
                // 如果未指定 Reply-To，根据邮件类型自动选择
                String replyTo = config.getReplyToByType(request.getEmailType());
                if (replyTo != null && !replyTo.isEmpty()) {
                    requestBuilder.replyToAddresses(replyTo);
                }
            }
            
            // 设置配置集
            if (config.getConfigurationSetName() != null && !config.getConfigurationSetName().isEmpty()) {
                requestBuilder.configurationSetName(config.getConfigurationSetName());
            }
            
            // 发送邮件
            long startTime = System.currentTimeMillis();
            SendEmailResponse response = sesV2Client.sendEmail(requestBuilder.build());
            long duration = System.currentTimeMillis() - startTime;
            
            log.info("邮件发送成功: messageId={}, to={}, subject={}, duration={}ms",
                    response.messageId(), request.getTo(), request.getSubject(), duration);
            
            return SendEmailResult.success(response.messageId());
            
        } catch (SesV2Exception e) {
            log.error("AWS SES 邮件发送失败: to={}, subject={}, error={}",
                    request.getTo(), request.getSubject(), e.awsErrorDetails().errorMessage(), e);
            
            return SendEmailResult.failure(
                    e.awsErrorDetails().errorCode(),
                    e.awsErrorDetails().errorMessage(),
                    isRetryable(e)
            );
        } catch (Exception e) {
            log.error("邮件发送异常: to={}, subject={}, error={}",
                    request.getTo(), request.getSubject(), e.getMessage(), e);
            
            return SendEmailResult.failure("UNKNOWN_ERROR", e.getMessage(), false);
        }
    }
    
    /**
     * 判断错误是否可重试
     * 
     * @param e AWS SES 异常
     * @return 是否可重试
     */
    private boolean isRetryable(SesV2Exception e) {
        String errorCode = e.awsErrorDetails().errorCode();
        
        // 可重试的错误代码
        return "Throttling".equals(errorCode) ||
               "ServiceUnavailable".equals(errorCode) ||
               "InternalFailure".equals(errorCode) ||
               "RequestTimeout".equals(errorCode);
    }
}
