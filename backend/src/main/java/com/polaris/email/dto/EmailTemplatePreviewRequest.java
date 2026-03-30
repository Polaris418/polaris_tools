package com.polaris.email.dto;

import lombok.Data;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.Map;

/**
 * 邮件模板预览请求 DTO
 */
@Data
public class EmailTemplatePreviewRequest {
    
    /**
     * 模板代码
     */
    @NotBlank(message = "模板代码不能为空")
    private String code;
    
    /**
     * 语言代码
     */
    @NotBlank(message = "语言代码不能为空")
    private String language;
    
    /**
     * 示例变量数据
     */
    @NotNull(message = "示例变量数据不能为空")
    private Map<String, Object> variables;
}
