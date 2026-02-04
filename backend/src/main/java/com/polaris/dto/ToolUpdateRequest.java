package com.polaris.dto;

import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * 工具更新请求 DTO
 */
@Data
public class ToolUpdateRequest {
    
    private Long categoryId;
    
    @Size(max = 100, message = "工具名称不能超过 100 个字符")
    private String name;
    
    @Size(max = 100, message = "中文名称不能超过 100 个字符")
    private String nameZh;
    
    @Size(max = 500, message = "描述不能超过 500 个字符")
    private String description;
    
    @Size(max = 500, message = "中文描述不能超过 500 个字符")
    private String descriptionZh;
    
    private String icon;
    
    private String url;
    
    private String colorClass;
    
    private String bgHoverClass;
    
    private Integer toolType;
    
    private Integer isFeatured;
    
    private Integer sortOrder;
    
    private Integer status;
}
