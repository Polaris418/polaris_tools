package com.polaris.dto.tool;

import com.polaris.common.base.BaseResponse;
import lombok.Data;
import lombok.EqualsAndHashCode;
import java.time.LocalDateTime;

/**
 * 工具使用记录响应 DTO
 */
@Data
@EqualsAndHashCode(callSuper = true)
public class ToolUsageResponse extends BaseResponse {
    
    /**
     * 工具 ID
     */
    private Long toolId;
    
    /**
     * 工具名称（英文）
     */
    private String toolName;
    
    /**
     * 工具名称（中文）
     */
    private String toolNameZh;
    
    /**
     * 工具图标
     */
    private String toolIcon;
    
    /**
     * 使用时间
     */
    private LocalDateTime usedAt;
    
    /**
     * 使用时长（秒）
     */
    private Integer duration;
}
