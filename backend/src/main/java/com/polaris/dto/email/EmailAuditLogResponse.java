package com.polaris.dto.email;

import com.polaris.common.base.BaseResponse;
import com.polaris.entity.EmailStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;

/**
 * 邮件审计日志响应
 */
@Data
@EqualsAndHashCode(callSuper = true)
@Schema(description = "邮件审计日志响应")
public class EmailAuditLogResponse extends BaseResponse {
    
    @Schema(description = "收件人邮箱地址", example = "user@example.com")
    private String recipient;
    
    @Schema(description = "邮件主题", example = "验证您的邮箱地址")
    private String subject;
    
    @Schema(description = "邮件类型", example = "VERIFICATION")
    private String emailType;
    
    @Schema(description = "邮件类型描述（中文）", example = "邮箱验证")
    private String emailTypeDescriptionZh;
    
    @Schema(description = "邮件类型描述（英文）", example = "Email Verification")
    private String emailTypeDescriptionEn;
    
    @Schema(description = "发送状态", example = "SENT")
    private EmailStatus status;
    
    @Schema(description = "AWS SES 消息 ID", example = "0100018d1234abcd-12345678-1234-1234-1234-123456789abc-000000")
    private String messageId;
    
    @Schema(description = "错误代码", example = "MessageRejected")
    private String errorCode;
    
    @Schema(description = "错误消息", example = "Email address is not verified")
    private String errorMessage;
    
    @Schema(description = "发送时间", example = "2024-01-15T10:30:01")
    private LocalDateTime sentAt;
}
