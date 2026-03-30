package com.polaris.common.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

/**
 * 热门工具数据 DTO
 */
@Data
@Schema(description = "热门工具数据")
public class PopularToolData {
    
    @Schema(description = "工具ID", example = "1")
    private Long toolId;
    
    @Schema(description = "工具名称", example = "Color Converter")
    private String toolName;
    
    @Schema(description = "使用次数", example = "500")
    private Integer count;
}
