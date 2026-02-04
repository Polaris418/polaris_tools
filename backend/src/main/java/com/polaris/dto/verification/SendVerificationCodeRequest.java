package com.polaris.dto.verification;

import com.polaris.common.base.BaseRequest;
import com.polaris.entity.VerificationPurpose;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 发送验证码请求 DTO
 */
@Data
@EqualsAndHashCode(callSuper = true)
public class SendVerificationCodeRequest extends BaseRequest {
    
    /**
     * 邮箱地址
     */
    @NotBlank(message = "邮箱不能为空")
    @Email(message = "邮箱格式不正确")
    private String email;
    
    /**
     * 验证码用途
     */
    @NotNull(message = "验证码用途不能为空")
    private VerificationPurpose purpose;
}
