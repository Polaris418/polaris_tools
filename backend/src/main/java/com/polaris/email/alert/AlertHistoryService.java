package com.polaris.email.alert;

import com.polaris.entity.VerificationAlertHistory;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 告警历史服务接口
 * 负责管理告警历史记录
 * 
 * Requirements: 需求13 - 监控和日志
 */
public interface AlertHistoryService {
    
    /**
     * 保存告警历史
     * 
     * @param alertType 告警类型
     * @param title 告警标题
     * @param message 告警消息
     * @param level 告警级别
     * @return 告警历史记录
     */
    VerificationAlertHistory saveAlertHistory(String alertType, String title, String message, String level);
    
    /**
     * 查询指定时间范围内的告警历史
     * 
     * @param startTime 开始时间
     * @param endTime 结束时间
     * @return 告警历史列表
     */
    List<VerificationAlertHistory> getAlertHistory(LocalDateTime startTime, LocalDateTime endTime);
    
    /**
     * 查询指定类型的告警历史
     * 
     * @param alertType 告警类型
     * @param limit 限制数量
     * @return 告警历史列表
     */
    List<VerificationAlertHistory> getAlertHistoryByType(String alertType, int limit);
    
    /**
     * 查询未处理的告警
     * 
     * @return 未处理的告警列表
     */
    List<VerificationAlertHistory> getUnresolvedAlerts();
    
    /**
     * 标记告警为已处理
     * 
     * @param alertId 告警ID
     * @param resolvedBy 处理人
     * @param resolveNote 处理备注
     */
    void resolveAlert(Long alertId, String resolvedBy, String resolveNote);
    
    /**
     * 获取告警统计信息
     * 
     * @param hours 统计最近N小时的告警
     * @return 告警统计信息
     */
    AlertStatistics getAlertStatistics(int hours);
    
    /**
     * 清理过期的告警历史
     * 
     * @param days 保留最近N天的记录
     * @return 清理的记录数
     */
    int cleanupOldAlerts(int days);
    
    /**
     * 告警统计信息
     */
    class AlertStatistics {
        private long totalAlerts;
        private long criticalAlerts;
        private long warningAlerts;
        private long infoAlerts;
        private long unresolvedAlerts;
        private long sendFailureAlerts;
        private long verifyFailureAlerts;
        private long rateLimitAlerts;
        private long anomalyAlerts;
        
        public AlertStatistics() {
        }
        
        // Getters and Setters
        public long getTotalAlerts() {
            return totalAlerts;
        }
        
        public void setTotalAlerts(long totalAlerts) {
            this.totalAlerts = totalAlerts;
        }
        
        public long getCriticalAlerts() {
            return criticalAlerts;
        }
        
        public void setCriticalAlerts(long criticalAlerts) {
            this.criticalAlerts = criticalAlerts;
        }
        
        public long getWarningAlerts() {
            return warningAlerts;
        }
        
        public void setWarningAlerts(long warningAlerts) {
            this.warningAlerts = warningAlerts;
        }
        
        public long getInfoAlerts() {
            return infoAlerts;
        }
        
        public void setInfoAlerts(long infoAlerts) {
            this.infoAlerts = infoAlerts;
        }
        
        public long getUnresolvedAlerts() {
            return unresolvedAlerts;
        }
        
        public void setUnresolvedAlerts(long unresolvedAlerts) {
            this.unresolvedAlerts = unresolvedAlerts;
        }
        
        public long getSendFailureAlerts() {
            return sendFailureAlerts;
        }
        
        public void setSendFailureAlerts(long sendFailureAlerts) {
            this.sendFailureAlerts = sendFailureAlerts;
        }
        
        public long getVerifyFailureAlerts() {
            return verifyFailureAlerts;
        }
        
        public void setVerifyFailureAlerts(long verifyFailureAlerts) {
            this.verifyFailureAlerts = verifyFailureAlerts;
        }
        
        public long getRateLimitAlerts() {
            return rateLimitAlerts;
        }
        
        public void setRateLimitAlerts(long rateLimitAlerts) {
            this.rateLimitAlerts = rateLimitAlerts;
        }
        
        public long getAnomalyAlerts() {
            return anomalyAlerts;
        }
        
        public void setAnomalyAlerts(long anomalyAlerts) {
            this.anomalyAlerts = anomalyAlerts;
        }
    }
}
