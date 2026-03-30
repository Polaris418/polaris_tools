package com.polaris.email.service;

import com.polaris.common.base.BaseService;
import com.polaris.email.dto.EmailAuditLogQueryRequest;
import com.polaris.email.dto.EmailAuditLogResponse;
import com.polaris.email.dto.EmailStatisticsResponse;
import com.polaris.email.entity.EmailAuditLog;

/**
 * 邮件审计日志服务接口
 * 
 * 继承 BaseService 以获得标准 CRUD 操作
 * 注意：EmailAuditLog 是系统自动创建的审计日志，不支持 Create/Update 操作
 * 因此 BaseService 的泛型参数 C 和 U 使用 Void
 */
public interface EmailAuditService extends BaseService<EmailAuditLog, EmailAuditLogResponse, Void, Void, EmailAuditLogQueryRequest> {
    /**
     * 异步记录邮件发送审计日志
     *
     * @param auditLog 审计日志对象
     */
    void logEmailSent(EmailAuditLog auditLog);
    
    /**
     * 获取邮件统计信息
     * 
     * @return 统计信息
     */
    EmailStatisticsResponse getEmailStatistics();
    
    /**
     * 删除指定时间之前的邮件日志
     * 
     * @param days 保留天数
     * @return 删除的记录数
     */
    int cleanupOldLogs(int days);
}
