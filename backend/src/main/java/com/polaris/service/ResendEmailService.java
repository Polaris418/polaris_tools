package com.polaris.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.polaris.config.ResendConfig;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import okhttp3.*;
import org.springframework.stereotype.Service;

import java.util.*;

/**
 * Resend 邮件服务
 * 
 * 使用 Resend API 发送邮件
 * 文档：https://resend.com/docs/api-reference/emails/send-email
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ResendEmailService {
    
    private final ResendConfig resendConfig;
    private final OkHttpClient httpClient = new OkHttpClient();
    private final ObjectMapper objectMapper = new ObjectMapper();
    
    /**
     * 发送邮件
     * 
     * @param to 收件人邮箱
     * @param subject 邮件主题
     * @param htmlContent HTML 内容
     * @return 邮件 ID
     */
    public String sendEmail(String to, String subject, String htmlContent) {
        return sendEmail(to, subject, htmlContent, null);
    }
    
    /**
     * 发送邮件（支持纯文本备选）
     * 
     * @param to 收件人邮箱
     * @param subject 邮件主题
     * @param htmlContent HTML 内容
     * @param textContent 纯文本内容（可选，作为 HTML 的备选）
     * @return 邮件 ID
     */
    public String sendEmail(String to, String subject, String htmlContent, String textContent) {
        if (!resendConfig.isEnabled()) {
            log.warn("Resend 邮件服务未启用");
            throw new RuntimeException("邮件服务未启用");
        }
        
        try {
            // 构建请求体
            Map<String, Object> emailData = new HashMap<>();
            emailData.put("from", resendConfig.getFromName() + " <" + resendConfig.getFromEmail() + ">");
            emailData.put("to", Collections.singletonList(to));
            emailData.put("subject", subject);
            emailData.put("html", htmlContent);
            
            if (textContent != null && !textContent.isEmpty()) {
                emailData.put("text", textContent);
            }
            
            String jsonBody = objectMapper.writeValueAsString(emailData);
            
            log.debug("发送邮件请求: to={}, subject={}", to, subject);
            
            // 构建 HTTP 请求
            Request request = new Request.Builder()
                    .url(resendConfig.getApiUrl() + "/emails")
                    .post(RequestBody.create(jsonBody, MediaType.parse("application/json")))
                    .addHeader("Authorization", "Bearer " + resendConfig.getApiKey())
                    .addHeader("Content-Type", "application/json")
                    .build();
            
            // 发送请求
            try (Response response = httpClient.newCall(request).execute()) {
                String responseBody = response.body() != null ? response.body().string() : "";
                
                if (response.isSuccessful()) {
                    // 解析响应获取邮件 ID
                    @SuppressWarnings("unchecked")
                    Map<String, Object> result = objectMapper.readValue(responseBody, Map.class);
                    String emailId = (String) result.get("id");
                    log.info("邮件发送成功: to={}, subject={}, emailId={}", to, subject, emailId);
                    return emailId;
                } else {
                    log.error("邮件发送失败: code={}, body={}", response.code(), responseBody);
                    throw new RuntimeException("邮件发送失败: " + responseBody);
                }
            }
        } catch (Exception e) {
            log.error("发送邮件异常: to={}, subject={}", to, subject, e);
            throw new RuntimeException("发送邮件失败: " + e.getMessage(), e);
        }
    }
    
    /**
     * 批量发送邮件
     * 
     * @param emails 邮件列表
     * @return 邮件 ID 列表
     */
    public List<String> sendBatchEmails(List<EmailRequest> emails) {
        List<String> emailIds = new ArrayList<>();
        
        for (EmailRequest email : emails) {
            try {
                String emailId = sendEmail(
                    email.getTo(),
                    email.getSubject(),
                    email.getHtmlContent(),
                    email.getTextContent()
                );
                emailIds.add(emailId);
            } catch (Exception e) {
                log.error("批量发送邮件失败: to={}", email.getTo(), e);
                emailIds.add(null); // 失败的邮件添加 null
            }
        }
        
        return emailIds;
    }
    
    /**
     * 发送带附件的邮件
     * 
     * @param to 收件人邮箱
     * @param subject 邮件主题
     * @param htmlContent HTML 内容
     * @param attachmentName 附件名称
     * @param attachmentContent 附件内容（字节数组）
     * @return 邮件 ID
     */
    public String sendEmailWithAttachment(String to, String subject, String htmlContent,
                                         String attachmentName, byte[] attachmentContent) {
        if (!resendConfig.isEnabled()) {
            log.warn("Resend 邮件服务未启用");
            throw new RuntimeException("邮件服务未启用");
        }
        
        try {
            // 构建请求体
            Map<String, Object> emailData = new HashMap<>();
            emailData.put("from", resendConfig.getFromName() + " <" + resendConfig.getFromEmail() + ">");
            emailData.put("to", Collections.singletonList(to));
            emailData.put("subject", subject);
            emailData.put("html", htmlContent);
            
            // 添加附件（Base64 编码）
            Map<String, String> attachment = new HashMap<>();
            attachment.put("filename", attachmentName);
            attachment.put("content", Base64.getEncoder().encodeToString(attachmentContent));
            emailData.put("attachments", Collections.singletonList(attachment));
            
            String jsonBody = objectMapper.writeValueAsString(emailData);
            
            log.debug("发送带附件邮件请求: to={}, subject={}, attachment={}", to, subject, attachmentName);
            
            // 构建 HTTP 请求
            Request request = new Request.Builder()
                    .url(resendConfig.getApiUrl() + "/emails")
                    .post(RequestBody.create(jsonBody, MediaType.parse("application/json")))
                    .addHeader("Authorization", "Bearer " + resendConfig.getApiKey())
                    .addHeader("Content-Type", "application/json")
                    .build();
            
            // 发送请求
            try (Response response = httpClient.newCall(request).execute()) {
                String responseBody = response.body() != null ? response.body().string() : "";
                
                if (response.isSuccessful()) {
                    @SuppressWarnings("unchecked")
                    Map<String, Object> result = objectMapper.readValue(responseBody, Map.class);
                    String emailId = (String) result.get("id");
                    log.info("带附件邮件发送成功: to={}, subject={}, emailId={}", to, subject, emailId);
                    return emailId;
                } else {
                    log.error("带附件邮件发送失败: code={}, body={}", response.code(), responseBody);
                    throw new RuntimeException("邮件发送失败: " + responseBody);
                }
            }
        } catch (Exception e) {
            log.error("发送带附件邮件异常: to={}, subject={}", to, subject, e);
            throw new RuntimeException("发送邮件失败: " + e.getMessage(), e);
        }
    }
    
    /**
     * 邮件请求对象
     */
    @lombok.Data
    @lombok.Builder
    public static class EmailRequest {
        private String to;
        private String subject;
        private String htmlContent;
        private String textContent;
    }
}
