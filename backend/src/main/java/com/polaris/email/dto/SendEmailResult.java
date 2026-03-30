package com.polaris.email.dto;

import lombok.Builder;
import lombok.Data;

/**
 * 邮件发送结果类
 * 用于封装发送结果
 */
@Data
@Builder
public class SendEmailResult {
    
    /**
     * 是否发送成功
     */
    private boolean success;
    
    /**
     * AWS SES 消息 ID
     */
    private String messageId;
    
    /**
     * 错误代码
     */
    private String errorCode;
    
    /**
     * 错误消息
     */
    private String errorMessage;
    
    /**
     * 是否可重试
     */
    private boolean retryable;
    
    /**
     * 创建成功结果
     * 
     * @param messageId AWS SES 消息 ID
     * @return 成功结果
     */
    public static SendEmailResult success(String messageId) {
        return SendEmailResult.builder()
                .success(true)
                .messageId(messageId)
                .build();
    }
    
    /**
     * 创建失败结果
     * 
     * @param errorCode 错误代码
     * @param errorMessage 错误消息
     * @param retryable 是否可重试
     * @return 失败结果
     */
    public static SendEmailResult failure(String errorCode, String errorMessage, boolean retryable) {
        return SendEmailResult.builder()
                .success(false)
                .errorCode(errorCode)
                .errorMessage(errorMessage)
                .retryable(retryable)
                .build();
    }
}
