package com.polaris.dto;

import lombok.Data;

/**
 * 工具使用记录更新请求
 * 注意：此 DTO 主要用于满足 BaseService 的类型参数要求
 * 实际使用记录通常不支持更新操作
 */
@Data
public class ToolUsageUpdateRequest {
    
    /**
     * 使用时长（秒）
     */
    private Integer duration;
}
