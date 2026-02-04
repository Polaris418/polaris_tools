package com.polaris.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 邮件验证日志实体
 * 对应表：email_verification_log
 * 
 * 注意：此表为日志表，不继承 BaseEntity，因为：
 * 1. 日志表不需要 updated_at 字段（只写不改）
 * 2. 日志表不需要逻辑删除（永久保留）
 */
@Data
@TableName("email_verification_log")
public class EmailVerificationLog {
    
    /**
     * 主键 ID
     */
    @TableId(type = IdType.AUTO)
    private Long id;
    
    /**
     * 邮箱地址
     */
    private String email;
    
    /**
     * 用途
     */
    private String purpose;
    
    /**
     * 操作: send/verify/fail
     */
    private String action;
    
    /**
     * IP地址
     */
    private String ipAddress;
    
    /**
     * 用户代理
     */
    private String userAgent;
    
    /**
     * 是否成功: 0-失败, 1-成功
     */
    private Integer success;
    
    /**
     * 错误信息
     */
    private String errorMessage;
    
    /**
     * 创建时间
     */
    private LocalDateTime createdAt;
}
