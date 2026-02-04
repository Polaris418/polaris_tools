package com.polaris.dto;

import com.polaris.common.base.BaseResponse;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 分类响应 DTO
 */
@Data
@EqualsAndHashCode(callSuper = true)
public class CategoryResponse extends BaseResponse {
    
    /**
     * 分类名称（英文）
     */
    private String name;
    
    /**
     * 分类名称（中文）
     */
    private String nameZh;
    
    /**
     * 图标
     */
    private String icon;
    
    /**
     * 强调色
     */
    private String accentColor;
    
    /**
     * 描述
     */
    private String description;
    
    /**
     * 排序顺序
     */
    private Integer sortOrder;
    
    /**
     * 状态：0-禁用，1-启用
     */
    private Integer status;
    
    /**
     * 工具数量
     */
    private Integer toolCount;
    
    /**
     * 是否已删除：0-正常，1-已删除
     */
    private Integer deleted;
}
