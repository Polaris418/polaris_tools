package com.polaris.converter;

import com.polaris.common.base.BaseConverter;
import com.polaris.dto.VersionCreateRequest;
import com.polaris.dto.VersionResponse;
import com.polaris.dto.VersionUpdateRequest;
import com.polaris.entity.DocumentVersion;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;

/**
 * 版本转换器
 */
@Mapper(componentModel = "spring")
public interface VersionConverter extends BaseConverter<DocumentVersion, VersionResponse, VersionCreateRequest, VersionUpdateRequest> {
    
    /**
     * 实体转响应 DTO
     */
    @Override
    VersionResponse toResponse(DocumentVersion entity);
    
    /**
     * 创建请求转实体
     */
    @Override
    DocumentVersion toEntity(VersionCreateRequest request);
    
    /**
     * 更新请求更新实体
     */
    @Override
    void updateEntity(@MappingTarget DocumentVersion entity, VersionUpdateRequest request);
}
