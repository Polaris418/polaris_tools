package com.polaris.converter;

import com.polaris.common.base.BaseConverter;
import com.polaris.dto.document.VersionCreateRequest;
import com.polaris.dto.document.VersionResponse;
import com.polaris.dto.document.VersionUpdateRequest;
import com.polaris.entity.DocumentVersion;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
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
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "deleted", ignore = true)
    @Mapping(target = "versionNumber", ignore = true)
    @Mapping(target = "expireAt", ignore = true)
    DocumentVersion toEntity(VersionCreateRequest request);
    
    /**
     * 更新请求更新实体
     */
    @Override
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "deleted", ignore = true)
    @Mapping(target = "documentId", ignore = true)
    @Mapping(target = "versionNumber", ignore = true)
    @Mapping(target = "expireAt", ignore = true)
    void updateEntity(@MappingTarget DocumentVersion entity, VersionUpdateRequest request);
}
