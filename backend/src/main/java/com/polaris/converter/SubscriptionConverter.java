package com.polaris.converter;

import com.polaris.common.base.BaseConverter;
import com.polaris.dto.subscription.SubscriptionPreferenceRequest;
import com.polaris.dto.subscription.SubscriptionPreferenceResponse;
import com.polaris.entity.EmailType;
import com.polaris.entity.UserEmailPreference;
import org.springframework.stereotype.Component;

/**
 * 订阅偏好转换器
 */
@Component
public class SubscriptionConverter implements BaseConverter<UserEmailPreference, SubscriptionPreferenceResponse, SubscriptionPreferenceRequest, SubscriptionPreferenceRequest> {
    
    @Override
    public SubscriptionPreferenceResponse toResponse(UserEmailPreference entity) {
        if (entity == null) {
            return null;
        }
        
        SubscriptionPreferenceResponse response = new SubscriptionPreferenceResponse();
        response.setId(entity.getId());
        response.setUserId(entity.getUserId());
        response.setEmailType(entity.getEmailType());
        
        // 获取邮件类型描述
        EmailType emailType = EmailType.fromCode(entity.getEmailType());
        response.setEmailTypeDescription(emailType.getDescription());
        response.setCanUnsubscribe(emailType.isCanUnsubscribe());
        
        response.setSubscribed(entity.getSubscribed());
        response.setUnsubscribedAt(entity.getUnsubscribedAt());
        response.setUnsubscribeReason(entity.getUnsubscribeReason());
        response.setCreatedAt(entity.getCreatedAt());
        response.setUpdatedAt(entity.getUpdatedAt());
        
        return response;
    }
    
    @Override
    public UserEmailPreference toEntity(SubscriptionPreferenceRequest request) {
        // 不需要实现
        throw new UnsupportedOperationException("不支持从请求转换为实体");
    }
    
    @Override
    public void updateEntity(UserEmailPreference entity, SubscriptionPreferenceRequest request) {
        // 不需要实现
        throw new UnsupportedOperationException("不支持更新实体");
    }
}
