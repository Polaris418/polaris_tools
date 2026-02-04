package com.polaris.entity;

import com.baomidou.mybatisplus.annotation.*;
import com.polaris.common.base.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 工具实体
 * 对应表：t_tool
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("t_tool")
public class Tool extends BaseEntity {
    
    /**
     * 分类 ID
     */
    private Long categoryId;
    
    /**
     * 工具名称（英文）
     */
    private String name;
    
    /**
     * 工具名称（中文）
     */
    private String nameZh;
    
    /**
     * 工具描述（英文）
     */
    private String description;
    
    /**
     * 工具描述（中文）
     */
    private String descriptionZh;
    
    /**
     * 图标
     */
    private String icon;
    
    /**
     * URL
     */
    private String url;
    
    /**
     * 颜色类名
     */
    private String colorClass;
    
    /**
     * 背景悬停类名
     */
    private String bgHoverClass;
    
    /**
     * 工具类型
     */
    private Integer toolType;
    
    /**
     * 是否为特色工具：0-否，1-是
     */
    private Integer isFeatured;
    
    /**
     * 浏览次数
     */
    private Long viewCount;
    
    /**
     * 使用次数
     */
    private Long useCount;
    
    /**
     * 排序顺序
     */
    private Integer sortOrder;
    
    /**
     * 状态：0-禁用，1-启用
     */
    private Integer status;
    
    /**
     * 分类名称（英文）- 临时字段，用于关联查询
     */
    @TableField(exist = false)
    private String categoryName;
    
    /**
     * 分类名称（中文）- 临时字段，用于关联查询
     */
    @TableField(exist = false)
    private String categoryNameZh;
    
    /**
     * 最后使用时间 - 临时字段，用于最近使用列表
     */
    @TableField(exist = false)
    private java.time.LocalDateTime lastUsedAt;
}
