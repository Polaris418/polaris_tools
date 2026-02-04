package com.polaris.dto.verification;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

/**
 * 使用验证码登录请求 DTO
 */
@Data
public class LoginWithCodeRequest {
    
    /**
     * 邮箱地址
     */
    @NotBlank(message = "邮箱不能为空")
    @Email(message = "邮箱格式不正确")
    private String email;
    
    /**
     * 验证码（6位数字）
     */
    @NotBlank(message = "验证码不能为空")
    @Pattern(regexp = "^\\d{6}$", message = "验证码必须是6位数字")
    private String code;
    
    /**
     * 记住我选项
     * true: Token 有效期 30 天
     * false: Token 有效期 1 天（默认）
     */
    private boolean rememberMe = false;
}
