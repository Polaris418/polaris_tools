package com.polaris.dto.verification;

import com.polaris.common.base.BaseResponse;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

/**
 * 发送验证码响应 DTO
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
public class SendVerificationCodeResponse extends BaseResponse {
    
    /**
     * 是否成功
     */
    private Boolean success;
    
    /**
     * 冷却时间（秒）
     * 用户需要等待这么多秒才能再次发送验证码
     */
    private Integer cooldownSeconds;
    
    /**
     * 验证码有效期（秒）
     * 验证码在这么多秒后过期
     */
    private Integer expiresIn;
    
    /**
     * 提示信息
     */
    private String message;
}
