package com.polaris.dto.suppression;

import com.polaris.common.base.BaseRequest;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 抑制列表查询请求
 */
@Data
@EqualsAndHashCode(callSuper = true)
public class SuppressionQueryRequest extends BaseRequest {
    
    /**
     * 邮箱地址（模糊查询）
     */
    private String email;
    
    /**
     * 抑制原因
     */
    private String reason;
    
    /**
     * 来源
     */
    private String source;
    
    /**
     * 获取页码（兼容方法）
     */
    public Integer getPage() {
        return super.getPage();
    }
    
    /**
     * 获取每页数量（兼容方法）
     */
    public Integer getPageSize() {
        return super.getSize();
    }
}
