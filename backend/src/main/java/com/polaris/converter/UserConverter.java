package com.polaris.converter;

import com.polaris.common.base.BaseConverter;
import com.polaris.dto.AdminUserResponse;
import com.polaris.dto.UserRegisterRequest;
import com.polaris.dto.UserResponse;
import com.polaris.dto.UserUpdateRequest;
import com.polaris.entity.User;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;
import org.mapstruct.NullValuePropertyMappingStrategy;

/**
 * 用户实体与 DTO 转换器
 * 使用 MapStruct 自动生成转换代码
 */
@Mapper(componentModel = "spring", nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
public interface UserConverter extends BaseConverter<User, UserResponse, UserRegisterRequest, UserUpdateRequest> {
    
    /**
     * Entity -> Response DTO
     * 
     * @param user 用户实体
     * @return 用户响应 DTO
     */
    @Override
    UserResponse toResponse(User user);
    
    /**
     * Create Request DTO -> Entity
     * 
     * @param request 注册请求
     * @return 用户实体
     */
    @Override
    User toEntity(UserRegisterRequest request);
    
    /**
     * Update Request DTO -> Entity (更新现有实体)
     * 只更新非 null 字段，null 字段保持原值不变
     * 
     * @param user 目标实体
     * @param request 更新请求
     */
    @Override
    void updateEntity(@MappingTarget User user, UserUpdateRequest request);
    
    /**
     * 将 User 实体转换为 UserResponse DTO
     * 保留此方法以保持向后兼容性
     * 
     * @param user 用户实体
     * @return 用户响应 DTO
     */
    default UserResponse toUserResponse(User user) {
        return toResponse(user);
    }
    
    /**
     * 将 User 实体转换为 AdminUserResponse DTO
     * 
     * @param user 用户实体
     * @return 管理员用户响应 DTO
     */
    AdminUserResponse toAdminUserResponse(User user);
}
