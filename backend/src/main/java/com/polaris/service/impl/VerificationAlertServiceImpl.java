package com.polaris.service.impl;

import com.polaris.service.AlertHistoryService;
import com.polaris.service.AlertNotificationService;
import com.polaris.service.VerificationAlertService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.concurrent.TimeUnit;

/**
 * 验证码告警服务实现
 * 实现验证码系统的监控和告警功能
 * 
 * Requirements: 需求13 - 监控和日志
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class VerificationAlertServiceImpl implements VerificationAlertService {
    
    private final AlertNotificationService alertNotificationService;
    private final RedisTemplate<String, Object> redisTemplate;
    private final AlertHistoryService alertHistoryService;
    
    // 告警阈值配置
    @Value("${verification.alert.send-failure-rate-threshold:0.05}")
    private double sendFailureRateThreshold; // 5%
    
    @Value("${verification.alert.verify-failure-rate-threshold:0.30}")
    private double verifyFailureRateThreshold; // 30%
    
    @Value("${verification.alert.rate-limit-threshold:100}")
    private long rateLimitThreshold; // 每小时限流触发次数
    
    @Value("${verification.alert.anomaly-threshold:50}")
    private long anomalyThreshold; // 每小时异常行为检测次数
    
    // Redis key 前缀
    private static final String ALERT_HISTORY_KEY = "verification:alert:history:";
    private static final String ALERT_STATS_KEY = "verification:alert:stats:";
    private static final String ALERT_COOLDOWN_KEY = "verification:alert:cooldown:";
    
    // 告警冷却时间（避免重复告警）
    private static final long ALERT_COOLDOWN_MINUTES = 30;
    
    @Override
    public void checkSendFailureRate(long totalSent, long totalFailed) {
        if (totalSent == 0) {
            return;
        }
        
        double failureRate = (double) totalFailed / (totalSent + totalFailed);
        
        if (failureRate > sendFailureRateThreshold) {
            String alertKey = "send_failure_rate";
            
            // 检查是否在冷却期内
            if (isInCooldown(alertKey)) {
                log.debug("告警在冷却期内，跳过: {}", alertKey);
                return;
            }
            
            String title = "验证码发送失败率过高";
            String message = String.format(
                "验证码发送失败率: %.2f%% (阈值: %.2f%%)\n" +
                "总发送次数: %d\n" +
                "失败次数: %d\n" +
                "时间: %s",
                failureRate * 100,
                sendFailureRateThreshold * 100,
                totalSent,
                totalFailed,
                LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"))
            );
            
            log.warn("触发告警: {}", title);
            sendVerificationAlert(title, message, "WARNING");
            recordAlertHistory("SEND_FAILURE_RATE", title, message, "WARNING");
            setCooldown(alertKey);
        }
    }
    
    @Override
    public void checkVerifyFailureRate(long totalVerified, long totalFailed) {
        if (totalVerified == 0) {
            return;
        }
        
        double failureRate = (double) totalFailed / (totalVerified + totalFailed);
        
        if (failureRate > verifyFailureRateThreshold) {
            String alertKey = "verify_failure_rate";
            
            if (isInCooldown(alertKey)) {
                log.debug("告警在冷却期内，跳过: {}", alertKey);
                return;
            }
            
            String title = "验证码验证失败率过高";
            String message = String.format(
                "验证码验证失败率: %.2f%% (阈值: %.2f%%)\n" +
                "总验证次数: %d\n" +
                "失败次数: %d\n" +
                "时间: %s\n\n" +
                "可能原因:\n" +
                "1. 用户输入错误\n" +
                "2. 验证码过期\n" +
                "3. 暴力破解攻击",
                failureRate * 100,
                verifyFailureRateThreshold * 100,
                totalVerified,
                totalFailed,
                LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"))
            );
            
            log.warn("触发告警: {}", title);
            sendVerificationAlert(title, message, "WARNING");
            recordAlertHistory("VERIFY_FAILURE_RATE", title, message, "WARNING");
            setCooldown(alertKey);
        }
    }
    
    @Override
    public void checkRateLimitTriggers(long rateLimitCount) {
        if (rateLimitCount > rateLimitThreshold) {
            String alertKey = "rate_limit_triggers";
            
            if (isInCooldown(alertKey)) {
                log.debug("告警在冷却期内，跳过: {}", alertKey);
                return;
            }
            
            String title = "限流触发次数异常";
            String message = String.format(
                "限流触发次数: %d (阈值: %d)\n" +
                "时间: %s\n\n" +
                "可能原因:\n" +
                "1. 正常流量激增\n" +
                "2. 恶意攻击\n" +
                "3. 系统配置问题",
                rateLimitCount,
                rateLimitThreshold,
                LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"))
            );
            
            log.warn("触发告警: {}", title);
            sendVerificationAlert(title, message, "WARNING");
            recordAlertHistory("RATE_LIMIT_TRIGGERS", title, message, "WARNING");
            setCooldown(alertKey);
        }
    }
    
    @Override
    public void checkAnomalyDetection(long anomalyCount) {
        if (anomalyCount > anomalyThreshold) {
            String alertKey = "anomaly_detection";
            
            if (isInCooldown(alertKey)) {
                log.debug("告警在冷却期内，跳过: {}", alertKey);
                return;
            }
            
            String title = "异常行为检测次数过高";
            String message = String.format(
                "异常行为检测次数: %d (阈值: %d)\n" +
                "时间: %s\n\n" +
                "建议:\n" +
                "1. 检查系统日志\n" +
                "2. 分析异常IP地址\n" +
                "3. 考虑加强安全措施",
                anomalyCount,
                anomalyThreshold,
                LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"))
            );
            
            log.warn("触发告警: {}", title);
            sendVerificationAlert(title, message, "CRITICAL");
            recordAlertHistory("ANOMALY_DETECTION", title, message, "CRITICAL");
            setCooldown(alertKey);
        }
    }
    
    @Override
    public void sendVerificationAlert(String title, String message, String level) {
        try {
            alertNotificationService.sendAlert(
                "[验证码系统] " + title,
                message,
                level
            );
            log.info("验证码告警已发送: title={}, level={}", title, level);
        } catch (Exception e) {
            log.error("发送验证码告警失败: title={}", title, e);
        }
    }
    
    @Override
    public void recordAlertHistory(String alertType, String title, String message, String level) {
        try {
            // 保存到数据库
            alertHistoryService.saveAlertHistory(alertType, title, message, level);
            
            // 同时保存到 Redis（用于快速查询最近的告警）
            String key = ALERT_HISTORY_KEY + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHH"));
            
            AlertHistoryRecord record = new AlertHistoryRecord(
                alertType,
                title,
                message,
                level,
                LocalDateTime.now()
            );
            
            // 存储到 Redis List，保留最近 24 小时的记录
            redisTemplate.opsForList().rightPush(key, record);
            redisTemplate.expire(key, 24, TimeUnit.HOURS);
            
            // 更新统计信息
            updateAlertStatistics(alertType, level);
            
            log.debug("告警历史已记录: type={}, level={}", alertType, level);
        } catch (Exception e) {
            log.error("记录告警历史失败: type={}", alertType, e);
        }
    }
    
    @Override
    public AlertStatistics getAlertStatistics(int hours) {
        try {
            AlertStatistics stats = new AlertStatistics();
            
            // 从 Redis 获取最近 N 小时的统计数据
            LocalDateTime now = LocalDateTime.now();
            for (int i = 0; i < hours; i++) {
                LocalDateTime time = now.minusHours(i);
                String key = ALERT_STATS_KEY + time.format(DateTimeFormatter.ofPattern("yyyyMMddHH"));
                
                Object statsObj = redisTemplate.opsForValue().get(key);
                if (statsObj instanceof AlertStatistics) {
                    AlertStatistics hourStats = (AlertStatistics) statsObj;
                    stats.setTotalAlerts(stats.getTotalAlerts() + hourStats.getTotalAlerts());
                    stats.setCriticalAlerts(stats.getCriticalAlerts() + hourStats.getCriticalAlerts());
                    stats.setWarningAlerts(stats.getWarningAlerts() + hourStats.getWarningAlerts());
                    stats.setInfoAlerts(stats.getInfoAlerts() + hourStats.getInfoAlerts());
                    stats.setSendFailureAlerts(stats.getSendFailureAlerts() + hourStats.getSendFailureAlerts());
                    stats.setVerifyFailureAlerts(stats.getVerifyFailureAlerts() + hourStats.getVerifyFailureAlerts());
                    stats.setRateLimitAlerts(stats.getRateLimitAlerts() + hourStats.getRateLimitAlerts());
                }
            }
            
            return stats;
        } catch (Exception e) {
            log.error("获取告警统计信息失败", e);
            return new AlertStatistics();
        }
    }
    
    /**
     * 检查告警是否在冷却期内
     */
    private boolean isInCooldown(String alertKey) {
        String key = ALERT_COOLDOWN_KEY + alertKey;
        return Boolean.TRUE.equals(redisTemplate.hasKey(key));
    }
    
    /**
     * 设置告警冷却期
     */
    private void setCooldown(String alertKey) {
        String key = ALERT_COOLDOWN_KEY + alertKey;
        redisTemplate.opsForValue().set(key, "1", ALERT_COOLDOWN_MINUTES, TimeUnit.MINUTES);
    }
    
    /**
     * 更新告警统计信息
     */
    private void updateAlertStatistics(String alertType, String level) {
        try {
            String key = ALERT_STATS_KEY + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHH"));
            
            AlertStatistics stats = (AlertStatistics) redisTemplate.opsForValue().get(key);
            if (stats == null) {
                stats = new AlertStatistics();
            }
            
            // 更新总数
            stats.setTotalAlerts(stats.getTotalAlerts() + 1);
            
            // 更新级别统计
            switch (level.toUpperCase()) {
                case "CRITICAL":
                    stats.setCriticalAlerts(stats.getCriticalAlerts() + 1);
                    break;
                case "WARNING":
                    stats.setWarningAlerts(stats.getWarningAlerts() + 1);
                    break;
                case "INFO":
                    stats.setInfoAlerts(stats.getInfoAlerts() + 1);
                    break;
            }
            
            // 更新类型统计
            switch (alertType) {
                case "SEND_FAILURE_RATE":
                    stats.setSendFailureAlerts(stats.getSendFailureAlerts() + 1);
                    break;
                case "VERIFY_FAILURE_RATE":
                    stats.setVerifyFailureAlerts(stats.getVerifyFailureAlerts() + 1);
                    break;
                case "RATE_LIMIT_TRIGGERS":
                    stats.setRateLimitAlerts(stats.getRateLimitAlerts() + 1);
                    break;
            }
            
            // 保存到 Redis，保留 24 小时
            redisTemplate.opsForValue().set(key, stats, 24, TimeUnit.HOURS);
        } catch (Exception e) {
            log.error("更新告警统计信息失败", e);
        }
    }
    
    /**
     * 告警历史记录
     */
    private static class AlertHistoryRecord {
        private String alertType;
        private String title;
        private String message;
        private String level;
        private LocalDateTime timestamp;
        
        public AlertHistoryRecord(String alertType, String title, String message, String level, LocalDateTime timestamp) {
            this.alertType = alertType;
            this.title = title;
            this.message = message;
            this.level = level;
            this.timestamp = timestamp;
        }
        
        // Getters
        public String getAlertType() {
            return alertType;
        }
        
        public String getTitle() {
            return title;
        }
        
        public String getMessage() {
            return message;
        }
        
        public String getLevel() {
            return level;
        }
        
        public LocalDateTime getTimestamp() {
            return timestamp;
        }
    }
}
