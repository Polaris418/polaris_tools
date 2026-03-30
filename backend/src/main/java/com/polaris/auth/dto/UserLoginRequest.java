package com.polaris.auth.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * 用户登录请求 DTO
 */
@Data
public class UserLoginRequest {
    
    @NotBlank(message = "用户名或邮箱不能为空")
    private String username;  // 可以是用户名或邮箱
    
    @NotBlank(message = "密码不能为空")
    private String password;
    
    /**
     * 记住我选项
     * true: Token 有效期 30 天
     * false: Token 有效期 1 天（默认）
     */
    private boolean rememberMe = false;
}
