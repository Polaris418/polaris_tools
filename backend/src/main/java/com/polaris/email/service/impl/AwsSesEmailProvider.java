package com.polaris.email.service.impl;

import com.polaris.email.config.AwsSesConfig;
import com.polaris.email.dto.SendEmailResult;
import com.polaris.email.service.EmailProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.sesv2.SesV2Client;
import software.amazon.awssdk.services.sesv2.model.Body;
import software.amazon.awssdk.services.sesv2.model.Content;
import software.amazon.awssdk.services.sesv2.model.Destination;
import software.amazon.awssdk.services.sesv2.model.EmailContent;
import software.amazon.awssdk.services.sesv2.model.Message;
import software.amazon.awssdk.services.sesv2.model.SendEmailRequest;
import software.amazon.awssdk.services.sesv2.model.SendEmailResponse;
import software.amazon.awssdk.services.sesv2.model.SesV2Exception;

/**
 * AWS SES 邮件服务提供商实现
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AwsSesEmailProvider implements EmailProvider {
    
    private final SesV2Client sesV2Client;
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
            Content subjectContent = Content.builder()
                    .data(subject)
                    .charset("UTF-8")
                    .build();

            Body.Builder bodyBuilder = Body.builder();
            if (htmlContent != null && !htmlContent.isEmpty()) {
                bodyBuilder.html(Content.builder().data(htmlContent).charset("UTF-8").build());
            }
            if (textContent != null && !textContent.isEmpty()) {
                bodyBuilder.text(Content.builder().data(textContent).charset("UTF-8").build());
            }

            Message message = Message.builder()
                    .subject(subjectContent)
                    .body(bodyBuilder.build())
                    .build();

            SendEmailRequest.Builder requestBuilder = SendEmailRequest.builder()
                    .fromEmailAddress(awsSesConfig.getDefaultFromEmail())
                    .destination(Destination.builder().toAddresses(to).build())
                    .content(EmailContent.builder().simple(message).build());

            if (awsSesConfig.getConfigurationSetName() != null && !awsSesConfig.getConfigurationSetName().isEmpty()) {
                requestBuilder.configurationSetName(awsSesConfig.getConfigurationSetName());
            }

            SendEmailResponse response = sesV2Client.sendEmail(requestBuilder.build());
            return SendEmailResult.success(response.messageId());
        } catch (SesV2Exception e) {
            log.error("[AWS SES] 发送邮件失败: to={}, subject={}, code={}", to, subject, e.awsErrorDetails().errorCode(), e);
            return SendEmailResult.failure(
                    e.awsErrorDetails().errorCode(),
                    e.awsErrorDetails().errorMessage(),
                    isRetryable(e)
            );
        } catch (Exception e) {
            log.error("[AWS SES] 发送邮件异常: to={}, subject={}", to, subject, e);
            return SendEmailResult.builder()
                    .success(false)
                    .errorCode("AWS_SES_EXCEPTION")
                    .errorMessage("发送邮件异常: " + e.getMessage())
                    .build();
        }
    }
    
    private boolean isRetryable(SesV2Exception e) {
        String errorCode = e.awsErrorDetails().errorCode();
        return "Throttling".equals(errorCode)
                || "ServiceUnavailable".equals(errorCode)
                || "InternalFailure".equals(errorCode)
                || "RequestTimeout".equals(errorCode);
    }

    @Override
    public boolean isAvailable() {
        return awsSesConfig.isEnabled()
                && awsSesConfig.getFromEmail() != null
                && !awsSesConfig.getFromEmail().isEmpty();
    }
}
