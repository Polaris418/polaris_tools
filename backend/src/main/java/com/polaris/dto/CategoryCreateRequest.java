package com.polaris.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CategoryCreateRequest {
    @NotBlank(message = "分类名称不能为空")
    @Size(max = 50, message = "分类名称不能超过 50 个字符")
    private String name;
    
    @Size(max = 50, message = "中文名称不能超过 50 个字符")
    private String nameZh;
    
    @NotBlank(message = "图标不能为空")
    private String icon;
    
    @NotBlank(message = "强调色不能为空")
    private String accentColor;
    
    private String description;
    private Integer sortOrder;
}
