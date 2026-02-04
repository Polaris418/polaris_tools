package com.polaris.dto.subscription;

import com.polaris.common.base.BaseRequest;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 退订请求
 */
@Data
@EqualsAndHashCode(callSuper = true)
public class UnsubscribeRequest extends BaseRequest {
    
    /**
     * 退订令牌
     */
    private String token;
    
    /**
     * 退订原因（可选）
     */
    private String reason;
}
