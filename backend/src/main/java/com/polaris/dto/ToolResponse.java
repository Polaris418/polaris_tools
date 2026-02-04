package com.polaris.dto;

import com.polaris.common.base.BaseResponse;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.math.BigDecimal;

/**
 * 工具响应 DTO
 */
@Data
@EqualsAndHashCode(callSuper = true)
public class ToolResponse extends BaseResponse {
    
    /**
     * 分类 ID
     */
    private Long categoryId;
    
    /**
     * 分类名称（英文）
     */
    private String categoryName;
    
    /**
     * 分类名称（中文）
     */
    private String categoryNameZh;
    
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
     * 评分
     */
    private BigDecimal ratingScore;
    
    /**
     * 评分数量
     */
    private Long ratingCount;
    
    /**
     * 评论数量
     */
    private Long reviewCount;
    
    /**
     * 当前用户是否已收藏
     */
    private Boolean isFavorited;
    
    /**
     * 排序顺序
     */
    private Integer sortOrder;
    
    /**
     * 状态：0-禁用，1-启用
     */
    private Integer status;
    
    /**
     * 是否已删除：0-正常，1-已删除
     */
    private Integer deleted;
    
    /**
     * 最后使用时间（用于最近使用列表）
     */
    private String lastUsedAt;
}
