package com.polaris.dto.subscription;

import com.polaris.common.base.BaseRequest;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.util.Map;

/**
 * 订阅偏好更新请求
 */
@Data
@EqualsAndHashCode(callSuper = true)
public class SubscriptionPreferenceRequest extends BaseRequest {
    
    /**
     * 订阅偏好映射
     * key: 邮件类型（SYSTEM_NOTIFICATION, MARKETING, PRODUCT_UPDATE）
     * value: 是否订阅
     */
    private Map<String, Boolean> preferences;
}
