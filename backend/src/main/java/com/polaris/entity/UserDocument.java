package com.polaris.entity;

import com.baomidou.mybatisplus.annotation.*;
import com.polaris.common.base.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;
import java.time.LocalDateTime;

/**
 * 用户文档实体
 * 对应表：t_user_document
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("t_user_document")
public class UserDocument extends BaseEntity {
    
    /**
     * 用户 ID
     */
    private Long userId;
    
    /**
     * 文档标题
     */
    private String title;
    
    /**
     * 文档内容（Markdown 格式）
     */
    @TableField(typeHandler = org.apache.ibatis.type.ClobTypeHandler.class)
    private String content;
    
    /**
     * 文档格式（默认：markdown）
     */
    private String format;
    
    /**
     * 文件夹 ID
     */
    private Long folderId;
    
    /**
     * 标签（逗号分隔）
     */
    private String tags;
    
    /**
     * 是否为模板：0-否，1-是
     */
    private Integer isTemplate;
    
    /**
     * 浏览次数
     */
    private Long viewCount;
    
    /**
     * 导出次数
     */
    private Long exportCount;
    
    /**
     * 过期时间（会员：30天，免费：3天）
     */
    private LocalDateTime expireAt;
}
