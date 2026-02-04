package com.polaris.dto.email;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import jakarta.validation.constraints.NotBlank;

/**
 * 重置限流请求
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ResetRateLimitRequest {
    
    /**
     * 限流类型（email/user/ip）
     */
    @NotBlank(message = "限流类型不能为空")
    private String limitType;
    
    /**
     * 邮箱地址（当 limitType=email 时必填）
     */
    private String email;
    
    /**
     * 用户 ID（当 limitType=user 时必填）
     */
    private Long userId;
    
    /**
     * IP 地址（当 limitType=ip 时必填）
     */
    private String ipAddress;
}
