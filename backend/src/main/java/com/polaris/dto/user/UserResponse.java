package com.polaris.dto.user;

import com.polaris.common.base.BaseResponse;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;

/**
 * 用户响应 DTO
 */
@Data
@EqualsAndHashCode(callSuper = true)
public class UserResponse extends BaseResponse {
    
    /**
     * 用户名
     */
    private String username;
    
    /**
     * 邮箱
     */
    private String email;
    
    /**
     * 昵称
     */
    private String nickname;
    
    /**
     * 头像 URL
     */
    private String avatar;
    
    /**
     * 头像自定义配置(JSON)
     */
    private String avatarConfig;
    
    /**
     * 个人简介
     */
    private String bio;
    
    /**
     * 会员类型：0-免费用户，1-会员用户，2-企业用户，999-管理员
     */
    private Integer planType;
    
    /**
     * 会员过期时间
     */
    private LocalDateTime planExpiredAt;
    
    /**
     * 状态：0-禁用，1-启用
     */
    private Integer status;
    
    /**
     * 最后登录时间
     */
    private LocalDateTime lastLoginAt;
    
    /**
     * 密码最后修改时间
     */
    private LocalDateTime passwordUpdatedAt;
    
    /**
     * 邮箱是否已验证
     */
    private Boolean emailVerified;
    
    /**
     * 邮箱验证时间
     */
    private LocalDateTime emailVerifiedAt;
}
