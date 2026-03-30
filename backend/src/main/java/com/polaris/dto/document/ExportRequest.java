package com.polaris.dto.document;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import lombok.Data;
import java.util.List;

/**
 * 导出请求 DTO
 */
@Data
public class ExportRequest {
    
    /**
     * 文档 ID 数组（用于批量导出）
     */
    @NotEmpty(message = "文档 ID 列表不能为空")
    private List<Long> documentIds;
    
    /**
     * 导出格式（docx、pdf、html、markdown、latex）
     */
    @NotBlank(message = "导出格式不能为空")
    private String format;
    
    /**
     * 图片质量（0-100，仅用于 DOCX 和 PDF）
     */
    @Min(value = 0, message = "图片质量不能小于 0")
    @Max(value = 100, message = "图片质量不能大于 100")
    private Integer imageQuality = 80;
    
    /**
     * 镜像边距（仅用于 DOCX）
     */
    private Boolean mirrorMargins = false;
}
