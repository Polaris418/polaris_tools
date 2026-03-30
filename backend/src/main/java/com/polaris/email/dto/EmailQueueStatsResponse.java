package com.polaris.email.dto;

import com.polaris.common.base.BaseResponse;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 邮件队列统计响应
 */
@Data
@EqualsAndHashCode(callSuper = true)
public class EmailQueueStatsResponse extends BaseResponse {
    
    /**
     * 队列长度（待发送邮件数）
     */
    private Long queueLength;
    
    /**
     * 处理速度（邮件数/小时）
     */
    private Double processingSpeed;
    
    /**
     * 失败率（最近24小时）
     */
    private Double failureRate;
    
    /**
     * Worker 线程数
     */
    private Integer workerThreads;
    
    /**
     * 批次大小
     */
    private Integer batchSize;
    
    /**
     * 队列是否启用
     */
    private Boolean enabled;
}
