package com.polaris.email.dto.sns;

import lombok.Data;

/**
 * AWS SNS 通知消息
 */
@Data
public class SnsNotification {
    
    /**
     * 消息类型：Notification、SubscriptionConfirmation
     */
    private String Type;
    
    /**
     * 消息 ID
     */
    private String MessageId;
    
    /**
     * 主题 ARN
     */
    private String TopicArn;
    
    /**
     * 消息内容（JSON 字符串）
     */
    private String Message;
    
    /**
     * 时间戳
     */
    private String Timestamp;
    
    /**
     * 签名版本
     */
    private String SignatureVersion;
    
    /**
     * 签名
     */
    private String Signature;
    
    /**
     * 签名证书 URL
     */
    private String SigningCertURL;
    
    /**
     * 订阅确认 URL（仅用于 SubscriptionConfirmation 类型）
     */
    private String SubscribeURL;
    
    /**
     * Token（仅用于 SubscriptionConfirmation 类型）
     */
    private String Token;
}
