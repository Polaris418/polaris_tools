package com.polaris.service;
import com.polaris.entity.EmailAuditLog;
import com.polaris.mapper.EmailAuditLogMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

/**
 * 邮件审计日志记录器
 * 负责记录所有邮件发送活动的详细信息
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class EmailAuditLogger {
    
    private final EmailAuditLogMapper emailAuditLogMapper;
    
    /**
     * 异步记录邮件发送审计日志
     * 记录失败不影响邮件发送流程
     * 
     * @param auditLog 审计日志对象
     */
    @Async
    public void logEmailSent(EmailAuditLog auditLog) {
        try {
            emailAuditLogMapper.insert(auditLog);
            log.debug("邮件审计日志已记录: id={}, to={}, status={}",
                    auditLog.getId(), auditLog.getRecipient(), auditLog.getStatus());
        } catch (Exception e) {
            log.error("记录邮件审计日志失败: to={}, error={}",
                    auditLog.getRecipient(), e.getMessage(), e);
            // 不抛出异常，避免影响邮件发送流程
        }
    }
}
