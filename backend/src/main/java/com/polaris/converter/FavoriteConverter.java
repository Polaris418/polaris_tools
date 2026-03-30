package com.polaris.converter;

import com.polaris.common.base.BaseConverter;
import com.polaris.dto.favorite.FavoriteCreateRequest;
import com.polaris.dto.favorite.FavoriteResponse;
import com.polaris.entity.UserFavorite;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.NullValuePropertyMappingStrategy;

/**
 * 收藏转换器
 * 用于支持 BaseServiceImpl
 */
@Mapper(componentModel = "spring", nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
public interface FavoriteConverter extends BaseConverter<UserFavorite, FavoriteResponse, FavoriteCreateRequest, FavoriteCreateRequest> {
    
    /**
     * Entity -> Response DTO
     */
    @Override
    FavoriteResponse toResponse(UserFavorite entity);
    
    /**
     * Create Request DTO -> Entity
     */
    @Override
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "deleted", ignore = true)
    @Mapping(target = "userId", ignore = true)
    UserFavorite toEntity(FavoriteCreateRequest request);
    
    /**
     * Update Request DTO -> Entity (更新现有实体)
     */
    @Override
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "deleted", ignore = true)
    @Mapping(target = "userId", ignore = true)
    void updateEntity(@MappingTarget UserFavorite entity, FavoriteCreateRequest request);
}
