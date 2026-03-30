package com.polaris.email.alert.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.polaris.entity.VerificationAlertHistory;
import com.polaris.mapper.VerificationAlertHistoryMapper;
import com.polaris.email.alert.AlertHistoryService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 告警历史服务实现
 * 提供告警历史的持久化和查询功能
 * 
 * Requirements: 需求13 - 监控和日志
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AlertHistoryServiceImpl implements AlertHistoryService {
    
    private final VerificationAlertHistoryMapper alertHistoryMapper;
    
    @Override
    @Transactional
    public VerificationAlertHistory saveAlertHistory(String alertType, String title, String message, String level) {
        try {
            VerificationAlertHistory history = new VerificationAlertHistory();
            history.setAlertType(alertType);
            history.setTitle(title);
            history.setMessage(message);
            history.setLevel(level);
            history.setAlertTime(LocalDateTime.now());
            history.setResolved(false);
            
            alertHistoryMapper.insert(history);
            
            log.info("告警历史已保存: id={}, type={}, level={}", history.getId(), alertType, level);
            return history;
        } catch (Exception e) {
            log.error("保存告警历史失败: type={}", alertType, e);
            throw new RuntimeException("保存告警历史失败", e);
        }
    }
    
    @Override
    public List<VerificationAlertHistory> getAlertHistory(LocalDateTime startTime, LocalDateTime endTime) {
        try {
            return alertHistoryMapper.findByTimeRange(startTime, endTime);
        } catch (Exception e) {
            log.error("查询告警历史失败", e);
            throw new RuntimeException("查询告警历史失败", e);
        }
    }
    
    @Override
    public List<VerificationAlertHistory> getAlertHistoryByType(String alertType, int limit) {
        try {
            return alertHistoryMapper.findByAlertType(alertType, limit);
        } catch (Exception e) {
            log.error("查询告警历史失败: type={}", alertType, e);
            throw new RuntimeException("查询告警历史失败", e);
        }
    }
    
    @Override
    public List<VerificationAlertHistory> getUnresolvedAlerts() {
        try {
            return alertHistoryMapper.findUnresolved();
        } catch (Exception e) {
            log.error("查询未处理告警失败", e);
            throw new RuntimeException("查询未处理告警失败", e);
        }
    }
    
    @Override
    @Transactional
    public void resolveAlert(Long alertId, String resolvedBy, String resolveNote) {
        try {
            LambdaUpdateWrapper<VerificationAlertHistory> updateWrapper = new LambdaUpdateWrapper<>();
            updateWrapper.eq(VerificationAlertHistory::getId, alertId)
                        .set(VerificationAlertHistory::getResolved, true)
                        .set(VerificationAlertHistory::getResolvedTime, LocalDateTime.now())
                        .set(VerificationAlertHistory::getResolvedBy, resolvedBy)
                        .set(VerificationAlertHistory::getResolveNote, resolveNote);
            
            alertHistoryMapper.update(null, updateWrapper);
            
            log.info("告警已标记为已处理: id={}, resolvedBy={}", alertId, resolvedBy);
        } catch (Exception e) {
            log.error("标记告警为已处理失败: id={}", alertId, e);
            throw new RuntimeException("标记告警为已处理失败", e);
        }
    }
    
    @Override
    public AlertStatistics getAlertStatistics(int hours) {
        try {
            LocalDateTime endTime = LocalDateTime.now();
            LocalDateTime startTime = endTime.minusHours(hours);
            
            AlertStatistics stats = new AlertStatistics();
            
            // 统计总告警数
            long totalAlerts = alertHistoryMapper.countByTimeRange(startTime, endTime);
            stats.setTotalAlerts(totalAlerts);
            
            // 统计各级别告警数
            stats.setCriticalAlerts(alertHistoryMapper.countByLevel("CRITICAL", startTime, endTime));
            stats.setWarningAlerts(alertHistoryMapper.countByLevel("WARNING", startTime, endTime));
            stats.setInfoAlerts(alertHistoryMapper.countByLevel("INFO", startTime, endTime));
            
            // 统计未处理告警数
            List<VerificationAlertHistory> unresolvedAlerts = getUnresolvedAlerts();
            stats.setUnresolvedAlerts(unresolvedAlerts.size());
            
            // 统计各类型告警数
            List<VerificationAlertHistory> allAlerts = getAlertHistory(startTime, endTime);
            long sendFailureCount = allAlerts.stream()
                .filter(a -> "SEND_FAILURE_RATE".equals(a.getAlertType()))
                .count();
            long verifyFailureCount = allAlerts.stream()
                .filter(a -> "VERIFY_FAILURE_RATE".equals(a.getAlertType()))
                .count();
            long rateLimitCount = allAlerts.stream()
                .filter(a -> "RATE_LIMIT_TRIGGERS".equals(a.getAlertType()))
                .count();
            long anomalyCount = allAlerts.stream()
                .filter(a -> "ANOMALY_DETECTION".equals(a.getAlertType()))
                .count();
            
            stats.setSendFailureAlerts(sendFailureCount);
            stats.setVerifyFailureAlerts(verifyFailureCount);
            stats.setRateLimitAlerts(rateLimitCount);
            stats.setAnomalyAlerts(anomalyCount);
            
            return stats;
        } catch (Exception e) {
            log.error("获取告警统计信息失败", e);
            return new AlertStatistics();
        }
    }
    
    @Override
    @Transactional
    public int cleanupOldAlerts(int days) {
        try {
            LocalDateTime cutoffTime = LocalDateTime.now().minusDays(days);
            
            LambdaQueryWrapper<VerificationAlertHistory> queryWrapper = new LambdaQueryWrapper<>();
            queryWrapper.lt(VerificationAlertHistory::getAlertTime, cutoffTime);
            
            int count = alertHistoryMapper.delete(queryWrapper);
            
            log.info("已清理过期告警历史: count={}, days={}", count, days);
            return count;
        } catch (Exception e) {
            log.error("清理过期告警历史失败", e);
            throw new RuntimeException("清理过期告警历史失败", e);
        }
    }
}
