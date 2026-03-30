package com.polaris.dto.document;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

/**
 * Markdown 直接导出请求
 */
@Data
@Schema(description = "Markdown 直接导出请求")
public class ExportMarkdownRequest {
    
    @NotBlank(message = "Markdown 内容不能为空")
    @Schema(description = "Markdown 内容", required = true)
    private String markdown;
    
    @NotBlank(message = "导出格式不能为空")
    @Pattern(regexp = "docx|pdf|html", message = "格式必须是 docx、pdf 或 html")
    @Schema(description = "导出格式 (docx, pdf, html)", required = true, example = "docx")
    private String format;
    
    @Schema(description = "模板名称", example = "corporate")
    private String template;
    
    @Schema(description = "文件名（不含扩展名）", example = "my-document")
    private String fileName;
}
