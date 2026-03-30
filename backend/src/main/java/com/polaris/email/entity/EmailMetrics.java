package com.polaris.email.entity;

import com.baomidou.mybatisplus.annotation.*;
import com.polaris.common.base.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;
import java.time.LocalDateTime;

/**
 * 邮件指标实体
 * 记录每小时的邮件发送统计数据
 * 对应表：email_metrics
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("email_metrics")
public class EmailMetrics extends BaseEntity {
    
    /**
     * 统计时间（小时级别）
     */
    @TableField("metric_hour")
    private LocalDateTime metricHour;
    
    /**
     * 发送成功数
     */
    @TableField("sent_count")
    private Integer sentCount;
    
    /**
     * 发送失败数
     */
    @TableField("failed_count")
    private Integer failedCount;
    
    /**
     * 退信数（Bounce）
     */
    @TableField("bounce_count")
    private Integer bounceCount;
    
    /**
     * 投诉数（Complaint）
     */
    @TableField("complaint_count")
    private Integer complaintCount;
    
    /**
     * 总发送延迟（毫秒）
     */
    @TableField("total_delay_ms")
    private Long totalDelayMs;
    
    /**
     * 成功率（百分比，0-100）
     */
    @TableField("success_rate")
    private Double successRate;
    
    /**
     * 失败率（百分比，0-100）
     */
    @TableField("failure_rate")
    private Double failureRate;
    
    /**
     * 退信率（百分比，0-100）
     */
    @TableField("bounce_rate")
    private Double bounceRate;
    
    /**
     * 投诉率（百分比，0-100）
     */
    @TableField("complaint_rate")
    private Double complaintRate;
    
    /**
     * 平均发送延迟（毫秒）
     */
    @TableField("avg_delay_ms")
    private Double avgDelayMs;
}
