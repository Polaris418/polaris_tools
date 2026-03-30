package com.polaris.email.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 限流统计信息响应
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RateLimitStatsResponse {
    
    /**
     * 邮箱地址（可选）
     */
    private String email;
    
    /**
     * 用户 ID（可选）
     */
    private Long userId;
    
    /**
     * IP 地址（可选）
     */
    private String ipAddress;
    
    /**
     * 限流类型（email/user/ip）
     */
    private String limitType;
    
    /**
     * 是否被限流
     */
    private boolean limited;
    
    /**
     * 已使用次数
     */
    private Integer usageCount;
    
    /**
     * 最大限制次数
     */
    private Integer maxLimit;
    
    /**
     * 剩余冷却时间（秒）
     */
    private Long remainingSeconds;
}
