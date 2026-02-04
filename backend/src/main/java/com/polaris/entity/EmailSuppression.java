package com.polaris.entity;

import com.baomidou.mybatisplus.annotation.*;
import com.polaris.common.base.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 邮件抑制列表实体
 * 对应表：email_suppression
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("email_suppression")
public class EmailSuppression extends BaseEntity {
    
    /**
     * 邮箱地址
     */
    @TableField("email")
    private String email;
    
    /**
     * 抑制原因：HARD_BOUNCE（硬退信）、SOFT_BOUNCE（软退信）、COMPLAINT（投诉）
     */
    @TableField("reason")
    private String reason;
    
    /**
     * 来源：AWS_SES、MANUAL（手动添加）
     */
    @TableField("source")
    private String source;
    
    /**
     * 软退信计数
     */
    @TableField("soft_bounce_count")
    private Integer softBounceCount;
    
    /**
     * 备注
     */
    @TableField("notes")
    private String notes;
}
