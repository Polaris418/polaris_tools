package com.polaris.email.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 发送邮件响应 DTO
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SendEmailResponse {
    
    /**
     * 邮件 ID (AWS SES 返回的消息 ID)
     */
    private String id;
    
    /**
     * 发送状态
     */
    private boolean success;
    
    /**
     * 消息
     */
    private String message;
}
