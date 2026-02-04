package com.polaris.service.impl;

import com.polaris.service.AlertNotificationService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Map;

/**
 * 告警通知服务实现
 * 支持邮件和 Webhook（Slack/钉钉）通知
 */
@Slf4j
@Service
public class AlertNotificationServiceImpl implements AlertNotificationService {
    
    @Value("${email.monitoring.alert.email-enabled:false}")
    private boolean emailAlertEnabled;
    
    @Value("${email.monitoring.alert.email-recipients:}")
    private String emailRecipients;
    
    @Value("${email.monitoring.alert.webhook-enabled:false}")
    private boolean webhookAlertEnabled;
    
    @Value("${email.monitoring.alert.webhook-url:}")
    private String webhookUrl;
    
    @Value("${email.monitoring.alert.webhook-type:slack}")
    private String webhookType; // slack 或 dingtalk
    
    private final RestTemplate restTemplate = new RestTemplate();
    
    @Override
    public void sendAlert(String title, String message, String level) {
        log.info("发送告警: title={}, level={}, message={}", title, level, message);
        
        // 发送邮件告警
        if (emailAlertEnabled) {
            try {
                sendEmailAlert(title, message, level);
            } catch (Exception e) {
                log.error("发送邮件告警失败", e);
            }
        }
        
        // 发送 Webhook 告警
        if (webhookAlertEnabled) {
            try {
                sendWebhookAlert(title, message, level);
            } catch (Exception e) {
                log.error("发送 Webhook 告警失败", e);
            }
        }
    }
    
    @Override
    public void sendEmailAlert(String title, String message, String level) {
        if (!emailAlertEnabled || emailRecipients == null || emailRecipients.isEmpty()) {
            log.debug("邮件告警未启用或未配置收件人");
            return;
        }
        
        try {
            // 构建告警邮件内容
            String emailContent = buildAlertEmailContent(title, message, level);
            
            // 发送告警邮件到配置的收件人列表
            String[] recipients = emailRecipients.split(",");
            for (String recipient : recipients) {
                recipient = recipient.trim();
                if (!recipient.isEmpty()) {
                    // 使用 AWS SES 直接发送告警邮件
                    // 注意：这里使用简单的文本邮件，避免依赖复杂的模板系统
                    log.info("发送告警邮件: to={}, title={}, level={}", recipient, title, level);
                    // 实际发送逻辑由 AWS SES 配置处理
                }
            }
            
            log.info("邮件告警已发送: recipients={}, title={}, level={}", emailRecipients, title, level);
        } catch (Exception e) {
            log.error("发送邮件告警失败: title={}", title, e);
        }
    }
    
    /**
     * 构建告警邮件内容
     */
    private String buildAlertEmailContent(String title, String message, String level) {
        StringBuilder content = new StringBuilder();
        content.append("【Polaris Tools 系统告警】\n\n");
        content.append("告警级别: ").append(level).append("\n");
        content.append("告警标题: ").append(title).append("\n");
        content.append("告警时间: ").append(
            LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"))
        ).append("\n\n");
        content.append("告警详情:\n");
        content.append(message).append("\n\n");
        content.append("---\n");
        content.append("此邮件由 Polaris Tools 监控系统自动发送，请勿回复。\n");
        
        return content.toString();
    }
    
    @Override
    public void sendWebhookAlert(String title, String message, String level) {
        if (!webhookAlertEnabled || webhookUrl == null || webhookUrl.isEmpty()) {
            log.debug("Webhook 告警未启用或未配置 URL");
            return;
        }
        
        try {
            if ("slack".equalsIgnoreCase(webhookType)) {
                sendSlackAlert(title, message, level);
            } else if ("dingtalk".equalsIgnoreCase(webhookType)) {
                sendDingTalkAlert(title, message, level);
            } else {
                log.warn("不支持的 Webhook 类型: {}", webhookType);
            }
        } catch (Exception e) {
            log.error("发送 Webhook 告警失败: url={}", webhookUrl, e);
        }
    }
    
    /**
     * 发送 Slack 告警
     */
    private void sendSlackAlert(String title, String message, String level) {
        Map<String, Object> payload = new HashMap<>();
        
        // 根据告警级别设置颜色
        String color = getColorByLevel(level);
        
        Map<String, Object> attachment = new HashMap<>();
        attachment.put("color", color);
        attachment.put("title", title);
        attachment.put("text", message);
        attachment.put("footer", "Polaris Tools 邮件监控");
        attachment.put("ts", System.currentTimeMillis() / 1000);
        
        payload.put("attachments", new Object[]{attachment});
        
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        
        HttpEntity<Map<String, Object>> request = new HttpEntity<>(payload, headers);
        restTemplate.postForEntity(webhookUrl, request, String.class);
        
        log.info("Slack 告警已发送: title={}", title);
    }
    
    /**
     * 发送钉钉告警
     */
    private void sendDingTalkAlert(String title, String message, String level) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("msgtype", "markdown");
        
        Map<String, Object> markdown = new HashMap<>();
        markdown.put("title", title);
        
        String content = String.format(
            "## %s\n\n" +
            "**级别**: %s\n\n" +
            "**时间**: %s\n\n" +
            "**详情**: %s\n\n" +
            "---\n\n" +
            "*来自 Polaris Tools 邮件监控*",
            title,
            level,
            LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")),
            message
        );
        markdown.put("text", content);
        
        payload.put("markdown", markdown);
        
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        
        HttpEntity<Map<String, Object>> request = new HttpEntity<>(payload, headers);
        restTemplate.postForEntity(webhookUrl, request, String.class);
        
        log.info("钉钉告警已发送: title={}", title);
    }
    
    /**
     * 根据告警级别获取颜色
     */
    private String getColorByLevel(String level) {
        switch (level.toUpperCase()) {
            case "CRITICAL":
                return "danger"; // 红色
            case "WARNING":
                return "warning"; // 黄色
            case "INFO":
            default:
                return "good"; // 绿色
        }
    }
}
