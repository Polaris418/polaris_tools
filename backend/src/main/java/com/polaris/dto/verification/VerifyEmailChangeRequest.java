package com.polaris.dto.verification;

import com.polaris.common.base.BaseRequest;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 验证邮箱修改请求 DTO
 * 用于验证验证码并完成邮箱修改
 */
@Data
@EqualsAndHashCode(callSuper = true)
public class VerifyEmailChangeRequest extends BaseRequest {
    
    /**
     * 新邮箱地址
     */
    @NotBlank(message = "新邮箱不能为空")
    @Email(message = "新邮箱格式不正确")
    private String newEmail;
    
    /**
     * 验证码（6位数字）
     */
    @NotBlank(message = "验证码不能为空")
    @Pattern(regexp = "^\\d{6}$", message = "验证码必须是6位数字")
    private String code;
}
