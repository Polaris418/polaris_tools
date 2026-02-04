package com.polaris.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.polaris.dto.sns.SesEvent;
import com.polaris.dto.sns.SnsNotification;
import com.polaris.service.SuppressionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.URL;
import java.security.Signature;
import java.security.cert.CertificateFactory;
import java.security.cert.X509Certificate;
import java.util.Base64;

/**
 * AWS SES Webhook 控制器
 * 接收 SNS 通知并处理 SES 事件
 */
@Slf4j
@RestController
@RequestMapping("/api/webhook/ses")
@RequiredArgsConstructor
public class SesWebhookController {
    
    private final SuppressionService suppressionService;
    private final ObjectMapper objectMapper;
    
    /**
     * 接收 SNS 通知
     */
    @PostMapping
    public ResponseEntity<String> handleSnsNotification(@RequestBody String payload) {
        try {
            log.info("收到 SNS 通知");
            
            // 解析 SNS 通知
            SnsNotification notification = objectMapper.readValue(payload, SnsNotification.class);
            
            // 验证消息签名
            if (!verifySignature(notification)) {
                log.error("SNS 消息签名验证失败");
                return ResponseEntity.badRequest().body("Invalid signature");
            }
            
            // 处理不同类型的消息
            String messageType = notification.getType();
            
            if ("SubscriptionConfirmation".equals(messageType)) {
                // 处理订阅确认
                handleSubscriptionConfirmation(notification);
                return ResponseEntity.ok("Subscription confirmed");
            } else if ("Notification".equals(messageType)) {
                // 处理 SES 事件通知
                handleSesEvent(notification.getMessage());
                return ResponseEntity.ok("Event processed");
            } else {
                log.warn("未知的消息类型: {}", messageType);
                return ResponseEntity.ok("Unknown message type");
            }
            
        } catch (Exception e) {
            log.error("处理 SNS 通知失败", e);
            return ResponseEntity.internalServerError().body("Error processing notification");
        }
    }
    
    /**
     * 处理订阅确认
     */
    private void handleSubscriptionConfirmation(SnsNotification notification) {
        try {
            String subscribeUrl = notification.getSubscribeURL();
            log.info("确认 SNS 订阅: {}", subscribeUrl);
            
            // 访问订阅 URL 以确认订阅
            URL url = new URL(subscribeUrl);
            BufferedReader reader = new BufferedReader(new InputStreamReader(url.openStream()));
            String response = reader.lines().reduce("", String::concat);
            reader.close();
            
            log.info("SNS 订阅已确认: {}", response);
        } catch (Exception e) {
            log.error("确认 SNS 订阅失败", e);
        }
    }
    
    /**
     * 处理 SES 事件
     */
    private void handleSesEvent(String message) {
        try {
            // 解析 SES 事件
            SesEvent event = objectMapper.readValue(message, SesEvent.class);
            String eventType = event.getEventType();
            
            log.info("处理 SES 事件: type={}", eventType);
            
            switch (eventType) {
                case "Bounce":
                    handleBounceEvent(event);
                    break;
                case "Complaint":
                    handleComplaintEvent(event);
                    break;
                case "Delivery":
                    handleDeliveryEvent(event);
                    break;
                default:
                    log.warn("未知的 SES 事件类型: {}", eventType);
            }
            
        } catch (Exception e) {
            log.error("处理 SES 事件失败", e);
        }
    }
    
    /**
     * 处理退信事件
     */
    private void handleBounceEvent(SesEvent event) {
        SesEvent.Bounce bounce = event.getBounce();
        String bounceType = bounce.getBounceType();
        
        log.info("处理退信事件: type={}", bounceType);
        
        for (SesEvent.BouncedRecipient recipient : bounce.getBouncedRecipients()) {
            String email = recipient.getEmailAddress();
            String notes = String.format("Bounce Type: %s, SubType: %s, Status: %s, Diagnostic: %s",
                    bounceType, bounce.getBounceSubType(), recipient.getStatus(), recipient.getDiagnosticCode());
            
            if ("Permanent".equalsIgnoreCase(bounceType)) {
                // 硬退信
                log.warn("硬退信: email={}", email);
                suppressionService.handleHardBounce(email, notes);
            } else if ("Transient".equalsIgnoreCase(bounceType)) {
                // 软退信
                log.warn("软退信: email={}", email);
                suppressionService.handleSoftBounce(email, notes);
            }
        }
    }
    
    /**
     * 处理投诉事件
     */
    private void handleComplaintEvent(SesEvent event) {
        SesEvent.Complaint complaint = event.getComplaint();
        
        log.warn("处理投诉事件");
        
        for (SesEvent.ComplainedRecipient recipient : complaint.getComplainedRecipients()) {
            String email = recipient.getEmailAddress();
            String notes = String.format("Feedback ID: %s, Type: %s",
                    complaint.getFeedbackId(), complaint.getComplaintFeedbackType());
            
            log.warn("投诉: email={}", email);
            suppressionService.handleComplaint(email, notes);
        }
    }
    
    /**
     * 处理送达事件
     */
    private void handleDeliveryEvent(SesEvent event) {
        SesEvent.Delivery delivery = event.getDelivery();
        
        log.info("处理送达事件: recipients={}", delivery.getRecipients());
        
        // 送达事件仅用于日志记录，不需要特殊处理
    }
    
    /**
     * 验证 SNS 消息签名
     */
    private boolean verifySignature(SnsNotification notification) {
        try {
            // 获取签名证书
            URL certUrl = new URL(notification.getSigningCertURL());
            
            // 验证证书 URL 是否来自 AWS
            if (!certUrl.getHost().endsWith(".amazonaws.com")) {
                log.error("无效的证书 URL: {}", certUrl.getHost());
                return false;
            }
            
            // 下载证书
            CertificateFactory cf = CertificateFactory.getInstance("X.509");
            X509Certificate cert = (X509Certificate) cf.generateCertificate(certUrl.openStream());
            
            // 构建待签名的消息
            String messageToSign = buildMessageToSign(notification);
            
            // 验证签名
            Signature sig = Signature.getInstance("SHA1withRSA");
            sig.initVerify(cert.getPublicKey());
            sig.update(messageToSign.getBytes("UTF-8"));
            
            byte[] signatureBytes = Base64.getDecoder().decode(notification.getSignature());
            boolean isValid = sig.verify(signatureBytes);
            
            if (!isValid) {
                log.error("SNS 消息签名验证失败");
            }
            
            return isValid;
            
        } catch (Exception e) {
            log.error("验证 SNS 消息签名时发生错误", e);
            return false;
        }
    }
    
    /**
     * 构建待签名的消息
     */
    private String buildMessageToSign(SnsNotification notification) {
        StringBuilder sb = new StringBuilder();
        
        if ("Notification".equals(notification.getType())) {
            sb.append("Message\n");
            sb.append(notification.getMessage()).append("\n");
            sb.append("MessageId\n");
            sb.append(notification.getMessageId()).append("\n");
            sb.append("Timestamp\n");
            sb.append(notification.getTimestamp()).append("\n");
            sb.append("TopicArn\n");
            sb.append(notification.getTopicArn()).append("\n");
            sb.append("Type\n");
            sb.append(notification.getType()).append("\n");
        } else if ("SubscriptionConfirmation".equals(notification.getType())) {
            sb.append("Message\n");
            sb.append(notification.getMessage()).append("\n");
            sb.append("MessageId\n");
            sb.append(notification.getMessageId()).append("\n");
            sb.append("SubscribeURL\n");
            sb.append(notification.getSubscribeURL()).append("\n");
            sb.append("Timestamp\n");
            sb.append(notification.getTimestamp()).append("\n");
            sb.append("Token\n");
            sb.append(notification.getToken()).append("\n");
            sb.append("TopicArn\n");
            sb.append(notification.getTopicArn()).append("\n");
            sb.append("Type\n");
            sb.append(notification.getType()).append("\n");
        }
        
        return sb.toString();
    }
}
