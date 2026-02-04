package com.polaris.converter;

import com.polaris.dto.FolderCreateRequest;
import com.polaris.dto.FolderResponse;
import com.polaris.dto.FolderUpdateRequest;
import com.polaris.entity.DocumentFolder;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

/**
 * 文件夹实体与 DTO 转换器
 * 使用 MapStruct 自动生成转换代码
 */
@Mapper(componentModel = "spring")
public interface FolderConverter {
    
    /**
     * 将 DocumentFolder 实体转换为 FolderResponse DTO
     * 注意：documentCount 需要在 Service 层单独计算
     * 
     * @param folder 文件夹实体
     * @return 文件夹响应 DTO
     */
    @Mapping(target = "documentCount", ignore = true)
    FolderResponse toFolderResponse(DocumentFolder folder);
    
    /**
     * 将 FolderCreateRequest DTO 转换为 DocumentFolder 实体
     * 
     * @param request 文件夹创建请求
     * @return 文件夹实体
     */
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "userId", ignore = true)
    @Mapping(target = "sortOrder", constant = "0")
    @Mapping(target = "createdAt", ignore = true)
    DocumentFolder toDocumentFolder(FolderCreateRequest request);
    
    /**
     * 将 FolderUpdateRequest DTO 的非空字段更新到 DocumentFolder 实体
     * 
     * @param request 文件夹更新请求
     * @param folder 目标文件夹实体
     */
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "userId", ignore = true)
    @Mapping(target = "parentId", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    void updateFolderFromRequest(FolderUpdateRequest request, @MappingTarget DocumentFolder folder);
}
