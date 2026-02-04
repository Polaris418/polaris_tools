package com.polaris.dto.email;

import lombok.Data;

import java.util.List;

/**
 * 监控仪表板响应 DTO
 */
@Data
public class MonitoringDashboardResponse {
    
    /**
     * 当前小时指标
     */
    private EmailMetricsResponse currentHourMetrics;
    
    /**
     * 最近24小时指标列表
     */
    private List<EmailMetricsResponse> recentMetrics;
    
    /**
     * 总发送数（最近24小时）
     */
    private Integer totalSent;
    
    /**
     * 总失败数（最近24小时）
     */
    private Integer totalFailed;
    
    /**
     * 总退信数（最近24小时）
     */
    private Integer totalBounce;
    
    /**
     * 总投诉数（最近24小时）
     */
    private Integer totalComplaint;
    
    /**
     * 平均成功率（最近24小时）
     */
    private Double avgSuccessRate;
    
    /**
     * 平均退信率（最近24小时）
     */
    private Double avgBounceRate;
    
    /**
     * 平均投诉率（最近24小时）
     */
    private Double avgComplaintRate;
    
    /**
     * 邮件发送是否已暂停
     */
    private Boolean emailSendingPaused;
    
    /**
     * 告警列表
     */
    private List<AlertInfo> alerts;
    
    @Data
    public static class AlertInfo {
        /**
         * 告警类型
         */
        private String type;
        
        /**
         * 告警级别
         */
        private String level;
        
        /**
         * 告警消息
         */
        private String message;
        
        /**
         * 当前值
         */
        private Double currentValue;
        
        /**
         * 阈值
         */
        private Double threshold;
    }
}
