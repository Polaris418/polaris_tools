package com.polaris.dto.email;

import com.polaris.entity.EmailStatus;
import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;

/**
 * 邮件审计日志查询类
 * 用于查询审计日志
 */
@Data
@Builder
public class EmailAuditLogQuery {
    
    /**
     * 收件人邮箱地址
     */
    private String recipient;
    
    /**
     * 发送状态
     */
    private EmailStatus status;
    
    /**
     * 邮件类型
     */
    private String emailType;
    
    /**
     * 开始日期
     */
    private LocalDateTime startDate;
    
    /**
     * 结束日期
     */
    private LocalDateTime endDate;
}
