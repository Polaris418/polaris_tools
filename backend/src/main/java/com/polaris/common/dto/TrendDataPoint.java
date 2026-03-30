package com.polaris.common.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

/**
 * 趋势数据点 DTO
 * 用于表示时间序列数据
 */
@Data
@Schema(description = "趋势数据点")
public class TrendDataPoint {
    
    @Schema(description = "日期（格式：yyyy-MM-dd）", example = "2024-01-20")
    private String date;
    
    @Schema(description = "数量", example = "100")
    private Integer count;
}
