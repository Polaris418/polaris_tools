package com.polaris.dto.email;

import com.polaris.common.base.BaseRequest;
import lombok.Data;
import lombok.EqualsAndHashCode;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/**
 * 邮件模板请求 DTO
 */
@Data
@EqualsAndHashCode(callSuper = true)
public class EmailTemplateRequest extends BaseRequest {
    
    /**
     * 模板 ID（更新时需要）
     */
    private Long id;
    
    /**
     * 模板代码
     */
    @NotBlank(message = "模板代码不能为空")
    private String code;
    
    /**
     * 模板名称
     */
    @NotBlank(message = "模板名称不能为空")
    private String name;
    
    /**
     * 语言代码
     */
    @NotBlank(message = "语言代码不能为空")
    private String language;
    
    /**
     * 邮件主题
     */
    @NotBlank(message = "邮件主题不能为空")
    private String subject;
    
    /**
     * HTML 内容
     */
    @NotBlank(message = "HTML 内容不能为空")
    private String htmlContent;
    
    /**
     * 纯文本内容
     */
    private String textContent;
    
    /**
     * 模板变量（JSON 格式）
     */
    private String variables;
    
    /**
     * 模板版本号
     */
    @NotNull(message = "模板版本号不能为空")
    private Integer version;
    
    /**
     * 是否启用
     */
    @NotNull(message = "启用状态不能为空")
    private Boolean enabled;
}
