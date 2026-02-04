package com.polaris.common.base;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.Data;

/**
 * 通用请求基类
 * 包含分页参数
 */
@Data
public abstract class BaseRequest {
    
    /**
     * 页码（默认：1）
     */
    @Min(value = 1, message = "页码必须大于0")
    private Integer page = 1;
    
    /**
     * 每页数量（默认：20）
     */
    @Min(value = 1, message = "每页数量必须大于0")
    @Max(value = 100, message = "每页数量不能超过100")
    private Integer size = 20;
}
