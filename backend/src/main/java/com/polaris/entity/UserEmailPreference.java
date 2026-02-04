package com.polaris.entity;

import com.baomidou.mybatisplus.annotation.*;
import com.polaris.common.base.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;
import java.time.LocalDateTime;

/**
 * 用户邮件订阅偏好实体
 * 对应表：t_user_email_preference
 * 
 * 用于管理用户的邮件订阅偏好，支持按邮件类型设置订阅状态
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("t_user_email_preference")
public class UserEmailPreference extends BaseEntity {
    
    /**
     * 用户 ID
     */
    @TableField("user_id")
    private Long userId;
    
    /**
     * 邮件类型
     * SYSTEM_NOTIFICATION - 系统通知
     * MARKETING - 营销邮件
     * PRODUCT_UPDATE - 产品更新
     */
    @TableField("email_type")
    private String emailType;
    
    /**
     * 是否订阅：true-订阅，false-退订
     */
    @TableField("subscribed")
    private Boolean subscribed;
    
    /**
     * 退订时间
     */
    @TableField("unsubscribed_at")
    private LocalDateTime unsubscribedAt;
    
    /**
     * 退订原因
     */
    @TableField("unsubscribe_reason")
    private String unsubscribeReason;
    
    /**
     * 退订令牌（用于一键退订链接）
     */
    @TableField("unsubscribe_token")
    private String unsubscribeToken;
}
