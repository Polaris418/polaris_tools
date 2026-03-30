package com.polaris.dto.category;

import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CategoryUpdateRequest {
    @Size(max = 50, message = "分类名称不能超过 50 个字符")
    private String name;
    
    @Size(max = 50, message = "中文名称不能超过 50 个字符")
    private String nameZh;
    
    private String icon;
    private String accentColor;
    private String description;
    private Integer sortOrder;
    private Integer status;
}
