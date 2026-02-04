package com.polaris.dto;

import com.polaris.common.base.BaseRequest;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 工具使用记录查询请求
 */
@Data
@EqualsAndHashCode(callSuper = true)
public class ToolUsageQueryRequest extends BaseRequest {
    
    /**
     * 用户 ID（可选，用于管理员查询）
     */
    private Long userId;
    
    /**
     * 工具 ID（可选）
     */
    private Long toolId;
}
