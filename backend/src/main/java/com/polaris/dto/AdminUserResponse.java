package com.polaris.dto;

import com.polaris.common.base.BaseResponse;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;

/**
 * 管理员用户响应 DTO
 * 包含更多管理员可见的用户信息
 */
@Data
@EqualsAndHashCode(callSuper = true)
@Schema(description = "管理员用户详情")
public class AdminUserResponse extends BaseResponse {
    
    @Schema(description = "用户名", example = "john_doe")
    private String username;
    
    @Schema(description = "邮箱", example = "john@example.com")
    private String email;
    
    @Schema(description = "昵称", example = "John Doe")
    private String nickname;
    
    @Schema(description = "头像URL", example = "https://example.com/avatar.jpg")
    private String avatar;
    
    @Schema(description = "套餐类型：0-免费用户，1-会员用户，2-管理员", example = "1")
    private Integer planType;
    
    @Schema(description = "套餐过期时间", example = "2024-12-31T23:59:59")
    private LocalDateTime planExpiredAt;
    
    @Schema(description = "状态：0-禁用，1-启用", example = "1")
    private Integer status;
    
    @Schema(description = "最后登录时间", example = "2024-01-20T10:30:00")
    private LocalDateTime lastLoginAt;
    
    @Schema(description = "最后登录IP", example = "192.168.1.1")
    private String lastLoginIp;
    
    @Schema(description = "是否已删除：0-正常，1-已删除", example = "0")
    private Integer deleted;
}
