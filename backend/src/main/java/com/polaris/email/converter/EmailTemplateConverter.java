package com.polaris.email.converter;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.polaris.common.base.BaseConverter;
import com.polaris.email.dto.EmailTemplateRequest;
import com.polaris.email.dto.EmailTemplateResponse;
import com.polaris.email.entity.EmailTemplate;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * 邮件模板转换器
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class EmailTemplateConverter implements BaseConverter<EmailTemplate, EmailTemplateResponse, EmailTemplateRequest, EmailTemplateRequest> {
    
    private final ObjectMapper objectMapper;
    
    @Override
    public EmailTemplate toEntity(EmailTemplateRequest request) {
        if (request == null) {
            return null;
        }
        
        EmailTemplate template = new EmailTemplate();
        template.setId(request.getId());
        template.setCode(request.getCode());
        template.setName(request.getName());
        template.setLanguage(request.getLanguage());
        template.setSubject(request.getSubject());
        template.setHtmlContent(request.getHtmlContent());
        template.setTextContent(request.getTextContent());
        template.setVariables(request.getVariables());
        template.setVersion(request.getVersion());
        template.setEnabled(request.getEnabled());
        
        return template;
    }
    
    @Override
    public void updateEntity(EmailTemplate entity, EmailTemplateRequest request) {
        if (entity == null || request == null) {
            return;
        }
        
        entity.setCode(request.getCode());
        entity.setName(request.getName());
        entity.setLanguage(request.getLanguage());
        entity.setSubject(request.getSubject());
        entity.setHtmlContent(request.getHtmlContent());
        entity.setTextContent(request.getTextContent());
        entity.setVariables(request.getVariables());
        entity.setVersion(request.getVersion());
        entity.setEnabled(request.getEnabled());
    }
    
    @Override
    public EmailTemplateResponse toResponse(EmailTemplate entity) {
        if (entity == null) {
            return null;
        }
        
        EmailTemplateResponse response = new EmailTemplateResponse();
        response.setId(entity.getId());
        response.setCode(entity.getCode());
        response.setName(entity.getName());
        response.setLanguage(entity.getLanguage());
        response.setSubject(entity.getSubject());
        response.setHtmlContent(entity.getHtmlContent());
        response.setTextContent(entity.getTextContent());
        
        // Parse variables JSON string to List<String>
        if (entity.getVariables() != null && !entity.getVariables().isEmpty()) {
            try {
                List<String> variablesList = objectMapper.readValue(
                    entity.getVariables(), 
                    new TypeReference<List<String>>() {}
                );
                response.setVariables(variablesList);
            } catch (Exception e) {
                log.warn("Failed to parse variables JSON for template {}: {}", entity.getCode(), e.getMessage());
                response.setVariables(null);
            }
        } else {
            response.setVariables(null);
        }
        
        response.setVersion(entity.getVersion());
        response.setEnabled(entity.getEnabled());
        response.setCreatedAt(entity.getCreatedAt());
        response.setUpdatedAt(entity.getUpdatedAt());
        
        return response;
    }
}
