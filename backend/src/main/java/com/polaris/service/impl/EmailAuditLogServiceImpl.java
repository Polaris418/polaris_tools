package com.polaris.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.polaris.common.base.BaseConverter;
import com.polaris.common.base.BaseServiceImpl;
import com.polaris.dto.email.EmailAuditLogQueryRequest;
import com.polaris.dto.email.EmailAuditLogResponse;
import com.polaris.dto.email.EmailStatisticsResponse;
import com.polaris.entity.EmailAuditLog;
import com.polaris.entity.EmailStatus;
import com.polaris.converter.EmailAuditLogConverter;
import com.polaris.mapper.EmailAuditLogMapper;
import com.polaris.service.EmailAuditLogService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * 邮件审计日志服务实现
 * 
 * 继承 BaseServiceImpl 以获得标准 CRUD 操作
 * 注意：EmailAuditLog 是系统自动创建的审计日志，不支持 Create/Update 操作
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class EmailAuditLogServiceImpl extends BaseServiceImpl<EmailAuditLog, EmailAuditLogResponse, Void, Void, EmailAuditLogQueryRequest> 
        implements EmailAuditLogService {
    
    private final EmailAuditLogMapper emailAuditLogMapper;
    private final EmailAuditLogConverter emailAuditLogConverter;
    
    @Override
    protected BaseMapper<EmailAuditLog> getMapper() {
        return emailAuditLogMapper;
    }
    
    @Override
    protected BaseConverter<EmailAuditLog, EmailAuditLogResponse, Void, Void> getConverter() {
        // EmailAuditLogConverter doesn't extend BaseConverter since it only needs toResponse()
        // We create an adapter here to satisfy the BaseServiceImpl requirement
        return new BaseConverter<EmailAuditLog, EmailAuditLogResponse, Void, Void>() {
            @Override
            public EmailAuditLogResponse toResponse(EmailAuditLog entity) {
                return emailAuditLogConverter.toResponse(entity);
            }
            
            @Override
            public EmailAuditLog toEntity(Void request) {
                throw new UnsupportedOperationException("EmailAuditLog 不支持从请求创建，由系统自动生成");
            }
            
            @Override
            public void updateEntity(EmailAuditLog entity, Void request) {
                throw new UnsupportedOperationException("EmailAuditLog 不支持更新，审计日志不可修改");
            }
        };
    }
    
    @Override
    protected String getResourceName() {
        return "邮件审计日志";
    }
    
    /**
     * 构建查询条件
     * 覆盖基类方法以添加特定的查询逻辑
     */
    @Override
    protected LambdaQueryWrapper<EmailAuditLog> buildQueryWrapper(EmailAuditLogQueryRequest query) {
        LambdaQueryWrapper<EmailAuditLog> queryWrapper = new LambdaQueryWrapper<>();
        
        // 收件人模糊搜索
        if (query.getRecipient() != null && !query.getRecipient().trim().isEmpty()) {
            queryWrapper.like(EmailAuditLog::getRecipient, query.getRecipient().trim());
        }
        
        // 邮件类型
        if (query.getEmailType() != null && !query.getEmailType().trim().isEmpty()) {
            queryWrapper.eq(EmailAuditLog::getEmailType, query.getEmailType());
        }
        
        // 发送状态
        if (query.getStatus() != null) {
            queryWrapper.eq(EmailAuditLog::getStatus, query.getStatus());
        }
        
        // 时间范围
        if (query.getStartDate() != null) {
            queryWrapper.ge(EmailAuditLog::getCreatedAt, query.getStartDate());
        }
        if (query.getEndDate() != null) {
            queryWrapper.le(EmailAuditLog::getCreatedAt, query.getEndDate());
        }
        
        // 排序
        String sortBy = query.getSortBy() != null ? query.getSortBy() : "created_at";
        boolean isAsc = "asc".equalsIgnoreCase(query.getSortOrder());
        
        if ("sent_at".equals(sortBy)) {
            queryWrapper.orderBy(true, isAsc, EmailAuditLog::getSentAt);
        } else {
            queryWrapper.orderBy(true, isAsc, EmailAuditLog::getCreatedAt);
        }
        
        return queryWrapper;
    }
    
    /**
     * 不支持创建操作（审计日志由系统自动生成）
     */
    @Override
    public EmailAuditLogResponse create(Void request) {
        throw new UnsupportedOperationException("EmailAuditLog 不支持手动创建，由系统自动生成");
    }
    
    /**
     * 不支持更新操作（审计日志不可修改）
     */
    @Override
    public EmailAuditLogResponse update(Long id, Void request) {
        throw new UnsupportedOperationException("EmailAuditLog 不支持更新，审计日志不可修改");
    }
    
    @Override
    public EmailStatisticsResponse getEmailStatistics() {
        log.info("获取邮件统计信息");
        
        EmailStatisticsResponse statistics = new EmailStatisticsResponse();
        
        // 总发送数
        Long totalSent = emailAuditLogMapper.selectCount(null);
        statistics.setTotalSent(totalSent);
        
        // 各状态统计
        Long successCount = emailAuditLogMapper.countByStatus(EmailStatus.SENT);
        Long failedCount = emailAuditLogMapper.countByStatus(EmailStatus.FAILED);
        Long pendingCount = emailAuditLogMapper.countByStatus(EmailStatus.PENDING);
        
        statistics.setSuccessCount(successCount);
        statistics.setFailedCount(failedCount);
        statistics.setPendingCount(pendingCount);
        
        // 成功率
        if (totalSent > 0) {
            double successRate = (successCount * 100.0) / totalSent;
            statistics.setSuccessRate(Math.round(successRate * 100.0) / 100.0);
        } else {
            statistics.setSuccessRate(0.0);
        }
        
        // 各邮件类型统计
        LambdaQueryWrapper<EmailAuditLog> typeWrapper = new LambdaQueryWrapper<>();
        typeWrapper.select(EmailAuditLog::getEmailType);
        List<EmailAuditLog> allLogs = emailAuditLogMapper.selectList(typeWrapper);
        
        Map<String, Long> emailTypeStats = allLogs.stream()
                .collect(Collectors.groupingBy(
                        emailLog -> emailLog.getEmailType() != null ? emailLog.getEmailType() : "UNKNOWN",
                        Collectors.counting()
                ));
        statistics.setEmailTypeStats(emailTypeStats);
        
        // 今日发送数
        LocalDateTime todayStart = LocalDateTime.of(LocalDate.now(), LocalTime.MIN);
        LocalDateTime todayEnd = LocalDateTime.of(LocalDate.now(), LocalTime.MAX);
        Long todaySent = emailAuditLogMapper.countByDateRange(todayStart, todayEnd);
        statistics.setTodaySent(todaySent);
        
        // 本周发送数
        LocalDateTime weekStart = LocalDateTime.of(LocalDate.now().minusDays(7), LocalTime.MIN);
        Long weekSent = emailAuditLogMapper.countByDateRange(weekStart, LocalDateTime.now());
        statistics.setWeekSent(weekSent);
        
        // 本月发送数
        LocalDateTime monthStart = LocalDateTime.of(LocalDate.now().withDayOfMonth(1), LocalTime.MIN);
        Long monthSent = emailAuditLogMapper.countByDateRange(monthStart, LocalDateTime.now());
        statistics.setMonthSent(monthSent);
        
        return statistics;
    }
    
    @Override
    public int cleanupOldLogs(int days) {
        log.info("清理 {} 天前的邮件日志", days);
        
        LocalDateTime cutoffDate = LocalDateTime.now().minusDays(days);
        
        LambdaQueryWrapper<EmailAuditLog> queryWrapper = new LambdaQueryWrapper<>();
        queryWrapper.lt(EmailAuditLog::getCreatedAt, cutoffDate);
        
        int deletedCount = emailAuditLogMapper.delete(queryWrapper);
        log.info("已清理 {} 条邮件日志", deletedCount);
        
        return deletedCount;
    }
}
