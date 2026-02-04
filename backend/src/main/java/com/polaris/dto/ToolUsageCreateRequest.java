package com.polaris.dto;

import lombok.Data;
import java.time.LocalDateTime;

/**
 * 工具使用记录创建请求
 * 注意：此 DTO 主要用于满足 BaseService 的类型参数要求
 * 实际使用记录通常由系统自动创建，而不是通过 API 创建
 */
@Data
public class ToolUsageCreateRequest {
    
    /**
     * 工具 ID
     */
    private Long toolId;
    
    /**
     * 使用时间
     */
    private LocalDateTime usedAt;
    
    /**
     * 使用时长（秒）
     */
    private Integer duration;
}
