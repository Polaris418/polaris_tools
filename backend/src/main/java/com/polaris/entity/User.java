package com.polaris.entity;

import com.baomidou.mybatisplus.annotation.*;
import com.polaris.common.base.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;
import java.time.LocalDateTime;

/**
 * 用户实体
 * 对应表：t_user
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("t_user")
public class User extends BaseEntity {
    
    /**
     * 用户名
     */
    private String username;
    
    /**
     * 密码（加密后）
     */
    private String password;
    
    /**
     * 密码最后修改时间
     */
    private LocalDateTime passwordUpdatedAt;
    
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
     * 用户语言偏好：zh-CN(简体中文), en-US(英语)
     */
    private String language;
    
    /**
     * 会员类型：0-免费用户，1-会员用户
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
     * 最后登录 IP
     */
    private String lastLoginIp;
    
    /**
     * 邮箱是否已验证
     */
    private Boolean emailVerified;
    
    /**
     * 邮箱验证时间
     */
    private LocalDateTime emailVerifiedAt;
}
