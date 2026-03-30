package com.polaris.email.dto;

import com.polaris.common.base.BaseResponse;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;

/**
 * 邮件指标响应 DTO
 */
@Data
@EqualsAndHashCode(callSuper = true)
public class EmailMetricsResponse extends BaseResponse {
    
    /**
     * 统计时间（小时级别）
     */
    private LocalDateTime metricHour;
    
    /**
     * 发送成功数
     */
    private Integer sentCount;
    
    /**
     * 发送失败数
     */
    private Integer failedCount;
    
    /**
     * 退信数
     */
    private Integer bounceCount;
    
    /**
     * 投诉数
     */
    private Integer complaintCount;
    
    /**
     * 成功率（百分比）
     */
    private Double successRate;
    
    /**
     * 失败率（百分比）
     */
    private Double failureRate;
    
    /**
     * 退信率（百分比）
     */
    private Double bounceRate;
    
    /**
     * 投诉率（百分比）
     */
    private Double complaintRate;
    
    /**
     * 平均发送延迟（毫秒）
     */
    private Double avgDelayMs;
}
