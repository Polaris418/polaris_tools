package com.polaris.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

/**
 * 用户更新请求
 */
@Data
@Schema(description = "用户更新请求")
public class UserUpdateRequest {
    
    @Schema(description = "昵称")
    private String nickname;
    
    @Schema(description = "邮箱")
    private String email;
    
    @Schema(description = "个人简介")
    private String bio;
    
    @Schema(description = "头像风格")
    private String avatarStyle;
    
    @Schema(description = "头像自定义配置(JSON)")
    private String avatarConfig;
    
    @Schema(description = "语言偏好：zh-CN(简体中文), en-US(英语)")
    private String language;
}
