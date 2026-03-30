package com.polaris.email.dto;

import com.polaris.common.base.BaseRequest;
import com.polaris.email.entity.EmailStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;

/**
 * 邮件审计日志查询请求
 */
@Data
@EqualsAndHashCode(callSuper = true)
@Schema(description = "邮件审计日志查询请求")
public class EmailAuditLogQueryRequest extends BaseRequest {
    
    @Schema(description = "收件人邮箱地址（模糊搜索）", example = "user@example.com")
    private String recipient;
    
    @Schema(description = "邮件类型", example = "VERIFICATION")
    private String emailType;
    
    @Schema(description = "发送状态", example = "SENT")
    private EmailStatus status;
    
    @Schema(description = "开始时间", example = "2024-01-01T00:00:00")
    private LocalDateTime startDate;
    
    @Schema(description = "结束时间", example = "2024-12-31T23:59:59")
    private LocalDateTime endDate;
    
    @Schema(description = "排序字段", example = "created_at", allowableValues = {"created_at", "sent_at"})
    private String sortBy = "created_at";
    
    @Schema(description = "排序方向", example = "desc", allowableValues = {"asc", "desc"})
    private String sortOrder = "desc";
}
