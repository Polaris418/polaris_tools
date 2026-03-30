package com.polaris.ai.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * AI 格式作用域 DTO
 */
@Data
public class FormattingScopeDto {

    @NotBlank(message = "scopeType 不能为空")
    private String scopeType;

    private String blockId;
    private String blockType;
    private Integer lineStart;
    private Integer lineEnd;
    private Integer start;
    private Integer end;
}
