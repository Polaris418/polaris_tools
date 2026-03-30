package com.polaris.converter;

import com.polaris.common.base.BaseConverter;
import com.polaris.dto.tool.ToolUsageCreateRequest;
import com.polaris.dto.tool.ToolUsageResponse;
import com.polaris.dto.tool.ToolUsageUpdateRequest;
import com.polaris.entity.ToolUsage;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

/**
 * 工具使用记录转换器
 */
@Mapper(componentModel = "spring")
public interface ToolUsageConverter extends BaseConverter<ToolUsage, ToolUsageResponse, ToolUsageCreateRequest, ToolUsageUpdateRequest> {
    
    /**
     * 实体转响应 DTO
     * 继承自 BaseConverter，MapStruct 会自动实现
     */
    @Override
    ToolUsageResponse toResponse(ToolUsage entity);
    
    /**
     * 创建请求转实体
     * 继承自 BaseConverter，MapStruct 会自动实现
     */
    @Override
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "deleted", ignore = true)
    @Mapping(target = "userId", ignore = true)
    @Mapping(target = "ipAddress", ignore = true)
    @Mapping(target = "userAgent", ignore = true)
    @Mapping(target = "toolName", ignore = true)
    @Mapping(target = "toolNameZh", ignore = true)
    @Mapping(target = "toolIcon", ignore = true)
    ToolUsage toEntity(ToolUsageCreateRequest request);
    
    /**
     * 更新请求更新实体
     * 继承自 BaseConverter，MapStruct 会自动实现
     */
    @Override
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "deleted", ignore = true)
    @Mapping(target = "userId", ignore = true)
    @Mapping(target = "toolId", ignore = true)
    @Mapping(target = "usedAt", ignore = true)
    @Mapping(target = "ipAddress", ignore = true)
    @Mapping(target = "userAgent", ignore = true)
    @Mapping(target = "toolName", ignore = true)
    @Mapping(target = "toolNameZh", ignore = true)
    @Mapping(target = "toolIcon", ignore = true)
    void updateEntity(@MappingTarget ToolUsage entity, ToolUsageUpdateRequest request);
}
