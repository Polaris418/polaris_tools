package com.polaris.service;

import com.polaris.entity.EmailMetrics;

/**
 * 告警规则引擎接口
 * 负责检查邮件指标并触发告警
 */
public interface AlertRuleEngine {
    
    /**
     * 检查指标并触发告警
     * 
     * @param metrics 邮件指标
     */
    void checkAndAlert(EmailMetrics metrics);
    
    /**
     * 检查成功率是否低于阈值
     * 
     * @param successRate 成功率
     * @return 是否需要告警
     */
    boolean shouldAlertLowSuccessRate(double successRate);
    
    /**
     * 检查退信率是否超过阈值
     * 
     * @param bounceRate 退信率
     * @return 是否需要告警
     */
    boolean shouldAlertHighBounceRate(double bounceRate);
    
    /**
     * 检查投诉率是否超过阈值
     * 
     * @param complaintRate 投诉率
     * @return 是否需要告警
     */
    boolean shouldAlertHighComplaintRate(double complaintRate);
    
    /**
     * 暂停邮件发送
     */
    void pauseEmailSending();
    
    /**
     * 恢复邮件发送
     */
    void resumeEmailSending();
    
    /**
     * 检查邮件发送是否已暂停
     * 
     * @return 是否已暂停
     */
    boolean isEmailSendingPaused();
}
