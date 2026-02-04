package com.polaris.common.base;

import lombok.Data;
import java.time.LocalDateTime;

/**
 * 通用响应基类
 * 包含公共字段
 */
@Data
public abstract class BaseResponse {
    
    /**
     * 主键 ID
     */
    private Long id;
    
    /**
     * 创建时间
     */
    private LocalDateTime createdAt;
    
    /**
     * 更新时间
     */
    private LocalDateTime updatedAt;
}
