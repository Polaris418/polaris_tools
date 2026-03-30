package com.polaris.service;

import com.polaris.email.entity.EmailMetrics;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 邮件监控服务接口
 * 负责统计邮件发送指标和计算各种率
 */
public interface MonitoringService {
    
    /**
     * 记录邮件发送成功
     * 
     * @param delayMs 发送延迟（毫秒）
     */
    void recordEmailSent(long delayMs);
    
    /**
     * 记录邮件发送失败
     */
    void recordEmailFailed();
    
    /**
     * 记录邮件退信
     */
    void recordEmailBounce();
    
    /**
     * 记录邮件投诉
     */
    void recordEmailComplaint();
    
    /**
     * 获取当前小时的指标
     * 
     * @return 当前小时的指标
     */
    EmailMetrics getCurrentHourMetrics();
    
    /**
     * 获取指定时间范围内的指标
     * 
     * @param startTime 开始时间
     * @param endTime 结束时间
     * @return 指标列表
     */
    List<EmailMetrics> getMetricsByTimeRange(LocalDateTime startTime, LocalDateTime endTime);
    
    /**
     * 获取最近N小时的指标
     * 
     * @param hours 小时数
     * @return 指标列表
     */
    List<EmailMetrics> getRecentMetrics(int hours);
    
    /**
     * 计算成功率
     * 
     * @param sentCount 成功数
     * @param failedCount 失败数
     * @return 成功率（百分比）
     */
    double calculateSuccessRate(int sentCount, int failedCount);
    
    /**
     * 计算失败率
     * 
     * @param sentCount 成功数
     * @param failedCount 失败数
     * @return 失败率（百分比）
     */
    double calculateFailureRate(int sentCount, int failedCount);
    
    /**
     * 计算退信率
     * 
     * @param bounceCount 退信数
     * @param totalCount 总数
     * @return 退信率（百分比）
     */
    double calculateBounceRate(int bounceCount, int totalCount);
    
    /**
     * 计算投诉率
     * 
     * @param complaintCount 投诉数
     * @param totalCount 总数
     * @return 投诉率（百分比）
     */
    double calculateComplaintRate(int complaintCount, int totalCount);
    
    /**
     * 计算平均发送延迟
     * 
     * @param totalDelayMs 总延迟（毫秒）
     * @param count 数量
     * @return 平均延迟（毫秒）
     */
    double calculateAvgDelay(long totalDelayMs, int count);
    
    /**
     * 刷新当前小时的指标到数据库
     */
    void flushCurrentMetrics();
}
