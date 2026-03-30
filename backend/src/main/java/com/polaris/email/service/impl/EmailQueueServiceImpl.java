package com.polaris.email.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.polaris.email.dto.SendEmailResponse;
import com.polaris.email.dto.SendEmailResult;
import com.polaris.email.entity.*;
import com.polaris.email.mapper.EmailQueueMapper;
import com.polaris.email.service.EmailAuditService;
import com.polaris.email.service.EmailQueueService;
import com.polaris.email.service.EmailQueueWorker;
import com.polaris.service.MonitoringService;
import com.polaris.email.service.EmailProvider;
import com.polaris.email.service.EmailProviderManager;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * 邮件队列服务实现
 */
@Slf4j
@Service
public class EmailQueueServiceImpl implements EmailQueueService {
    
    private final EmailQueueMapper emailQueueMapper;
    private final EmailProviderManager providerManager;
    private final EmailAuditService auditLogger;
    private final MonitoringService monitoringService;
    private final EmailQueueWorker emailQueueWorker;
    private final AtomicBoolean queuePaused = new AtomicBoolean(false);
    
    // 使用构造函数注入，EmailQueueWorker使用@Lazy避免循环依赖
    public EmailQueueServiceImpl(
            EmailQueueMapper emailQueueMapper,
            EmailProviderManager providerManager,
            EmailAuditService auditLogger,
            MonitoringService monitoringService,
            @Lazy EmailQueueWorker emailQueueWorker) {
        this.emailQueueMapper = emailQueueMapper;
        this.providerManager = providerManager;
        this.auditLogger = auditLogger;
        this.monitoringService = monitoringService;
        this.emailQueueWorker = emailQueueWorker;
    }
    
    private static final int MAX_RETRY_COUNT = 3;
    
    @Override
    @Transactional
    public Long enqueue(String recipient, String subject, String htmlContent, String textContent,
                        String emailType, EmailPriority priority) {
        EmailQueue queue = new EmailQueue();
        queue.setRecipient(recipient);
        queue.setSubject(subject);
        queue.setHtmlContent(htmlContent);
        queue.setTextContent(textContent);
        queue.setEmailType(emailType);
        queue.setPriority(priority != null ? priority : EmailPriority.MEDIUM);
        queue.setStatus(EmailQueueStatus.PENDING);
        queue.setRetryCount(0);
        queue.setScheduledAt(LocalDateTime.now());
        
        emailQueueMapper.insert(queue);
        
        log.info("邮件已加入队列: id={}, recipient={}, subject={}, priority={}",
                queue.getId(), recipient, subject, priority);
        
        return queue.getId();
    }
    
    @Override
    public List<EmailQueue> getPendingEmails(int limit) {
        try {
            if (queuePaused.get()) {
                return Collections.emptyList();
            }
            return emailQueueMapper.getPendingEmails(limit, LocalDateTime.now());
        } catch (Exception e) {
            log.error("获取待发送邮件失败", e);
            return Collections.emptyList();
        }
    }
    
    @Override
    @Transactional
    public SendEmailResponse processQueueItem(EmailQueue queueItem) {
        log.info("开始处理队列邮件: queueId={}, recipient={}, subject={}", 
                queueItem.getId(), queueItem.getRecipient(), queueItem.getSubject());
        
        if (queuePaused.get()) {
            log.debug("队列暂停中，跳过处理: queueId={}", queueItem.getId());
            return SendEmailResponse.builder()
                    .success(false)
                    .message("队列已暂停，稍后再试")
                    .build();
        }
        
        // 更新状态为处理中
        queueItem.setStatus(EmailQueueStatus.PROCESSING);
        emailQueueMapper.updateById(queueItem);
        
        // 创建审计日志
        EmailAuditLog auditLog = createAuditLog(queueItem);
        
        try {
            // 获取当前邮件服务提供商
            EmailProvider provider = providerManager.getCurrentProvider();
            String providerName = providerManager.getCurrentProviderName();
            
            log.info("使用邮件服务提供商 [{}] 处理队列邮件: queueId={}, to={}", 
                    providerName, queueItem.getId(), queueItem.getRecipient());
            
            // 通过提供商发送邮件
            SendEmailResult result = provider.sendEmail(
                    queueItem.getRecipient(),
                    queueItem.getSubject(),
                    queueItem.getHtmlContent(),
                    queueItem.getTextContent()
            );
            
            if (result.isSuccess()) {
                // 发送成功
                queueItem.setStatus(EmailQueueStatus.SENT);
                queueItem.setSentAt(LocalDateTime.now());
                queueItem.setErrorMessage(null);
                
                auditLog.setStatus(EmailStatus.SENT);
                auditLog.setMessageId(result.getMessageId());
                auditLog.setSentAt(LocalDateTime.now());
                
                log.info("队列邮件发送成功: queueId={}, messageId={}", 
                        queueItem.getId(), result.getMessageId());
                
                // 记录监控数据（队列发送延迟暂时记录为0）
                monitoringService.recordEmailSent(0);
                
                emailQueueMapper.updateById(queueItem);
                auditLogger.logEmailSent(auditLog);
                
                return SendEmailResponse.builder()
                        .id(result.getMessageId())
                        .success(true)
                        .message("邮件发送成功")
                        .build();
            } else {
                // 发送失败，判断是否需要重试
                return handleSendFailure(queueItem, result, auditLog);
            }
            
        } catch (Exception e) {
            log.error("处理队列邮件异常: queueId={}", queueItem.getId(), e);
            
            queueItem.setErrorMessage(e.getMessage());
            auditLog.setStatus(EmailStatus.FAILED);
            auditLog.setErrorMessage(e.getMessage());
            
            return handleSendFailure(queueItem, 
                    SendEmailResult.failure("UNKNOWN_ERROR", e.getMessage(), true), 
                    auditLog);
        }
    }
    
    /**
     * 处理发送失败
     */
    private SendEmailResponse handleSendFailure(EmailQueue queueItem, SendEmailResult result, 
                                                 EmailAuditLog auditLog) {
        queueItem.setRetryCount(queueItem.getRetryCount() + 1);
        queueItem.setErrorMessage(result.getErrorMessage());
        
        // 判断是否可以重试
        if (result.isRetryable() && queueItem.getRetryCount() < MAX_RETRY_COUNT) {
            // 可以重试，计算下次重试时间（指数退避）
            long delaySeconds = (long) Math.pow(2, queueItem.getRetryCount()) * 60; // 2^n 分钟
            queueItem.setScheduledAt(LocalDateTime.now().plusSeconds(delaySeconds));
            queueItem.setStatus(EmailQueueStatus.PENDING);
            
            auditLog.setStatus(EmailStatus.RETRYING);
            auditLog.setErrorCode(result.getErrorCode());
            auditLog.setErrorMessage(result.getErrorMessage());
            
            log.warn("队列邮件发送失败，将在{}秒后重试: queueId={}, retryCount={}, error={}",
                    delaySeconds, queueItem.getId(), queueItem.getRetryCount(), result.getErrorMessage());
            
            emailQueueMapper.updateById(queueItem);
            auditLogger.logEmailSent(auditLog);
            
            return SendEmailResponse.builder()
                    .success(false)
                    .message("邮件发送失败，将自动重试: " + result.getErrorMessage())
                    .build();
        } else {
            // 不可重试或达到最大重试次数
            queueItem.setStatus(EmailQueueStatus.FAILED);
            
            auditLog.setStatus(EmailStatus.FAILED);
            auditLog.setErrorCode(result.getErrorCode());
            auditLog.setErrorMessage(result.getErrorMessage());
            
            log.error("队列邮件发送失败（不再重试）: queueId={}, retryCount={}, error={}",
                    queueItem.getId(), queueItem.getRetryCount(), result.getErrorMessage());
            
            // 记录监控数据
            monitoringService.recordEmailFailed();
            
            emailQueueMapper.updateById(queueItem);
            auditLogger.logEmailSent(auditLog);
            
            return SendEmailResponse.builder()
                    .success(false)
                    .message("邮件发送失败: " + result.getErrorMessage())
                    .build();
        }
    }
    
    @Override
    public long getQueueLength() {
        try {
            return emailQueueMapper.countByStatus(EmailQueueStatus.PENDING);
        } catch (Exception e) {
            log.error("获取队列长度失败", e);
            return 0;
        }
    }
    
    @Override
    public double getProcessingSpeed() {
        try {
            // 统计最近1小时发送成功的邮件数
            QueryWrapper<EmailQueue> wrapper = new QueryWrapper<>();
            wrapper.eq("status", EmailQueueStatus.SENT.name())
                    .ge("sent_at", LocalDateTime.now().minusHours(1))
                    .eq("deleted", 0);
            
            long count = emailQueueMapper.selectCount(wrapper);
            return count; // 邮件数/小时
        } catch (Exception e) {
            log.error("获取处理速度失败", e);
            return 0.0;
        }
    }
    
    @Override
    public double getFailureRate() {
        try {
            Double rate = emailQueueMapper.getFailureRate(24);
            return rate != null ? rate : 0.0;
        } catch (Exception e) {
            log.error("获取失败率失败", e);
            return 0.0;
        }
    }
    
    @Override
    @Transactional
    public SendEmailResponse retryFailedEmail(Long queueId) {
        EmailQueue queueItem = emailQueueMapper.selectById(queueId);
        
        if (queueItem == null) {
            return SendEmailResponse.builder()
                    .success(false)
                    .message("队列项不存在")
                    .build();
        }
        
        if (queueItem.getStatus() != EmailQueueStatus.FAILED) {
            return SendEmailResponse.builder()
                    .success(false)
                    .message("只能重试失败的邮件")
                    .build();
        }
        
        // 重置状态和重试次数
        queueItem.setStatus(EmailQueueStatus.PENDING);
        queueItem.setRetryCount(0);
        queueItem.setScheduledAt(LocalDateTime.now());
        queueItem.setErrorMessage(null);
        emailQueueMapper.updateById(queueItem);
        
        log.info("手动重试失败邮件: queueId={}", queueId);
        
        return SendEmailResponse.builder()
                .success(true)
                .message("邮件已重新加入队列")
                .build();
    }
    
    /**
     * 创建审计日志
     */
    private EmailAuditLog createAuditLog(EmailQueue queueItem) {
        EmailAuditLog auditLog = new EmailAuditLog();
        auditLog.setRecipient(queueItem.getRecipient());
        auditLog.setSubject(queueItem.getSubject());
        auditLog.setEmailType(queueItem.getEmailType());
        auditLog.setStatus(EmailStatus.PENDING);
        return auditLog;
    }
    
    @Override
    public com.polaris.common.result.PageResult<EmailQueue> getQueueList(Integer page, Integer size, String status, String priority, String sortBy, String sortOrder) {
        try {
            QueryWrapper<EmailQueue> wrapper = new QueryWrapper<>();
            wrapper.eq("deleted", 0);
            
            if (status != null && !status.isEmpty()) {
                wrapper.eq("status", status);
            }
            
            if (priority != null && !priority.isEmpty()) {
                wrapper.eq("priority", priority);
            }
            
            // 排序 - 转换为下划线命名
            String columnName = convertToSnakeCase(sortBy);
            if ("desc".equalsIgnoreCase(sortOrder)) {
                wrapper.orderByDesc(columnName);
            } else {
                wrapper.orderByAsc(columnName);
            }
            
            // 分页查询
            long offset = (long) (page - 1) * size;
            wrapper.last("LIMIT " + offset + ", " + size);
            
            List<EmailQueue> records = emailQueueMapper.selectList(wrapper);
            
            // 获取总数
            QueryWrapper<EmailQueue> countWrapper = new QueryWrapper<>();
            countWrapper.eq("deleted", 0);
            if (status != null && !status.isEmpty()) {
                countWrapper.eq("status", status);
            }
            if (priority != null && !priority.isEmpty()) {
                countWrapper.eq("priority", priority);
            }
            long total = emailQueueMapper.selectCount(countWrapper);
            
            // 计算总页数
            long pages = (total + size - 1) / size;
            
            com.polaris.common.result.PageResult<EmailQueue> result = new com.polaris.common.result.PageResult<>();
            result.setList(records);
            result.setTotal(total);
            result.setPages(pages);
            result.setPageNum(page);
            result.setPageSize(size);
            
            return result;
        } catch (Exception e) {
            log.error("获取队列列表失败", e);
            com.polaris.common.result.PageResult<EmailQueue> result = new com.polaris.common.result.PageResult<>();
            result.setList(Collections.emptyList());
            result.setTotal(0L);
            result.setPages(0L);
            result.setPageNum(page);
            result.setPageSize(size);
            return result;
        }
    }
    
    @Override
    public boolean isQueueEnabled() {
        // 从配置中读取，这里默认返回 true
        return true;
    }
    
    @Override
    public int getWorkerThreads() {
        return emailQueueWorker.getWorkerThreads();
    }
    
    @Override
    public int getBatchSize() {
        return emailQueueWorker.getBatchSize();
    }
    
    /**
     * 将驼峰命名转换为下划线命名
     * 例如: scheduledAt -> scheduled_at
     */
    private String convertToSnakeCase(String camelCase) {
        if (camelCase == null || camelCase.isEmpty()) {
            return camelCase;
        }
        
        StringBuilder result = new StringBuilder();
        result.append(Character.toLowerCase(camelCase.charAt(0)));
        
        for (int i = 1; i < camelCase.length(); i++) {
            char ch = camelCase.charAt(i);
            if (Character.isUpperCase(ch)) {
                result.append('_');
                result.append(Character.toLowerCase(ch));
            } else {
                result.append(ch);
            }
        }
        
        return result.toString();
    }
    
    @Override
    @Transactional
    public boolean cancelEmail(Long queueId) {
        try {
            EmailQueue queue = emailQueueMapper.selectById(queueId);
            if (queue == null) {
                log.warn("队列项不存在: queueId={}", queueId);
                return false;
            }
            
            if (queue.getStatus() != EmailQueueStatus.PENDING) {
                log.warn("只能取消待发送的邮件: queueId={}, status={}", queueId, queue.getStatus());
                return false;
            }
            
            // 软删除
            queue.setDeleted(1);
            emailQueueMapper.updateById(queue);
            
            log.info("邮件已取消: queueId={}", queueId);
            return true;
        } catch (Exception e) {
            log.error("取消邮件失败: queueId={}", queueId, e);
            return false;
        }
    }
    
    @Override
    @Transactional
    public boolean updatePriority(Long queueId, EmailPriority priority) {
        try {
            EmailQueue queue = emailQueueMapper.selectById(queueId);
            if (queue == null) {
                log.warn("队列项不存在: queueId={}", queueId);
                return false;
            }
            
            if (queue.getStatus() != EmailQueueStatus.PENDING) {
                log.warn("只能修改待发送邮件的优先级: queueId={}, status={}", queueId, queue.getStatus());
                return false;
            }
            
            queue.setPriority(priority);
            emailQueueMapper.updateById(queue);
            
            log.info("邮件优先级已更新: queueId={}, priority={}", queueId, priority);
            return true;
        } catch (Exception e) {
            log.error("修改优先级失败: queueId={}", queueId, e);
            return false;
        }
    }
    
    @Override
    public void pauseQueue() {
        if (queuePaused.compareAndSet(false, true)) {
            log.info("队列处理已暂停");
        } else {
            log.debug("队列处理已处于暂停状态");
        }
    }
    
    @Override
    public void resumeQueue() {
        if (queuePaused.compareAndSet(true, false)) {
            log.info("队列处理已恢复");
        } else {
            log.debug("队列处理已处于运行状态");
        }
    }
    
    @Override
    public void setWorkerThreads(int threads) {
        if (threads < 1 || threads > 50) {
            throw new IllegalArgumentException("线程数必须在 1-50 之间");
        }
        
        log.info("设置 Worker 线程数: {}", threads);
        emailQueueWorker.setWorkerThreads(threads);
    }
    
    @Override
    public void setBatchSize(int size) {
        if (size < 1 || size > 100) {
            throw new IllegalArgumentException("批处理大小必须在 1-100 之间");
        }
        
        log.info("设置批处理大小: {}", size);
        emailQueueWorker.setBatchSize(size);
    }
}
