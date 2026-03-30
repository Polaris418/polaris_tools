package com.polaris.email.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.polaris.common.base.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;
import java.time.LocalDateTime;

/**
 * 邮件验证码实体
 * 对应表：email_verification_code
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("email_verification_code")
public class EmailVerificationCode extends BaseEntity {
    
    /**
     * 验证码哈希值(SHA-256)
     */
    private String codeHash;
    
    /**
     * 邮箱地址
     */
    private String email;
    
    /**
     * 用途: register/login/reset/verify/change
     */
    private String purpose;
    
    /**
     * 过期时间
     */
    private LocalDateTime expiresAt;
    
    /**
     * 是否已使用: 0-未使用, 1-已使用
     */
    private Integer used;
    
    /**
     * 使用时间
     */
    private LocalDateTime usedAt;
    
    /**
     * 验证失败次数
     */
    private Integer failCount;
}
