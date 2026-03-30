package com.polaris.converter;

import com.polaris.common.base.BaseConverter;
import com.polaris.dto.document.DocumentCreateRequest;
import com.polaris.dto.document.DocumentResponse;
import com.polaris.dto.document.DocumentUpdateRequest;
import com.polaris.entity.UserDocument;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

/**
 * 文档实体与 DTO 转换器
 * 使用 MapStruct 自动生成转换代码
 */
@Mapper(componentModel = "spring")
public interface DocumentConverter extends BaseConverter<UserDocument, DocumentResponse, DocumentCreateRequest, DocumentUpdateRequest> {
    
    /**
     * 将 UserDocument 实体转换为 DocumentResponse DTO
     * 注意：wordCount、charCount、readingTime 需要在 Service 层单独计算
     * 
     * @param document 文档实体
     * @return 文档响应 DTO
     */
    @Override
    @Mapping(target = "wordCount", ignore = true)
    @Mapping(target = "charCount", ignore = true)
    @Mapping(target = "readingTime", ignore = true)
    DocumentResponse toResponse(UserDocument document);
    
    /**
     * 将 DocumentCreateRequest DTO 转换为 UserDocument 实体
     * 
     * @param request 文档创建请求
     * @return 文档实体
     */
    @Override
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "userId", ignore = true)
    @Mapping(target = "format", constant = "markdown")
    @Mapping(target = "isTemplate", constant = "0")
    @Mapping(target = "viewCount", constant = "0L")
    @Mapping(target = "exportCount", constant = "0L")
    @Mapping(target = "expireAt", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "deleted", ignore = true)
    UserDocument toEntity(DocumentCreateRequest request);
    
    /**
     * 将 DocumentUpdateRequest DTO 的非空字段更新到 UserDocument 实体
     * 
     * @param document 目标文档实体
     * @param request 文档更新请求
     */
    @Override
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "userId", ignore = true)
    @Mapping(target = "format", ignore = true)
    @Mapping(target = "isTemplate", ignore = true)
    @Mapping(target = "viewCount", ignore = true)
    @Mapping(target = "exportCount", ignore = true)
    @Mapping(target = "expireAt", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "deleted", ignore = true)
    void updateEntity(@MappingTarget UserDocument document, DocumentUpdateRequest request);
}
