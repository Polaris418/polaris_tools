package com.polaris.service;

/**
 * 验证码告警服务接口
 * 负责监控验证码系统的运行状况并触发告警
 * 
 * Requirements: 需求13 - 监控和日志
 */
public interface VerificationAlertService {
    
    /**
     * 检查验证码发送失败率并触发告警
     * 当发送失败率超过 5% 时触发告警
     * 
     * @param totalSent 总发送次数
     * @param totalFailed 总失败次数
     */
    void checkSendFailureRate(long totalSent, long totalFailed);
    
    /**
     * 检查验证码验证失败率并触发告警
     * 当验证失败率超过 30% 时触发告警
     * 
     * @param totalVerified 总验证次数
     * @param totalFailed 总失败次数
     */
    void checkVerifyFailureRate(long totalVerified, long totalFailed);
    
    /**
     * 检查限流触发次数并触发告警
     * 当限流触发次数异常增长时触发告警
     * 
     * @param rateLimitCount 限流触发次数
     */
    void checkRateLimitTriggers(long rateLimitCount);
    
    /**
     * 检查异常行为检测次数并触发告警
     * 
     * @param anomalyCount 异常行为检测次数
     */
    void checkAnomalyDetection(long anomalyCount);
    
    /**
     * 发送验证码系统告警
     * 
     * @param title 告警标题
     * @param message 告警消息
     * @param level 告警级别（INFO/WARNING/CRITICAL）
     */
    void sendVerificationAlert(String title, String message, String level);
    
    /**
     * 记录告警历史
     * 
     * @param alertType 告警类型
     * @param title 告警标题
     * @param message 告警消息
     * @param level 告警级别
     */
    void recordAlertHistory(String alertType, String title, String message, String level);
    
    /**
     * 获取告警统计信息
     * 
     * @param hours 统计最近N小时的告警
     * @return 告警统计信息
     */
    AlertStatistics getAlertStatistics(int hours);
    
    /**
     * 告警统计信息
     */
    class AlertStatistics {
        private long totalAlerts;
        private long criticalAlerts;
        private long warningAlerts;
        private long infoAlerts;
        private long sendFailureAlerts;
        private long verifyFailureAlerts;
        private long rateLimitAlerts;
        
        public AlertStatistics() {
        }
        
        public AlertStatistics(long totalAlerts, long criticalAlerts, long warningAlerts, 
                             long infoAlerts, long sendFailureAlerts, long verifyFailureAlerts, 
                             long rateLimitAlerts) {
            this.totalAlerts = totalAlerts;
            this.criticalAlerts = criticalAlerts;
            this.warningAlerts = warningAlerts;
            this.infoAlerts = infoAlerts;
            this.sendFailureAlerts = sendFailureAlerts;
            this.verifyFailureAlerts = verifyFailureAlerts;
            this.rateLimitAlerts = rateLimitAlerts;
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
    }
}
