package com.polaris.email.dto;

import com.polaris.common.base.BaseResponse;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 邮件模板响应 DTO
 */
@Data
@EqualsAndHashCode(callSuper = true)
public class EmailTemplateResponse extends BaseResponse {
    
    /**
     * 模板 ID
     */
    private Long id;
    
    /**
     * 模板代码
     */
    private String code;
    
    /**
     * 模板名称
     */
    private String name;
    
    /**
     * 语言代码
     */
    private String language;
    
    /**
     * 邮件主题
     */
    private String subject;
    
    /**
     * HTML 内容
     */
    private String htmlContent;
    
    /**
     * 纯文本内容
     */
    private String textContent;
    
    /**
     * 模板变量列表
     */
    private List<String> variables;
    
    /**
     * 模板版本号
     */
    private Integer version;
    
    /**
     * 是否启用
     */
    private Boolean enabled;
    
    /**
     * 创建时间
     */
    private LocalDateTime createdAt;
    
    /**
     * 更新时间
     */
    private LocalDateTime updatedAt;
}
