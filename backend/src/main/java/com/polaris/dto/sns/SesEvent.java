package com.polaris.dto.sns;

import lombok.Data;
import java.util.List;

/**
 * AWS SES 事件消息
 */
@Data
public class SesEvent {
    
    /**
     * 事件类型：Bounce、Complaint、Delivery
     */
    private String eventType;
    
    /**
     * 邮件信息
     */
    private Mail mail;
    
    /**
     * 退信信息
     */
    private Bounce bounce;
    
    /**
     * 投诉信息
     */
    private Complaint complaint;
    
    /**
     * 送达信息
     */
    private Delivery delivery;
    
    @Data
    public static class Mail {
        private String timestamp;
        private String messageId;
        private String source;
        private List<String> destination;
    }
    
    @Data
    public static class Bounce {
        private String bounceType; // Permanent, Transient
        private String bounceSubType;
        private List<BouncedRecipient> bouncedRecipients;
        private String timestamp;
    }
    
    @Data
    public static class BouncedRecipient {
        private String emailAddress;
        private String action;
        private String status;
        private String diagnosticCode;
    }
    
    @Data
    public static class Complaint {
        private List<ComplainedRecipient> complainedRecipients;
        private String timestamp;
        private String feedbackId;
        private String complaintFeedbackType;
    }
    
    @Data
    public static class ComplainedRecipient {
        private String emailAddress;
    }
    
    @Data
    public static class Delivery {
        private String timestamp;
        private List<String> recipients;
    }
}
