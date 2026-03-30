package com.polaris.dto.category;

import com.polaris.common.base.BaseRequest;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 分类查询请求 DTO
 */
@Data
@EqualsAndHashCode(callSuper = true)
public class CategoryQueryRequest extends BaseRequest {
    
    /**
     * 关键词（搜索分类名称）
     */
    @Size(max = 100, message = "搜索关键词不能超过100个字符")
    private String keyword;
    
    /**
     * 状态：0-禁用，1-启用
     */
    @Min(value = 0, message = "状态必须为0或1")
    @Max(value = 1, message = "状态必须为0或1")
    private Integer status;
    
    /**
     * 是否包含已删除数据
     */
    private Boolean includeDeleted;
}
