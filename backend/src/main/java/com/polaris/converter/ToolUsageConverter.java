package com.polaris.converter;

import com.polaris.common.base.BaseConverter;
import com.polaris.dto.ToolUsageCreateRequest;
import com.polaris.dto.ToolUsageResponse;
import com.polaris.dto.ToolUsageUpdateRequest;
import com.polaris.entity.ToolUsage;
import org.mapstruct.Mapper;
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
    ToolUsage toEntity(ToolUsageCreateRequest request);
    
    /**
     * 更新请求更新实体
     * 继承自 BaseConverter，MapStruct 会自动实现
     */
    @Override
    void updateEntity(@MappingTarget ToolUsage entity, ToolUsageUpdateRequest request);
}
