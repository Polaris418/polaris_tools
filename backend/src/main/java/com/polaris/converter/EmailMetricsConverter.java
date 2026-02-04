package com.polaris.converter;

import com.polaris.common.base.BaseConverter;
import com.polaris.dto.email.EmailMetricsResponse;
import com.polaris.entity.EmailMetrics;
import org.springframework.stereotype.Component;

/**
 * 邮件指标转换器
 */
@Component
public class EmailMetricsConverter implements BaseConverter<EmailMetrics, EmailMetricsResponse, Void, Void> {
    
    @Override
    public EmailMetricsResponse toResponse(EmailMetrics entity) {
        if (entity == null) {
            return null;
        }
        
        EmailMetricsResponse response = new EmailMetricsResponse();
        response.setId(entity.getId());
        response.setMetricHour(entity.getMetricHour());
        response.setSentCount(entity.getSentCount());
        response.setFailedCount(entity.getFailedCount());
        response.setBounceCount(entity.getBounceCount());
        response.setComplaintCount(entity.getComplaintCount());
        response.setSuccessRate(entity.getSuccessRate());
        response.setFailureRate(entity.getFailureRate());
        response.setBounceRate(entity.getBounceRate());
        response.setComplaintRate(entity.getComplaintRate());
        response.setAvgDelayMs(entity.getAvgDelayMs());
        response.setCreatedAt(entity.getCreatedAt());
        response.setUpdatedAt(entity.getUpdatedAt());
        
        return response;
    }
    
    @Override
    public EmailMetrics toEntity(Void createRequest) {
        throw new UnsupportedOperationException("EmailMetrics 不支持手动创建");
    }
    
    @Override
    public void updateEntity(EmailMetrics entity, Void updateRequest) {
        throw new UnsupportedOperationException("EmailMetrics 不支持手动更新");
    }
}
