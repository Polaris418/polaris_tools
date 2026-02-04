package com.polaris.service;

/**
 * 告警通知服务接口
 * 负责发送告警通知到各种渠道
 */
public interface AlertNotificationService {
    
    /**
     * 发送告警通知
     * 
     * @param title 告警标题
     * @param message 告警消息
     * @param level 告警级别（INFO/WARNING/CRITICAL）
     */
    void sendAlert(String title, String message, String level);
    
    /**
     * 通过邮件发送告警
     * 
     * @param title 告警标题
     * @param message 告警消息
     * @param level 告警级别
     */
    void sendEmailAlert(String title, String message, String level);
    
    /**
     * 通过 Webhook 发送告警（Slack/钉钉）
     * 
     * @param title 告警标题
     * @param message 告警消息
     * @param level 告警级别
     */
    void sendWebhookAlert(String title, String message, String level);
}
