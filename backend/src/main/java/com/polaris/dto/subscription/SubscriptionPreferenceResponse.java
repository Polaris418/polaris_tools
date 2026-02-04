package com.polaris.dto.subscription;

import com.polaris.common.base.BaseResponse;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;

/**
 * 订阅偏好响应
 */
@Data
@EqualsAndHashCode(callSuper = true)
public class SubscriptionPreferenceResponse extends BaseResponse {
    
    /**
     * 偏好 ID
     */
    private Long id;
    
    /**
     * 用户 ID
     */
    private Long userId;
    
    /**
     * 邮件类型
     */
    private String emailType;
    
    /**
     * 邮件类型描述
     */
    private String emailTypeDescription;
    
    /**
     * 是否订阅
     */
    private Boolean subscribed;
    
    /**
     * 是否可以退订
     */
    private Boolean canUnsubscribe;
    
    /**
     * 退订时间
     */
    private LocalDateTime unsubscribedAt;
    
    /**
     * 退订原因
     */
    private String unsubscribeReason;
    
    /**
     * 创建时间
     */
    private LocalDateTime createdAt;
    
    /**
     * 更新时间
     */
    private LocalDateTime updatedAt;
}
