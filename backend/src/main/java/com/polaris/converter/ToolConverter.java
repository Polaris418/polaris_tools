package com.polaris.converter;

import com.polaris.common.base.BaseConverter;
import com.polaris.dto.ToolCreateRequest;
import com.polaris.dto.ToolResponse;
import com.polaris.dto.ToolUpdateRequest;
import com.polaris.entity.Tool;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.NullValuePropertyMappingStrategy;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

/**
 * 工具转换器
 * 使用 MapStruct 自动生成实现
 */
@Mapper(componentModel = "spring", nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
public interface ToolConverter extends BaseConverter<Tool, ToolResponse, ToolCreateRequest, ToolUpdateRequest> {
    
    /**
     * Entity -> Response DTO
     * 
     * @param tool 工具实体
     * @return 工具响应 DTO
     */
    @Override
    @Mapping(target = "lastUsedAt", expression = "java(formatLastUsedAt(tool.getLastUsedAt()))")
    ToolResponse toResponse(Tool tool);
    
    /**
     * Create Request DTO -> Entity
     * 
     * @param request 创建请求
     * @return 工具实体
     */
    @Override
    Tool toEntity(ToolCreateRequest request);
    
    /**
     * Update Request DTO -> Entity (更新现有实体)
     * 只更新非 null 的字段，null 字段保持原值不变
     * 
     * @param tool 目标实体
     * @param request 更新请求
     */
    @Override
    void updateEntity(@MappingTarget Tool tool, ToolUpdateRequest request);
    
    /**
     * 格式化最后使用时间
     */
    default String formatLastUsedAt(LocalDateTime lastUsedAt) {
        if (lastUsedAt == null) {
            return null;
        }
        return lastUsedAt.format(DateTimeFormatter.ISO_LOCAL_DATE_TIME);
    }
}
