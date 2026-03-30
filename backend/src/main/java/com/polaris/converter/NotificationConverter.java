package com.polaris.converter;

import com.polaris.common.base.BaseConverter;
import com.polaris.dto.notification.NotificationCreateRequest;
import com.polaris.dto.notification.NotificationResponse;
import com.polaris.dto.notification.NotificationUpdateRequest;
import com.polaris.entity.Notification;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.Named;

/**
 * 通知转换器
 * 使用 MapStruct 自动生成实现
 */
@Mapper(componentModel = "spring")
public interface NotificationConverter extends BaseConverter<Notification, NotificationResponse, NotificationCreateRequest, NotificationUpdateRequest> {
    
    /**
     * Entity -> Response DTO
     * 
     * @param notification 通知实体
     * @return 通知响应 DTO
     */
    @Override
    NotificationResponse toResponse(Notification notification);
    
    /**
     * Create Request DTO -> Entity
     * 
     * @param request 创建请求
     * @return 通知实体
     */
    @Override
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "deleted", constant = "0")
    @Mapping(target = "isRead", constant = "0")
    @Mapping(target = "readAt", ignore = true)
    @Mapping(target = "isGlobal", source = "isGlobal", qualifiedByName = "booleanToInteger")
    @Mapping(target = "globalNotificationId", ignore = true)
    Notification toEntity(NotificationCreateRequest request);
    
    /**
     * Update Request DTO -> Entity (update existing entity)
     * 
     * @param entity 要更新的实体
     * @param request 更新请求
     */
    @Override
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "deleted", ignore = true)
    @Mapping(target = "userId", ignore = true)
    @Mapping(target = "isGlobal", ignore = true)
    @Mapping(target = "globalNotificationId", ignore = true)
    @Mapping(target = "isRead", ignore = true)
    @Mapping(target = "readAt", ignore = true)
    void updateEntity(@MappingTarget Notification entity, NotificationUpdateRequest request);
    
    /**
     * Boolean 转 Integer 映射方法
     */
    @Named("booleanToInteger")
    default Integer booleanToInteger(Boolean value) {
        if (value == null) {
            return 0;
        }
        return Boolean.TRUE.equals(value) ? 1 : 0;
    }
}
