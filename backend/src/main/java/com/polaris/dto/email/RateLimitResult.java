package com.polaris.dto.email;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 限流检查结果
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RateLimitResult {
    
    /**
     * 是否允许通过
     */
    private boolean allowed;
    
    /**
     * 限流类型（email/user/ip/global）
     */
    private String limitType;
    
    /**
     * 错误消息
     */
    private String message;
    
    /**
     * 剩余冷却时间（秒）
     */
    private Long remainingCooldownSeconds;
    
    /**
     * 创建允许通过的结果
     */
    public static RateLimitResult allowed() {
        return RateLimitResult.builder()
                .allowed(true)
                .build();
    }
    
    /**
     * 创建限流拒绝的结果
     */
    public static RateLimitResult denied(String limitType, String message, Long remainingCooldownSeconds) {
        return RateLimitResult.builder()
                .allowed(false)
                .limitType(limitType)
                .message(message)
                .remainingCooldownSeconds(remainingCooldownSeconds)
                .build();
    }
}
