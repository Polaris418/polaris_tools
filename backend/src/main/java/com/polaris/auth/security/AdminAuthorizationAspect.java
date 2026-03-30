package com.polaris.auth.security;

import com.polaris.common.exception.BusinessException;
import com.polaris.common.exception.ErrorCode;
import com.polaris.entity.User;
import com.polaris.mapper.UserMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Before;
import org.springframework.stereotype.Component;

/**
 * 管理员权限验证切面
 * 拦截带有 @RequireAdmin 注解的方法，验证当前用户是否具有管理员权限
 */
@Aspect
@Component
@RequiredArgsConstructor
@Slf4j
public class AdminAuthorizationAspect {
    
    private final UserContext userContext;
    private final UserMapper userMapper;
    
    /**
     * 在执行带有 @RequireAdmin 注解的方法前进行权限检查
     * 验证逻辑：
     * 1. 检查用户是否已认证
     * 2. 检查用户是否存在
     * 3. 检查用户是否为管理员（planType = 999）
     */
    @Before("@annotation(com.polaris.auth.security.RequireAdmin) || @within(com.polaris.auth.security.RequireAdmin)")
    public void checkAdminPermission() {
        // 获取当前用户ID
        Long userId = userContext.getCurrentUserId();
        
        // 检查是否已认证
        if (userId == null) {
            log.warn("未认证用户尝试访问管理员接口");
            throw new BusinessException(ErrorCode.UNAUTHORIZED);
        }
        
        // 查询用户信息
        User user = userMapper.selectById(userId);
        
        // 检查用户是否存在
        if (user == null || user.getDeleted() == 1) {
            log.warn("用户不存在或已删除，userId={}", userId);
            throw new BusinessException(ErrorCode.USER_NOT_FOUND);
        }
        
        // 检查是否为管理员（planType = 999）
        if (user.getPlanType() == null || user.getPlanType() != 999) {
            log.warn("非管理员用户尝试访问管理员接口，userId={}, planType={}", userId, user.getPlanType());
            throw new BusinessException(ErrorCode.FORBIDDEN, "需要管理员权限");
        }
        
        log.debug("管理员权限验证通过，userId={}", userId);
    }
}
