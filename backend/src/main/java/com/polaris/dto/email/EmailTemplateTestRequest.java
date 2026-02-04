package com.polaris.dto.email;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.Map;

/**
 * 邮件模板测试请求
 */
@Data
public class EmailTemplateTestRequest {
    
    /**
     * 模板 ID
     */
    @NotNull(message = "模板 ID 不能为空")
    private Long templateId;
    
    /**
     * 收件人邮箱
     */
    @NotBlank(message = "收件人邮箱不能为空")
    @Email(message = "邮箱格式不正确")
    private String email;
    
    /**
     * 模板变量
     */
    private Map<String, String> variables;
}
