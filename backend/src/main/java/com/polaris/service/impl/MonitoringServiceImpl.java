package com.polaris.service.impl;

import com.polaris.email.entity.EmailMetrics;
import com.polaris.email.mapper.EmailMetricsMapper;
import com.polaris.email.alert.AlertRuleEngine;
import com.polaris.service.MonitoringService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;

/**
 * 邮件监控服务实现
 * 实时统计邮件发送指标并定期持久化到数据库
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class MonitoringServiceImpl implements MonitoringService {
    
    private final EmailMetricsMapper emailMetricsMapper;
    private final AlertRuleEngine alertRuleEngine;
    
    // 当前小时的统计数据（使用原子类保证线程安全）
    private final AtomicInteger currentSentCount = new AtomicInteger(0);
    private final AtomicInteger currentFailedCount = new AtomicInteger(0);
    private final AtomicInteger currentBounceCount = new AtomicInteger(0);
    private final AtomicInteger currentComplaintCount = new AtomicInteger(0);
    private final AtomicLong currentTotalDelayMs = new AtomicLong(0);
    
    // 当前统计的小时
    private volatile LocalDateTime currentMetricHour = getCurrentHour();
    
    @Override
    public void recordEmailSent(long delayMs) {
        checkAndResetIfNewHour();
        currentSentCount.incrementAndGet();
        currentTotalDelayMs.addAndGet(delayMs);
        log.debug("记录邮件发送成功，延迟: {}ms", delayMs);
    }
    
    @Override
    public void recordEmailFailed() {
        checkAndResetIfNewHour();
        currentFailedCount.incrementAndGet();
        log.debug("记录邮件发送失败");
    }
    
    @Override
    public void recordEmailBounce() {
        checkAndResetIfNewHour();
        currentBounceCount.incrementAndGet();
        log.debug("记录邮件退信");
    }
    
    @Override
    public void recordEmailComplaint() {
        checkAndResetIfNewHour();
        currentComplaintCount.incrementAndGet();
        log.debug("记录邮件投诉");
    }
    
    @Override
    public EmailMetrics getCurrentHourMetrics() {
        EmailMetrics metrics = new EmailMetrics();
        metrics.setMetricHour(currentMetricHour);
        
        int sentCount = currentSentCount.get();
        int failedCount = currentFailedCount.get();
        int bounceCount = currentBounceCount.get();
        int complaintCount = currentComplaintCount.get();
        long totalDelayMs = currentTotalDelayMs.get();
        
        metrics.setSentCount(sentCount);
        metrics.setFailedCount(failedCount);
        metrics.setBounceCount(bounceCount);
        metrics.setComplaintCount(complaintCount);
        metrics.setTotalDelayMs(totalDelayMs);
        
        // 计算各种率
        metrics.setSuccessRate(calculateSuccessRate(sentCount, failedCount));
        metrics.setFailureRate(calculateFailureRate(sentCount, failedCount));
        
        int totalCount = sentCount + failedCount;
        metrics.setBounceRate(calculateBounceRate(bounceCount, totalCount));
        metrics.setComplaintRate(calculateComplaintRate(complaintCount, totalCount));
        metrics.setAvgDelayMs(calculateAvgDelay(totalDelayMs, sentCount));
        
        return metrics;
    }
    
    @Override
    public List<EmailMetrics> getMetricsByTimeRange(LocalDateTime startTime, LocalDateTime endTime) {
        return emailMetricsMapper.findByTimeRange(startTime, endTime);
    }
    
    @Override
    public List<EmailMetrics> getRecentMetrics(int hours) {
        return emailMetricsMapper.findRecent(hours);
    }
    
    @Override
    public double calculateSuccessRate(int sentCount, int failedCount) {
        int totalCount = sentCount + failedCount;
        if (totalCount == 0) {
            return 0.0;
        }
        return (double) sentCount / totalCount * 100.0;
    }
    
    @Override
    public double calculateFailureRate(int sentCount, int failedCount) {
        int totalCount = sentCount + failedCount;
        if (totalCount == 0) {
            return 0.0;
        }
        return (double) failedCount / totalCount * 100.0;
    }
    
    @Override
    public double calculateBounceRate(int bounceCount, int totalCount) {
        if (totalCount == 0) {
            return 0.0;
        }
        return (double) bounceCount / totalCount * 100.0;
    }
    
    @Override
    public double calculateComplaintRate(int complaintCount, int totalCount) {
        if (totalCount == 0) {
            return 0.0;
        }
        return (double) complaintCount / totalCount * 100.0;
    }
    
    @Override
    public double calculateAvgDelay(long totalDelayMs, int count) {
        if (count == 0) {
            return 0.0;
        }
        return (double) totalDelayMs / count;
    }
    
    @Override
    @Scheduled(cron = "0 0 * * * ?") // 每小时整点执行
    public void flushCurrentMetrics() {
        try {
            EmailMetrics metrics = getCurrentHourMetrics();
            
            // 如果当前小时没有任何邮件活动，跳过保存
            if (metrics.getSentCount() == 0 && metrics.getFailedCount() == 0 
                && metrics.getBounceCount() == 0 && metrics.getComplaintCount() == 0) {
                log.debug("当前小时无邮件活动，跳过指标保存");
                return;
            }
            
            // 检查是否已存在该小时的记录
            EmailMetrics existing = emailMetricsMapper.findByHour(metrics.getMetricHour());
            if (existing != null) {
                // 更新现有记录
                metrics.setId(existing.getId());
                emailMetricsMapper.updateById(metrics);
                log.info("更新邮件指标: hour={}, sent={}, failed={}, bounce={}, complaint={}", 
                    metrics.getMetricHour(), metrics.getSentCount(), metrics.getFailedCount(),
                    metrics.getBounceCount(), metrics.getComplaintCount());
            } else {
                // 插入新记录
                emailMetricsMapper.insert(metrics);
                log.info("保存邮件指标: hour={}, sent={}, failed={}, bounce={}, complaint={}", 
                    metrics.getMetricHour(), metrics.getSentCount(), metrics.getFailedCount(),
                    metrics.getBounceCount(), metrics.getComplaintCount());
            }
            
            // 检查告警规则
            alertRuleEngine.checkAndAlert(metrics);
            
        } catch (Exception e) {
            log.error("刷新邮件指标失败", e);
        }
    }
    
    /**
     * 检查是否进入新的小时，如果是则重置计数器
     */
    private void checkAndResetIfNewHour() {
        LocalDateTime now = getCurrentHour();
        if (!now.equals(currentMetricHour)) {
            synchronized (this) {
                if (!now.equals(currentMetricHour)) {
                    // 先保存当前小时的数据
                    flushCurrentMetrics();
                    
                    // 重置计数器
                    currentSentCount.set(0);
                    currentFailedCount.set(0);
                    currentBounceCount.set(0);
                    currentComplaintCount.set(0);
                    currentTotalDelayMs.set(0);
                    currentMetricHour = now;
                    
                    log.info("进入新的统计小时: {}", currentMetricHour);
                }
            }
        }
    }
    
    /**
     * 获取当前小时（截断到小时）
     */
    private LocalDateTime getCurrentHour() {
        return LocalDateTime.now().truncatedTo(ChronoUnit.HOURS);
    }
}
