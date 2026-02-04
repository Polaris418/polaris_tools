package com.polaris.service.impl;

import com.polaris.entity.EmailMetrics;
import com.polaris.service.AlertNotificationService;
import com.polaris.service.AlertRuleEngine;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.concurrent.atomic.AtomicBoolean;

/**
 * 告警规则引擎实现
 * 根据配置的阈值检查邮件指标并触发告警
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AlertRuleEngineImpl implements AlertRuleEngine {
    
    private final AlertNotificationService alertNotificationService;
    
    // 告警阈值配置
    @Value("${email.monitoring.alert-threshold.success-rate:0.95}")
    private double successRateThreshold;
    
    @Value("${email.monitoring.alert-threshold.bounce-rate:0.05}")
    private double bounceRateThreshold;
    
    @Value("${email.monitoring.alert-threshold.complaint-rate:0.001}")
    private double complaintRateThreshold;
    
    // 邮件发送暂停标志
    private final AtomicBoolean emailSendingPaused = new AtomicBoolean(false);
    
    @Override
    public void checkAndAlert(EmailMetrics metrics) {
        if (metrics == null) {
            return;
        }
        
        // 检查成功率
        if (shouldAlertLowSuccessRate(metrics.getSuccessRate())) {
            String message = String.format(
                "邮件发送成功率过低！当前成功率: %.2f%%, 阈值: %.2f%%",
                metrics.getSuccessRate(), successRateThreshold * 100
            );
            log.warn(message);
            alertNotificationService.sendAlert("低成功率告警", message, "WARNING");
        }
        
        // 检查退信率
        if (shouldAlertHighBounceRate(metrics.getBounceRate())) {
            String message = String.format(
                "邮件退信率过高！当前退信率: %.2f%%, 阈值: %.2f%%",
                metrics.getBounceRate(), bounceRateThreshold * 100
            );
            log.warn(message);
            alertNotificationService.sendAlert("高退信率告警", message, "WARNING");
        }
        
        // 检查投诉率（严重告警，需要暂停发送）
        if (shouldAlertHighComplaintRate(metrics.getComplaintRate())) {
            String message = String.format(
                "邮件投诉率过高！当前投诉率: %.2f%%, 阈值: %.2f%%. 已自动暂停邮件发送！",
                metrics.getComplaintRate(), complaintRateThreshold * 100
            );
            log.error(message);
            
            // 暂停邮件发送
            pauseEmailSending();
            
            // 发送严重告警
            alertNotificationService.sendAlert("高投诉率告警（已暂停发送）", message, "CRITICAL");
        }
    }
    
    @Override
    public boolean shouldAlertLowSuccessRate(double successRate) {
        // 成功率低于阈值（例如 95%）
        return successRate < successRateThreshold * 100;
    }
    
    @Override
    public boolean shouldAlertHighBounceRate(double bounceRate) {
        // 退信率超过阈值（例如 5%）
        return bounceRate > bounceRateThreshold * 100;
    }
    
    @Override
    public boolean shouldAlertHighComplaintRate(double complaintRate) {
        // 投诉率超过阈值（例如 0.1%）
        return complaintRate > complaintRateThreshold * 100;
    }
    
    @Override
    public void pauseEmailSending() {
        if (emailSendingPaused.compareAndSet(false, true)) {
            log.error("邮件发送已暂停！");
        }
    }
    
    @Override
    public void resumeEmailSending() {
        if (emailSendingPaused.compareAndSet(true, false)) {
            log.info("邮件发送已恢复");
        }
    }
    
    @Override
    public boolean isEmailSendingPaused() {
        return emailSendingPaused.get();
    }
}
