package com.polaris.service.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.polaris.config.ResendConfig;
import com.polaris.dto.email.SendEmailResult;
import com.polaris.service.EmailProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import okhttp3.*;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.HashMap;
import java.util.Map;

/**
 * Resend 邮件服务提供商实现
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ResendEmailProvider implements EmailProvider {
    
    private final ResendConfig resendConfig;
    private final OkHttpClient httpClient = new OkHttpClient();
    private final ObjectMapper objectMapper = new ObjectMapper();
    
    @Override
    public String getProviderName() {
        return "resend";
    }
    
    @Override
    public SendEmailResult sendEmail(String to, String subject, String htmlContent) {
        return sendEmail(to, subject, htmlContent, null);
    }
    
    @Override
    public SendEmailResult sendEmail(String to, String subject, String htmlContent, String textContent) {
        if (!isAvailable()) {
            log.warn("Resend 邮件服务未启用或配置不完整");
            return SendEmailResult.builder()
                    .success(false)
                    .errorCode("PROVIDER_UNAVAILABLE")
                    .errorMessage("Resend 邮件服务未启用")
                    .build();
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
            
            log.debug("[Resend] 发送邮件请求: to={}, subject={}", to, subject);
            
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
                    log.info("[Resend] 邮件发送成功: to={}, subject={}, emailId={}", to, subject, emailId);
                    
                    return SendEmailResult.builder()
                            .success(true)
                            .messageId(emailId)
                            .build();
                } else {
                    log.error("[Resend] 邮件发送失败: code={}, body={}", response.code(), responseBody);
                    return SendEmailResult.builder()
                            .success(false)
                            .errorCode("RESEND_API_ERROR")
                            .errorMessage("Resend API 错误: " + responseBody)
                            .build();
                }
            }
        } catch (Exception e) {
            log.error("[Resend] 发送邮件异常: to={}, subject={}", to, subject, e);
            return SendEmailResult.builder()
                    .success(false)
                    .errorCode("RESEND_EXCEPTION")
                    .errorMessage("发送邮件异常: " + e.getMessage())
                    .build();
        }
    }
    
    @Override
    public boolean isAvailable() {
        return resendConfig.isEnabled() 
                && resendConfig.getApiKey() != null 
                && !resendConfig.getApiKey().isEmpty()
                && resendConfig.getFromEmail() != null
                && !resendConfig.getFromEmail().isEmpty();
    }
}
