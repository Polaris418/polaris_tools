package com.polaris.entity;

import com.baomidou.mybatisplus.annotation.*;
import com.polaris.common.base.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;
import java.time.LocalDateTime;

/**
 * 邮件验证 Token 实体
 * 对应表：email_token
 * 用于邮箱验证和密码重置功能
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("email_token")
public class EmailToken extends BaseEntity {
    
    /**
     * Token 哈希值（SHA-256）
     * 存储哈希值而非明文，提高安全性
     */
    @TableField("token_hash")
    private String tokenHash;
    
    /**
     * 用户 ID
     */
    @TableField("user_id")
    private Long userId;
    
    /**
     * Token 用途：verify-邮箱验证，reset-密码重置
     */
    @TableField("purpose")
    private String purpose;
    
    /**
     * 过期时间
     */
    @TableField("expires_at")
    private LocalDateTime expiresAt;
    
    /**
     * 是否已使用：0-未使用，1-已使用
     */
    @TableField("used")
    private Integer used;
    
    /**
     * 使用时间
     */
    @TableField("used_at")
    private LocalDateTime usedAt;
}
