package com.polaris.service;

import com.polaris.common.base.BaseService;
import com.polaris.dto.email.EmailAuditLogQueryRequest;
import com.polaris.dto.email.EmailAuditLogResponse;
import com.polaris.dto.email.EmailStatisticsResponse;
import com.polaris.entity.EmailAuditLog;

/**
 * 邮件审计日志服务接口
 * 
 * 继承 BaseService 以获得标准 CRUD 操作
 * 注意：EmailAuditLog 是系统自动创建的审计日志，不支持 Create/Update 操作
 * 因此 BaseService 的泛型参数 C 和 U 使用 Void
 */
public interface EmailAuditLogService extends BaseService<EmailAuditLog, EmailAuditLogResponse, Void, Void, EmailAuditLogQueryRequest> {
    
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
