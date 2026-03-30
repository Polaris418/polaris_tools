package com.polaris.email.entity;

import com.baomidou.mybatisplus.annotation.*;
import com.polaris.common.base.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 邮件模板实体
 * 对应表：email_template
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("email_template")
public class EmailTemplate extends BaseEntity {
    
    /**
     * 模板代码（唯一标识）
     * 例如：WELCOME, PASSWORD_RESET, EMAIL_VERIFICATION
     */
    @TableField("code")
    private String code;
    
    /**
     * 模板名称
     */
    @TableField("name")
    private String name;
    
    /**
     * 语言代码
     * 例如：zh-CN, en-US
     */
    @TableField("language")
    private String language;
    
    /**
     * 邮件主题
     */
    @TableField("subject")
    private String subject;
    
    /**
     * HTML 内容
     */
    @TableField("html_content")
    private String htmlContent;
    
    /**
     * 纯文本内容
     */
    @TableField("text_content")
    private String textContent;
    
    /**
     * 模板变量（JSON 格式）
     * 例如：["username", "verificationLink", "expiryTime"]
     */
    @TableField("variables")
    private String variables;
    
    /**
     * 模板版本号
     */
    @TableField("version")
    private Integer version;
    
    /**
     * 是否启用
     */
    @TableField("enabled")
    private Boolean enabled;
}
