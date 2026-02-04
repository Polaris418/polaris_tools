package com.polaris.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * 文件夹创建请求 DTO
 */
@Data
public class FolderCreateRequest {
    
    /**
     * 文件夹名称
     */
    @NotBlank(message = "文件夹名称不能为空")
    @Size(max = 100, message = "文件夹名称不能超过 100 个字符")
    private String name;
    
    /**
     * 父文件夹 ID
     */
    private Long parentId;
}
