package com.polaris.dto.admin;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * 管理员创建用户请求 DTO
 */
@Data
@Schema(description = "管理员创建用户请求")
public class AdminUserCreateRequest {
    
    @NotBlank(message = "用户名不能为空")
    @Size(min = 3, max = 50, message = "用户名长度必须在3-50之间")
    @Schema(description = "用户名", example = "newuser", required = true)
    private String username;
    
    @NotBlank(message = "邮箱不能为空")
    @Email(message = "邮箱格式不正确")
    @Schema(description = "邮箱", example = "newuser@example.com", required = true)
    private String email;
    
    @NotBlank(message = "密码不能为空")
    @Size(min = 6, max = 100, message = "密码长度必须在6-100之间")
    @Schema(description = "密码", example = "password123", required = true)
    private String password;
    
    @Schema(description = "昵称", example = "New User")
    private String nickname;
    
    @Schema(description = "套餐类型（0=免费版，1=专业版，2=企业版）", example = "0")
    private Integer planType = 0;
    
    @Schema(description = "状态（0=禁用，1=正常）", example = "1")
    private Integer status = 1;
}
