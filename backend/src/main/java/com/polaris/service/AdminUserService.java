package com.polaris.service;

import com.polaris.common.base.BaseService;
import com.polaris.common.result.PageResult;
import com.polaris.dto.AdminUserCreateRequest;
import com.polaris.dto.AdminUserQueryRequest;
import com.polaris.dto.AdminUserResponse;
import com.polaris.dto.AdminUserUpdateRequest;
import com.polaris.entity.User;

/**
 * 管理员用户管理服务接口
 * 继承 BaseService 以获得标准 CRUD 操作
 * 保留管理员特有的方法
 */
public interface AdminUserService extends BaseService<User, AdminUserResponse, AdminUserCreateRequest, AdminUserUpdateRequest, AdminUserQueryRequest> {
    
    /**
     * 分页查询用户列表
     * 
     * @param request 查询请求（包含分页参数和过滤条件）
     * @return 分页用户列表
     */
    PageResult<AdminUserResponse> listUsers(AdminUserQueryRequest request);
    
    /**
     * 获取用户详情
     * 
     * @param id 用户ID
     * @return 用户详情
     */
    AdminUserResponse getUser(Long id);
    
    /**
     * 创建用户
     * 
     * @param request 创建请求
     * @return 创建后的用户信息
     */
    AdminUserResponse createUser(AdminUserCreateRequest request);
    
    /**
     * 更新用户信息
     * 
     * @param id 用户ID
     * @param request 更新请求
     * @return 更新后的用户信息
     */
    AdminUserResponse updateUser(Long id, AdminUserUpdateRequest request);
    
    /**
     * 删除用户
     * 
     * @param id 用户ID
     */
    void deleteUser(Long id);
    
    /**
     * 切换用户状态
     * 
     * @param id 用户ID
     * @param status 新状态（0-禁用，1-启用）
     */
    void toggleUserStatus(Long id, Integer status);
    
    /**
     * 恢复用户
     * 
     * @param id 用户ID
     */
    void restoreUser(Long id);
    
    /**
     * 永久删除用户
     * 
     * @param id 用户ID
     */
    void hardDeleteUser(Long id);
}
