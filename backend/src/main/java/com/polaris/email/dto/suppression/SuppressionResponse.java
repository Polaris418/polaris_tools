package com.polaris.email.dto.suppression;

import com.polaris.common.base.BaseResponse;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;

/**
 * 抑制列表响应
 */
@Data
@EqualsAndHashCode(callSuper = true)
public class SuppressionResponse extends BaseResponse {
    
    /**
     * 邮箱地址
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
     * 软退信计数
     */
    private Integer softBounceCount;
    
    /**
     * 备注
     */
    private String notes;
    
    /**
     * 创建时间
     */
    private LocalDateTime createdAt;
    
    /**
     * 更新时间
     */
    private LocalDateTime updatedAt;
}
