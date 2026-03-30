package com.polaris.dto.document;

import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * 文件夹更新请求 DTO
 */
@Data
public class FolderUpdateRequest {
    
    /**
     * 文件夹名称
     */
    @Size(max = 100, message = "文件夹名称不能超过 100 个字符")
    private String name;
    
    /**
     * 排序顺序
     */
    private Integer sortOrder;
}
