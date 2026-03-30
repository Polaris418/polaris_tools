package com.polaris.dto.document;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * 文档创建请求 DTO
 */
@Data
public class DocumentCreateRequest {
    
    /**
     * 文档标题
     */
    @NotBlank(message = "文档标题不能为空")
    @Size(max = 200, message = "文档标题不能超过 200 个字符")
    private String title;
    
    /**
     * 文档内容（Markdown 格式）
     */
    private String content;
    
    /**
     * 文件夹 ID
     */
    private Long folderId;
    
    /**
     * 标签（逗号分隔）
     */
    @Size(max = 500, message = "标签不能超过 500 个字符")
    private String tags;
}
