package com.polaris.converter;

import com.polaris.common.base.BaseConverter;
import com.polaris.dto.CategoryCreateRequest;
import com.polaris.dto.CategoryResponse;
import com.polaris.dto.CategoryUpdateRequest;
import com.polaris.entity.Category;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;
import org.mapstruct.NullValuePropertyMappingStrategy;

/**
 * 分类转换器
 * 使用 MapStruct 自动生成实现
 */
@Mapper(componentModel = "spring", nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
public interface CategoryConverter extends BaseConverter<Category, CategoryResponse, CategoryCreateRequest, CategoryUpdateRequest> {
    
    /**
     * Entity -> Response DTO
     * 
     * @param category 分类实体
     * @return 分类响应 DTO
     */
    @Override
    CategoryResponse toResponse(Category category);
    
    /**
     * Create Request DTO -> Entity
     * 
     * @param request 创建请求
     * @return 分类实体
     */
    @Override
    Category toEntity(CategoryCreateRequest request);
    
    /**
     * Update Request DTO -> Entity (更新现有实体)
     * 只更新非 null 字段，避免覆盖数据库 NOT NULL 约束字段
     * 
     * @param category 目标实体
     * @param request 更新请求
     */
    @Override
    void updateEntity(@MappingTarget Category category, CategoryUpdateRequest request);
}
