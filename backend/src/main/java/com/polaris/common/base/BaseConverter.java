package com.polaris.common.base;

import org.mapstruct.MappingTarget;

/**
 * 通用转换器接口
 * 
 * @param <E> Entity 类型
 * @param <R> Response DTO 类型
 * @param <C> Create Request DTO 类型
 * @param <U> Update Request DTO 类型
 */
public interface BaseConverter<E, R, C, U> {
    
    /**
     * Entity -> Response DTO
     * 
     * @param entity 实体
     * @return 响应 DTO
     */
    R toResponse(E entity);
    
    /**
     * Create Request DTO -> Entity
     * 
     * @param request 创建请求
     * @return 实体
     */
    E toEntity(C request);
    
    /**
     * Update Request DTO -> Entity (更新现有实体)
     * 
     * @param entity 目标实体
     * @param request 更新请求
     */
    void updateEntity(@MappingTarget E entity, U request);
}
