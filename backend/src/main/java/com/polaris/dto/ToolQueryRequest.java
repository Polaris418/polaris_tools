package com.polaris.dto;

import com.polaris.common.base.BaseRequest;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 工具查询请求 DTO
 */
@Data
@EqualsAndHashCode(callSuper = true)
public class ToolQueryRequest extends BaseRequest {
    
    /**
     * 关键词（搜索工具名称和描述）
     */
    private String keyword;
    
    /**
     * 分类 ID
     */
    private Long categoryId;
    
    /**
     * 工具类型
     */
    private Integer toolType;
    
    /**
     * 是否为特色工具
     */
    private Integer isFeatured;
    
    /**
     * 状态过滤（0=禁用，1=正常）
     */
    private Integer status;
    
    /**
     * 排序字段：sortOrder, viewCount, useCount, createdAt, rating
     */
    private String sortBy = "sortOrder";
    
    /**
     * 排序方向：asc, desc
     */
    private String sortOrder = "asc";
    
    /**
     * 是否包含已删除数据
     */
    private Boolean includeDeleted;
}
