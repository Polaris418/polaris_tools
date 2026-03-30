package com.polaris.email.converter;

import com.polaris.common.base.BaseConverter;
import com.polaris.email.dto.suppression.AddSuppressionRequest;
import com.polaris.email.dto.suppression.SuppressionResponse;
import com.polaris.email.entity.EmailSuppression;
import org.springframework.stereotype.Component;

/**
 * 抑制列表转换器
 */
@Component
public class SuppressionConverter implements BaseConverter<EmailSuppression, SuppressionResponse, AddSuppressionRequest, AddSuppressionRequest> {
    
    @Override
    public SuppressionResponse toResponse(EmailSuppression entity) {
        if (entity == null) {
            return null;
        }
        
        SuppressionResponse response = new SuppressionResponse();
        response.setId(entity.getId());
        response.setEmail(entity.getEmail());
        response.setReason(entity.getReason());
        response.setSource(entity.getSource());
        response.setSoftBounceCount(entity.getSoftBounceCount());
        response.setNotes(entity.getNotes());
        response.setCreatedAt(entity.getCreatedAt());
        response.setUpdatedAt(entity.getUpdatedAt());
        
        return response;
    }
    
    @Override
    public EmailSuppression toEntity(AddSuppressionRequest request) {
        // 不需要实现，因为不会从请求转换为实体
        throw new UnsupportedOperationException("不支持从请求转换为实体");
    }
    
    @Override
    public void updateEntity(EmailSuppression entity, AddSuppressionRequest request) {
        // 不需要实现
        throw new UnsupportedOperationException("不支持更新实体");
    }
}
