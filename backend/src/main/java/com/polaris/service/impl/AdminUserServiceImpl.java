package com.polaris.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.polaris.common.base.BaseConverter;
import com.polaris.common.base.BaseServiceImpl;
import com.polaris.common.exception.BusinessException;
import com.polaris.common.exception.ErrorCode;
import com.polaris.common.result.PageResult;
import com.polaris.converter.UserConverter;
import com.polaris.dto.AdminUserCreateRequest;
import com.polaris.dto.AdminUserQueryRequest;
import com.polaris.dto.AdminUserResponse;
import com.polaris.dto.AdminUserUpdateRequest;
import com.polaris.entity.User;
import com.polaris.mapper.UserMapper;
import com.polaris.security.UserContext;
import com.polaris.service.AdminUserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

/**
 * 管理员用户管理服务实现类
 * 继承 BaseServiceImpl 以复用标准 CRUD 操作
 * 保留管理员特有的方法（toggleUserStatus、restoreUser、hardDeleteUser）
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AdminUserServiceImpl extends BaseServiceImpl<User, AdminUserResponse, AdminUserCreateRequest, AdminUserUpdateRequest, AdminUserQueryRequest> 
        implements AdminUserService {
    
    private final UserMapper userMapper;
    private final UserConverter userConverter;
    private final UserContext userContext;
    private final PasswordEncoder passwordEncoder;
    
    @Override
    protected BaseMapper<User> getMapper() {
        return userMapper;
    }
    
    @Override
    protected BaseConverter<User, AdminUserResponse, AdminUserCreateRequest, AdminUserUpdateRequest> getConverter() {
        return new BaseConverter<User, AdminUserResponse, AdminUserCreateRequest, AdminUserUpdateRequest>() {
            @Override
            public AdminUserResponse toResponse(User entity) {
                return userConverter.toAdminUserResponse(entity);
            }
            
            @Override
            public User toEntity(AdminUserCreateRequest request) {
                User user = new User();
                user.setUsername(request.getUsername());
                user.setEmail(request.getEmail());
                user.setPassword(passwordEncoder.encode(request.getPassword()));
                user.setNickname(request.getNickname() != null ? request.getNickname() : request.getUsername());
                user.setPlanType(request.getPlanType() != null ? request.getPlanType() : 0);
                user.setStatus(request.getStatus() != null ? request.getStatus() : 1);
                return user;
            }
            
            @Override
            public void updateEntity(User entity, AdminUserUpdateRequest request) {
                if (StringUtils.hasText(request.getNickname())) {
                    entity.setNickname(request.getNickname());
                }
                if (StringUtils.hasText(request.getEmail())) {
                    entity.setEmail(request.getEmail());
                }
                if (request.getPlanType() != null) {
                    entity.setPlanType(request.getPlanType());
                }
                if (request.getPlanExpiredAt() != null) {
                    entity.setPlanExpiredAt(request.getPlanExpiredAt());
                }
                if (request.getStatus() != null) {
                    entity.setStatus(request.getStatus());
                }
            }
        };
    }
    
    @Override
    protected String getResourceName() {
        return "用户";
    }
    
    @Override
    protected LambdaQueryWrapper<User> buildQueryWrapper(AdminUserQueryRequest query) {
        LambdaQueryWrapper<User> wrapper = new LambdaQueryWrapper<>();
        
        // 关键词搜索（用户名或邮箱）
        if (StringUtils.hasText(query.getKeyword())) {
            wrapper.and(w -> w.like(User::getUsername, query.getKeyword())
                             .or()
                             .like(User::getEmail, query.getKeyword()));
        }
        
        // 状态过滤
        if (query.getStatus() != null) {
            wrapper.eq(User::getStatus, query.getStatus());
        }
        
        // 套餐类型过滤
        if (query.getPlanType() != null) {
            wrapper.eq(User::getPlanType, query.getPlanType());
        }
        
        // 排序
        wrapper.orderByDesc(User::getCreatedAt);
        
        return wrapper;
    }
    
    @Override
    protected AdminUserResponse convertToResponse(User entity) {
        return userConverter.toAdminUserResponse(entity);
    }
    
    // ==================== 覆盖基类方法以支持特殊逻辑 ====================
    
    /**
     * 覆盖基类的 list 方法以支持查询已删除数据
     */
    @Override
    public PageResult<AdminUserResponse> list(AdminUserQueryRequest query) {
        Long adminId = userContext.getCurrentUserId();
        log.info("管理员查询用户列表开始: adminId={}, page={}, size={}, keyword={}, status={}, planType={}, includeDeleted={}", 
                 adminId, query.getPage(), query.getSize(), query.getKeyword(), 
                 query.getStatus(), query.getPlanType(), query.getIncludeDeleted());
        
        try {
            // 如果需要查询已删除的数据，使用自定义 SQL
            if (Boolean.TRUE.equals(query.getIncludeDeleted())) {
                Page<User> page = new Page<>(query.getPage(), query.getSize());
                IPage<User> userPage = userMapper.selectUsersIncludeDeleted(
                    page,
                    query.getKeyword(),
                    query.getStatus(),
                    query.getPlanType(),
                    true
                );
                
                List<AdminUserResponse> responses = userPage.getRecords().stream()
                    .map(userConverter::toAdminUserResponse)
                    .collect(Collectors.toList());
                
                log.info("管理员查询已删除用户列表成功: adminId={}, total={}", adminId, userPage.getTotal());
                
                return new PageResult<>(responses, userPage.getTotal(), userPage.getPages(), 
                                       query.getPage(), query.getSize());
            }
            
            // 使用基类的标准查询
            return super.list(query);
        } catch (Exception e) {
            log.error("管理员查询用户列表失败: adminId={}, error={}", adminId, e.getMessage(), e);
            throw e;
        }
    }
    
    @Override
    public PageResult<AdminUserResponse> listUsers(AdminUserQueryRequest request) {
        return list(request);
    }
    
    /**
     * 覆盖基类的 getById 方法以支持查询已删除数据
     */
    @Override
    public AdminUserResponse getById(Long id) {
        // 尝试先查普通数据，如果不存在再查已删除的
        User user = userMapper.selectById(id);
        if (user == null || user.getDeleted() == 1) {
            // 尝试查询已删除的用户
            user = userMapper.selectByIdIncludeDeleted(id);
            if (user == null) {
                throw new BusinessException(ErrorCode.USER_NOT_FOUND);
            }
        }
        return userConverter.toAdminUserResponse(user);
    }
    
    @Override
    public AdminUserResponse getUser(Long id) {
        return getById(id);
    }
    
    /**
     * 覆盖基类的 validateCreate 方法以添加用户名和邮箱唯一性验证
     */
    @Override
    protected void validateCreate(AdminUserCreateRequest request) {
        Long adminId = userContext.getCurrentUserId();
        
        // 验证用户名唯一性
        User existingByUsername = userMapper.findByUsername(request.getUsername());
        if (existingByUsername != null) {
            log.warn("管理员创建用户失败，用户名已存在: username={}, adminId={}", request.getUsername(), adminId);
            throw new BusinessException(ErrorCode.USERNAME_EXISTS);
        }
        
        // 验证邮箱唯一性
        User existingByEmail = userMapper.findByEmail(request.getEmail());
        if (existingByEmail != null) {
            log.warn("管理员创建用户失败，邮箱已存在: email={}, adminId={}", request.getEmail(), adminId);
            throw new BusinessException(ErrorCode.EMAIL_EXISTS);
        }
    }
    
    @Override
    public AdminUserResponse createUser(AdminUserCreateRequest request) {
        return create(request);
    }
    
    /**
     * 覆盖基类的 update 方法以支持更新已删除用户
     */
    @Override
    public AdminUserResponse update(Long id, AdminUserUpdateRequest request) {
        Long adminId = userContext.getCurrentUserId();
        log.info("管理员更新用户信息开始: userId={}, adminId={}, request={}", id, adminId, request);
        
        try {
            // 查询用户（包含已删除的数据）
            User user = userMapper.selectByIdIncludeDeleted(id);
            if (user == null) {
                log.warn("管理员更新用户信息失败，用户不存在: userId={}, adminId={}", id, adminId);
                throw new BusinessException(ErrorCode.USER_NOT_FOUND);
            }
            
            // 记录旧值
            String oldNickname = user.getNickname();
            String oldEmail = user.getEmail();
            Integer oldPlanType = user.getPlanType();
            LocalDateTime oldPlanExpiredAt = user.getPlanExpiredAt();
            Integer oldStatus = user.getStatus();
            
            // 更新邮箱（验证唯一性）
            if (StringUtils.hasText(request.getEmail())) {
                User existingUser = userMapper.findByEmail(request.getEmail());
                if (existingUser != null && !existingUser.getId().equals(id)) {
                    log.warn("管理员更新用户信息失败，邮箱已存在: userId={}, email={}, adminId={}", 
                             id, request.getEmail(), adminId);
                    throw new BusinessException(ErrorCode.EMAIL_EXISTS);
                }
            }
            
            // 验证套餐类型有效性
            if (request.getPlanType() != null) {
                if (request.getPlanType() < 0 || request.getPlanType() > 2) {
                    log.warn("管理员更新用户信息失败，套餐类型无效: userId={}, planType={}, adminId={}", 
                             id, request.getPlanType(), adminId);
                    throw new BusinessException(ErrorCode.INVALID_PARAMETER, "套餐类型无效");
                }
            }
            
            // 更新实体
            getConverter().updateEntity(user, request);
            user.setUpdatedAt(LocalDateTime.now());
            
            // 使用自定义更新方法（不受逻辑删除限制）
            userMapper.updateByIdIncludeDeleted(
                user.getId(),
                user.getUsername(),
                user.getPassword(),
                user.getEmail(),
                user.getNickname(),
                user.getAvatar(),
                user.getAvatarConfig(),
                user.getBio(),
                user.getPlanType(),
                user.getPlanExpiredAt(),
                user.getStatus(),
                user.getLastLoginAt(),
                user.getLastLoginIp(),
                user.getUpdatedAt()
            );
            
            // 记录新值和变更
            log.info("管理员更新用户信息成功: userId={}, adminId={}, changes=[nickname: {} -> {}, email: {} -> {}, planType: {} -> {}, planExpiredAt: {} -> {}, status: {} -> {}]",
                     id, adminId, 
                     oldNickname, user.getNickname(),
                     oldEmail, user.getEmail(),
                     oldPlanType, user.getPlanType(),
                     oldPlanExpiredAt, user.getPlanExpiredAt(),
                     oldStatus, user.getStatus());
            
            return userConverter.toAdminUserResponse(user);
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            log.error("管理员更新用户信息异常: userId={}, adminId={}, error={}", id, adminId, e.getMessage(), e);
            throw e;
        }
    }
    
    @Override
    public AdminUserResponse updateUser(Long id, AdminUserUpdateRequest request) {
        return update(id, request);
    }
    
    /**
     * 覆盖基类的 validateDelete 方法以添加特殊验证
     */
    @Override
    protected void validateDelete(User entity) {
        Long adminId = userContext.getCurrentUserId();
        
        // 不能删除自己
        if (entity.getId().equals(adminId)) {
            log.warn("管理员删除用户失败，不能删除自己: userId={}, adminId={}", entity.getId(), adminId);
            throw new BusinessException(ErrorCode.CANNOT_DELETE_SELF);
        }
        
        // 检查是否已删除
        if (entity.getDeleted() == 1) {
            log.warn("管理员删除用户失败，用户已被删除: userId={}, adminId={}", entity.getId(), adminId);
            throw new BusinessException(ErrorCode.INVALID_PARAMETER, "用户已被删除");
        }
    }
    
    @Override
    public void deleteUser(Long id) {
        delete(id);
    }
    
    // ==================== 管理员特有方法 ====================
    
    @Override
    @Transactional(rollbackFor = Exception.class)
    public void toggleUserStatus(Long id, Integer status) {
        Long adminId = userContext.getCurrentUserId();
        log.info("管理员切换用户状态开始: userId={}, newStatus={}, adminId={}", id, status, adminId);
        
        try {
            // 查询用户（包含已删除的数据）
            User user = userMapper.selectByIdIncludeDeleted(id);
            if (user == null) {
                log.warn("管理员切换用户状态失败，用户不存在: userId={}, adminId={}", id, adminId);
                throw new BusinessException(ErrorCode.USER_NOT_FOUND);
            }
            
            // 检查是否已删除
            if (user.getDeleted() == 1) {
                log.warn("管理员切换用户状态失败，用户已被删除: userId={}, adminId={}", id, adminId);
                throw new BusinessException(ErrorCode.INVALID_PARAMETER, "无法修改已删除用户的状态");
            }
            
            Integer oldStatus = user.getStatus();
            user.setStatus(status);
            userMapper.updateById(user);
            
            log.info("管理员切换用户状态成功: userId={}, oldStatus={}, newStatus={}, adminId={}", 
                     id, oldStatus, status, adminId);
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            log.error("管理员切换用户状态异常: userId={}, status={}, adminId={}, error={}", 
                      id, status, adminId, e.getMessage(), e);
            throw e;
        }
    }
    
    @Override
    @Transactional(rollbackFor = Exception.class)
    public void restoreUser(Long id) {
        Long adminId = userContext.getCurrentUserId();
        log.info("管理员恢复用户开始: userId={}, adminId={}", id, adminId);
        
        try {
            // 查询用户（包含已删除）
            User user = userMapper.selectByIdIncludeDeleted(id);
            if (user == null) {
                log.warn("管理员恢复用户失败，用户不存在: userId={}, adminId={}", id, adminId);
                throw new BusinessException(ErrorCode.USER_NOT_FOUND);
            }
            
            // 检查是否已删除
            if (user.getDeleted() != 1) {
                log.warn("管理员恢复用户失败，用户未被删除: userId={}, deleted={}, adminId={}", 
                         id, user.getDeleted(), adminId);
                throw new BusinessException(ErrorCode.INVALID_PARAMETER, "只能恢复已删除的用户");
            }
            
            // 验证恢复后的数据是否符合约束
            // 检查用户名唯一性（排除已删除的记录）
            int usernameCount = userMapper.existsByUsernameAndDeletedNot(user.getUsername(), 1);
            if (usernameCount > 0) {
                log.warn("管理员恢复用户失败，用户名已存在: userId={}, username={}, adminId={}", 
                         id, user.getUsername(), adminId);
                throw new BusinessException(ErrorCode.USERNAME_EXISTS);
            }
            
            // 检查邮箱唯一性（排除已删除的记录）
            int emailCount = userMapper.existsByEmailAndDeletedNot(user.getEmail(), 1);
            if (emailCount > 0) {
                log.warn("管理员恢复用户失败，邮箱已存在: userId={}, email={}, adminId={}", 
                         id, user.getEmail(), adminId);
                throw new BusinessException(ErrorCode.EMAIL_EXISTS);
            }
            
            // 恢复用户（设置 deleted=0）
            int rows = userMapper.restoreById(id);
            if (rows == 0) {
                log.error("管理员恢复用户失败，数据库更新失败: userId={}, adminId={}", id, adminId);
                throw new BusinessException(ErrorCode.INTERNAL_ERROR, "恢复用户失败");
            }
            
            log.info("管理员恢复用户成功: userId={}, username={}, email={}, adminId={}", 
                     id, user.getUsername(), user.getEmail(), adminId);
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            log.error("管理员恢复用户异常: userId={}, adminId={}, error={}", id, adminId, e.getMessage(), e);
            throw e;
        }
    }
    
    @Override
    @Transactional(rollbackFor = Exception.class)
    public void hardDeleteUser(Long id) {
        Long adminId = userContext.getCurrentUserId();
        log.info("管理员永久删除用户开始: userId={}, adminId={}", id, adminId);
        
        try {
            // 不能删除自己
            if (id.equals(adminId)) {
                log.warn("管理员永久删除用户失败，不能删除自己: userId={}, adminId={}", id, adminId);
                throw new BusinessException(ErrorCode.CANNOT_DELETE_SELF);
            }
            
            // 查询用户（包含已删除）
            User user = userMapper.selectByIdIncludeDeleted(id);
            if (user == null) {
                log.warn("管理员永久删除用户失败，用户不存在: userId={}, adminId={}", id, adminId);
                throw new BusinessException(ErrorCode.USER_NOT_FOUND);
            }
            
            // 检查是否已软删除
            if (user.getDeleted() != 1) {
                log.warn("管理员永久删除用户失败，只能永久删除已软删除的记录: userId={}, deleted={}, adminId={}", 
                         id, user.getDeleted(), adminId);
                throw new BusinessException(ErrorCode.INVALID_PARAMETER, "只能永久删除已软删除的记录");
            }
            
            // 记录被永久删除的用户信息
            log.info("管理员永久删除用户，记录删除数据: userId={}, username={}, email={}, planType={}, status={}, adminId={}",
                     id, user.getUsername(), user.getEmail(), user.getPlanType(), user.getStatus(), adminId);
            
            // 物理删除
            int rows = userMapper.hardDeleteById(id);
            if (rows == 0) {
                log.error("管理员永久删除用户失败，数据库删除失败: userId={}, adminId={}", id, adminId);
                throw new BusinessException(ErrorCode.INTERNAL_ERROR, "永久删除用户失败");
            }
            
            log.info("管理员永久删除用户成功: userId={}, adminId={}", id, adminId);
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            log.error("管理员永久删除用户异常: userId={}, adminId={}, error={}", id, adminId, e.getMessage(), e);
            throw e;
        }
    }
}
