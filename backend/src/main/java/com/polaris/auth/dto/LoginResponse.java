package com.polaris.auth.dto;

import com.polaris.dto.user.UserResponse;
import lombok.Data;

/**
 * 登录响应 DTO
 */
@Data
public class LoginResponse {
    
    private String token;
    private String refreshToken;
    private UserResponse user;
    
    /**
     * Token 过期时间（秒）
     */
    private Long expiresIn;
}
