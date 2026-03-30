package com.polaris.dto.admin;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 管理员用户更新请求 DTO
 */
@Data
@Schema(description = "用户更新请求")
public class AdminUserUpdateRequest {
    
    @Schema(description = "昵称", example = "John Doe")
    @Size(max = 50, message = "昵称不能超过50个字符")
    private String nickname;
    
    @Schema(description = "邮箱", example = "john@example.com")
    @Email(message = "邮箱格式不正确")
    @Size(max = 100, message = "邮箱不能超过100个字符")
    private String email;
    
    @Schema(description = "套餐类型：0-免费用户，1-会员用户，2-管理员", example = "1")
    @Min(value = 0, message = "套餐类型必须在0-2之间")
    @Max(value = 2, message = "套餐类型必须在0-2之间")
    private Integer planType;
    
    @Schema(description = "套餐过期时间", example = "2024-12-31T23:59:59")
    private LocalDateTime planExpiredAt;
    
    @Schema(description = "状态：0-禁用，1-启用", example = "1")
    @Min(value = 0, message = "状态必须为0或1")
    @Max(value = 1, message = "状态必须为0或1")
    private Integer status;
}
