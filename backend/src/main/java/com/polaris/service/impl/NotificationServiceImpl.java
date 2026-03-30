package com.polaris.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.polaris.common.base.BaseConverter;
import com.polaris.common.base.BaseServiceImpl;
import com.polaris.common.exception.BusinessException;
import com.polaris.common.exception.ErrorCode;
import com.polaris.common.result.PageResult;
import com.polaris.converter.NotificationConverter;
import com.polaris.dto.notification.NotificationCreateRequest;
import com.polaris.dto.notification.NotificationQueryRequest;
import com.polaris.dto.notification.NotificationResponse;
import com.polaris.dto.notification.NotificationUpdateRequest;
import com.polaris.entity.Notification;
import com.polaris.entity.User;
import com.polaris.mapper.NotificationMapper;
import com.polaris.mapper.UserMapper;
import com.polaris.auth.security.UserContext;
import com.polaris.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

/**
 * 通知服务实现类
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationServiceImpl extends BaseServiceImpl<Notification, NotificationResponse, NotificationCreateRequest, NotificationUpdateRequest, NotificationQueryRequest> implements NotificationService {
    
    private final NotificationMapper notificationMapper;
    private final UserMapper userMapper;
    private final NotificationConverter notificationConverter;
    private final UserContext userContext;
    
    @Override
    protected BaseMapper<Notification> getMapper() {
        return notificationMapper;
    }
    
    @Override
    protected BaseConverter<Notification, NotificationResponse, NotificationCreateRequest, NotificationUpdateRequest> getConverter() {
        return notificationConverter;
    }
    
    @Override
    protected String getResourceName() {
        return "通知";
    }
    
    @Override
    protected LambdaQueryWrapper<Notification> buildQueryWrapper(NotificationQueryRequest query) {
        LambdaQueryWrapper<Notification> wrapper = new LambdaQueryWrapper<>();
        
        // 只查询当前用户的通知或全站通知
        Long userId = userContext.getCurrentUserId();
        if (userId != null) {
            wrapper.and(w -> w.eq(Notification::getUserId, userId).or().eq(Notification::getUserId, 0));
        }
        
        // 按类型筛选
        if (query.getType() != null && !query.getType().isEmpty()) {
            wrapper.eq(Notification::getType, query.getType());
        }
        
        // 按已读状态筛选
        if (query.getIsRead() != null) {
            wrapper.eq(Notification::getIsRead, query.getIsRead());
        }
        
        // 排序：最新的在前
        wrapper.orderByDesc(Notification::getCreatedAt);
        
        return wrapper;
    }
    
    @Override
    public PageResult<NotificationResponse> listUserNotifications(NotificationQueryRequest query) {
        Long userId = userContext.getCurrentUserId();
        if (userId == null) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED);
        }
        log.info("查询用户通知列表: userId={}, query={}", userId, query);
        
        // Use base class list method which will call buildQueryWrapper
        return list(query);
    }
    
    @Override
    public Long getUnreadCount() {
        Long userId = userContext.getCurrentUserId();
        if (userId == null) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED);
        }
        Long count = notificationMapper.countUnreadByUserId(userId);
        log.info("获取用户未读通知数量: userId={}, count={}", userId, count);
        return count;
    }
    
    @Override
    @Transactional(rollbackFor = Exception.class)
    public void markAsRead(Long id) {
        Long userId = userContext.getCurrentUserId();
        if (userId == null) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED);
        }
        log.info("标记通知为已读: id={}, userId={}", id, userId);
        
        Notification notification = notificationMapper.selectById(id);
        if (notification == null || notification.getDeleted() == 1) {
            throw new BusinessException(ErrorCode.NOT_FOUND, "通知不存在");
        }
        
        // 验证通知是否属于当前用户
        if (notification.getUserId() != 0 && !notification.getUserId().equals(userId)) {
            throw new BusinessException(ErrorCode.FORBIDDEN, "无权访问此通知");
        }
        
        if (notification.getIsRead() == 0) {
            notification.setIsRead(1);
            notification.setReadAt(LocalDateTime.now());
            notificationMapper.updateById(notification);
        }
    }
    
    @Override
    @Transactional(rollbackFor = Exception.class)
    public void markAllAsRead() {
        Long userId = userContext.getCurrentUserId();
        if (userId == null) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED);
        }
        log.info("标记所有通知为已读: userId={}", userId);
        
        int count = notificationMapper.markAllAsReadByUserId(userId);
        log.info("标记通知数量: {}", count);
    }
    
    @Override
    @Transactional(rollbackFor = Exception.class)
    public void deleteNotification(Long id) {
        Long userId = userContext.getCurrentUserId();
        if (userId == null) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED);
        }
        log.info("删除通知: id={}, userId={}", id, userId);
        
        Notification notification = notificationMapper.selectById(id);
        if (notification == null) {
            throw new BusinessException(ErrorCode.NOT_FOUND, "通知不存在");
        }
        
        // 检查是否为管理员
        User currentUser = userMapper.selectById(userId);
        boolean isAdmin = currentUser != null && currentUser.getPlanType() == 999;
        
        // 验证权限：管理员可以删除任何通知，普通用户只能删除自己的通知或全站通知
        if (!isAdmin && notification.getUserId() != 0 && !notification.getUserId().equals(userId)) {
            throw new BusinessException(ErrorCode.FORBIDDEN, "无权删除此通知");
        }
        
        // 全站通知：删除同一批次的所有记录（仅管理员可执行）
        if (isAdmin && notification.getIsGlobal() == 1 && notification.getGlobalNotificationId() != null) {
            log.info("删除全站通知批次: globalNotificationId={}", notification.getGlobalNotificationId());
            
            // 查询同一批次的所有通知
            List<Notification> batchNotifications = notificationMapper.selectList(
                new LambdaQueryWrapper<Notification>()
                    .eq(Notification::getGlobalNotificationId, notification.getGlobalNotificationId())
                    .eq(Notification::getDeleted, 0)
            );
            
            // 批量删除
            int deletedCount = 0;
            for (Notification notif : batchNotifications) {
                int result = notificationMapper.deleteById(notif.getId());
                if (result > 0) {
                    deletedCount++;
                }
            }
            
            log.info("全站通知批次删除完成: globalNotificationId={}, 删除数量={}", 
                notification.getGlobalNotificationId(), deletedCount);
        } else {
            // 个人通知或普通用户删除：只删除单条记录
            int result = notificationMapper.deleteById(id);
            if (result == 0) {
                throw new BusinessException(ErrorCode.INTERNAL_ERROR, "删除通知失败");
            }
            log.info("通知删除成功: id={}", id);
        }
    }
    
    @Override
    @Transactional(rollbackFor = Exception.class)
    public Long sendNotification(NotificationCreateRequest request) {
        log.info("发送通知: request={}", request);
        
        // 验证是否为管理员
        Long currentUserId = userContext.getCurrentUserId();
        if (currentUserId == null) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED);
        }
        
        User currentUser = userMapper.selectById(currentUserId);
        if (currentUser == null || currentUser.getPlanType() != 999) {
            throw new BusinessException(ErrorCode.FORBIDDEN, "只有管理员可以发送通知");
        }
        
        if (Boolean.TRUE.equals(request.getIsGlobal())) {
            // 全站通知：为所有用户创建通知记录
            return sendGlobalNotification(request);
        } else {
            // 个人通知
            if (request.getUserId() == null) {
                throw new BusinessException(ErrorCode.INVALID_PARAMETER, "个人通知必须指定用户ID");
            }
            return sendPersonalNotification(request);
        }
    }
    
    /**
     * 发送全站通知
     */
    private Long sendGlobalNotification(NotificationCreateRequest request) {
        log.info("发送全站通知: title={}", request.getTitle());
        
        // 获取所有活跃用户
        List<User> activeUsers = userMapper.selectList(
            new LambdaUpdateWrapper<User>()
                .eq(User::getStatus, 1)
                .eq(User::getDeleted, 0)
        );
        
        if (activeUsers.isEmpty()) {
            log.warn("没有活跃用户，跳过全站通知发送");
            return 0L;
        }
        
        // 为每个用户创建通知记录
        List<Notification> notifications = new ArrayList<>();
        Long globalNotificationId = null; // 第一条记录的ID将作为批次ID
        
        for (User user : activeUsers) {
            Notification notification = notificationConverter.toEntity(request);
            notification.setUserId(user.getId());
            notification.setIsGlobal(1);  // 标记为全站通知
            notifications.add(notification);
        }
        
        // 批量插入，第一条记录的ID作为批次ID
        for (int i = 0; i < notifications.size(); i++) {
            Notification notification = notifications.get(i);
            notificationMapper.insert(notification);
            
            if (i == 0) {
                // 第一条记录：使用自己的ID作为批次ID
                globalNotificationId = notification.getId();
                notification.setGlobalNotificationId(globalNotificationId);
                notificationMapper.updateById(notification);
            } else {
                // 后续记录：使用第一条记录的ID作为批次ID
                notification.setGlobalNotificationId(globalNotificationId);
                notificationMapper.updateById(notification);
            }
        }
        
        log.info("全站通知发送完成: 用户数={}, 批次ID={}", notifications.size(), globalNotificationId);
        return (long) notifications.size();
    }
    
    /**
     * 发送个人通知
     */
    private Long sendPersonalNotification(NotificationCreateRequest request) {
        log.info("发送个人通知: userId={}, title={}", request.getUserId(), request.getTitle());
        
        // 验证用户是否存在
        User user = userMapper.selectById(request.getUserId());
        if (user == null || user.getDeleted() == 1) {
            throw new BusinessException(ErrorCode.NOT_FOUND, "用户不存在");
        }
        
        Notification notification = notificationConverter.toEntity(request);
        notification.setIsGlobal(0);  // 标记为个人通知
        notificationMapper.insert(notification);
        
        log.info("个人通知发送完成: notificationId={}", notification.getId());
        return 1L;
    }
    
    @Override
    public PageResult<NotificationResponse> listAllNotifications(NotificationQueryRequest query) {
        log.info("查询所有通知列表（管理端）: query={}", query);
        
        // 验证是否为管理员
        Long currentUserId = userContext.getCurrentUserId();
        if (currentUserId == null) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED);
        }
        
        User currentUser = userMapper.selectById(currentUserId);
        if (currentUser == null || currentUser.getPlanType() != 999) {
            throw new BusinessException(ErrorCode.FORBIDDEN, "只有管理员可以查看所有通知");
        }
        
        Page<Notification> page = new Page<>(query.getPage(), query.getSize());
        IPage<Notification> notificationPage = notificationMapper.selectAllNotifications(
            page,
            query.getType(),
            null,  // 不限制用户ID，查询所有通知
            query.getIncludeDeleted()  // 是否包含已删除
        );
        
        List<NotificationResponse> responses = notificationPage.getRecords().stream()
            .map(notificationConverter::toResponse)
            .collect(Collectors.toList());
        
        // 计算总页数
        long pages = (notificationPage.getTotal() + query.getSize() - 1) / query.getSize();
        
        return new PageResult<>(responses, notificationPage.getTotal(), pages, query.getPage(), query.getSize());
    }
    
    @Override
    @Transactional(rollbackFor = Exception.class)
    public Integer updateNotification(Long id, NotificationUpdateRequest request) {
        log.info("更新通知: id={}, request={}", id, request);
        
        // 验证是否为管理员
        Long currentUserId = userContext.getCurrentUserId();
        if (currentUserId == null) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED);
        }
        
        User currentUser = userMapper.selectById(currentUserId);
        if (currentUser == null || currentUser.getPlanType() != 999) {
            throw new BusinessException(ErrorCode.FORBIDDEN, "只有管理员可以编辑通知");
        }
        
        // 查询原通知（包括已删除的）
        Notification originalNotification = notificationMapper.selectByIdWithDeleted(id);
        if (originalNotification == null) {
            throw new BusinessException(ErrorCode.NOT_FOUND, "通知不存在");
        }
        
        // 如果是全站通知且选择批量更新
        if (Boolean.TRUE.equals(request.getUpdateAll()) && originalNotification.getUserId() != 0) {
            throw new BusinessException(ErrorCode.INVALID_PARAMETER, "只有全站通知支持批量更新");
        }
        
        if (Boolean.TRUE.equals(request.getUpdateAll())) {
            // 批量更新所有相同标题的全站通知
            return updateGlobalNotifications(originalNotification, request);
        } else {
            // 单独更新指定通知
            return updateSingleNotification(id, request);
        }
    }
    
    /**
     * 批量更新全站通知
     */
    private Integer updateGlobalNotifications(Notification original, NotificationUpdateRequest request) {
        log.info("批量更新全站通知: originalTitle={}, newTitle={}", original.getTitle(), request.getTitle());
        
        // 查找所有相同标题、类型的全站通知（包括已删除的）
        List<Notification> notifications = notificationMapper.selectByTitleAndTypeWithDeleted(
            original.getTitle(),
            original.getType()
        );
        
        if (notifications.isEmpty()) {
            log.warn("未找到匹配的全站通知");
            return 0;
        }
        
        // 批量更新
        int count = 0;
        for (Notification notification : notifications) {
            notification.setType(request.getType());
            notification.setTitle(request.getTitle());
            notification.setContent(request.getContent());
            notification.setLinkUrl(request.getLinkUrl());
            notificationMapper.updateById(notification);
            count++;
        }
        
        log.info("批量更新全站通知完成: 更新数量={}", count);
        return count;
    }
    
    /**
     * 单独更新指定通知
     */
    private Integer updateSingleNotification(Long id, NotificationUpdateRequest request) {
        log.info("单独更新通知: id={}", id);
        
        // 查询通知（包括已删除的）
        Notification notification = notificationMapper.selectByIdWithDeleted(id);
        if (notification == null) {
            throw new BusinessException(ErrorCode.NOT_FOUND, "通知不存在");
        }
        
        notification.setType(request.getType());
        notification.setTitle(request.getTitle());
        notification.setContent(request.getContent());
        notification.setLinkUrl(request.getLinkUrl());
        
        int result = notificationMapper.updateById(notification);
        if (result == 0) {
            throw new BusinessException(ErrorCode.INTERNAL_ERROR, "更新通知失败");
        }
        
        log.info("通知更新成功: id={}", id);
        return 1;
    }
    
    @Override
    @Transactional(rollbackFor = Exception.class)
    public void restoreNotification(Long id) {
        log.info("恢复已删除通知: id={}", id);
        
        // 验证是否为管理员
        Long currentUserId = userContext.getCurrentUserId();
        if (currentUserId == null) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED);
        }
        
        User currentUser = userMapper.selectById(currentUserId);
        if (currentUser == null || currentUser.getPlanType() != 999) {
            throw new BusinessException(ErrorCode.FORBIDDEN, "只有管理员可以恢复通知");
        }
        
        // 检查通知是否存在且已被删除
        Notification notification = notificationMapper.selectByIdWithDeleted(id);
        if (notification == null) {
            throw new BusinessException(ErrorCode.NOT_FOUND, "通知不存在");
        }
        
        if (notification.getDeleted() == 0) {
            throw new BusinessException(ErrorCode.INVALID_PARAMETER, "通知未被删除，无需恢复");
        }
        
        // 全站通知：恢复同一批次的所有记录
        if (notification.getIsGlobal() == 1 && notification.getGlobalNotificationId() != null) {
            log.info("恢复全站通知批次: globalNotificationId={}", notification.getGlobalNotificationId());
            
            // 使用自定义方法查询已删除的通知（绕过 @TableLogic）
            List<Notification> allNotifications = notificationMapper.selectByTitleAndTypeWithDeleted(
                notification.getTitle(),
                notification.getType()
            );
            
            // 筛选同一批次且已删除的记录
            List<Notification> batchNotifications = allNotifications.stream()
                .filter(n -> notification.getGlobalNotificationId().equals(n.getGlobalNotificationId()) 
                          && n.getDeleted() == 1)
                .collect(Collectors.toList());
            
            // 批量恢复
            int restoredCount = 0;
            for (Notification notif : batchNotifications) {
                int result = notificationMapper.restoreById(notif.getId());
                if (result > 0) {
                    restoredCount++;
                }
            }
            
            log.info("全站通知批次恢复完成: globalNotificationId={}, 恢复数量={}", 
                notification.getGlobalNotificationId(), restoredCount);
        } else {
            // 个人通知：只恢复单条记录
            int result = notificationMapper.restoreById(id);
            if (result == 0) {
                throw new BusinessException(ErrorCode.INTERNAL_ERROR, "恢复通知失败");
            }
            
            log.info("通知恢复成功: id={}, userId={}", id, notification.getUserId());
        }
    }
    
    @Override
    @Transactional(rollbackFor = Exception.class)
    public Integer resendNotification(Long id) {
        // 验证是否为管理员
        Long currentUserId = userContext.getCurrentUserId();
        if (currentUserId == null) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED);
        }
        
        User currentUser = userMapper.selectById(currentUserId);
        if (currentUser == null || currentUser.getPlanType() != 999) {
            throw new BusinessException(ErrorCode.FORBIDDEN, "只有管理员可以重新发送通知");
        }
        
        // 查询原通知（包括已删除的）
        Notification originalNotification = notificationMapper.selectByIdWithDeleted(id);
        if (originalNotification == null) {
            throw new BusinessException(ErrorCode.NOT_FOUND, "通知不存在");
        }
        
        // 检查是否为已删除的通知
        if (originalNotification.getDeleted() == 0) {
            throw new BusinessException(ErrorCode.INVALID_PARAMETER, "只能重新发送已删除的通知");
        }
        
        // 判断是全站通知还是个人通知
        if (originalNotification.getIsGlobal() == 1) {
            // 全站通知：查询所有相同批次的已删除通知
            List<Notification> deletedNotifications;
            if (originalNotification.getGlobalNotificationId() != null) {
                // 使用自定义方法查询（绕过 @TableLogic）
                List<Notification> allNotifications = notificationMapper.selectByTitleAndTypeWithDeleted(
                    originalNotification.getTitle(),
                    originalNotification.getType()
                );
                // 筛选同一批次且已删除的记录
                deletedNotifications = allNotifications.stream()
                    .filter(n -> originalNotification.getGlobalNotificationId().equals(n.getGlobalNotificationId()) 
                              && n.getDeleted() == 1)
                    .collect(Collectors.toList());
            } else {
                // 兜底：按标题和类型查询（兼容旧数据）
                deletedNotifications = notificationMapper.selectByTitleAndTypeWithDeleted(
                    originalNotification.getTitle(), 
                    originalNotification.getType()
                );
                deletedNotifications = deletedNotifications.stream()
                    .filter(n -> n.getDeleted() == 1)
                    .collect(Collectors.toList());
            }
            
            int resendCount = 0;
            Long newGlobalNotificationId = null; // 新批次的ID
            
            for (int i = 0; i < deletedNotifications.size(); i++) {
                Notification notification = deletedNotifications.get(i);
                // 创建新的通知记录（重新发送）
                Notification newNotification = new Notification();
                newNotification.setUserId(notification.getUserId());
                newNotification.setIsGlobal(1);  // 设为全站通知
                newNotification.setType(notification.getType());
                newNotification.setTitle(notification.getTitle());
                newNotification.setContent(notification.getContent());
                newNotification.setLinkUrl(notification.getLinkUrl());
                newNotification.setIsRead(0); // 设为未读
                newNotification.setDeleted(0); // 设为未删除
                
                notificationMapper.insert(newNotification);
                
                if (i == 0) {
                    // 第一条记录：使用自己的ID作为新批次ID
                    newGlobalNotificationId = newNotification.getId();
                    newNotification.setGlobalNotificationId(newGlobalNotificationId);
                    notificationMapper.updateById(newNotification);
                } else {
                    // 后续记录：使用第一条记录的ID作为批次ID
                    newNotification.setGlobalNotificationId(newGlobalNotificationId);
                    notificationMapper.updateById(newNotification);
                }
                
                resendCount++;
            }
            
            log.info("重新发送全站通知成功: id={}, 发送数量={}", id, resendCount);
            return resendCount;
        } else {
            // 个人通知：只重新发送这一条
            Notification newNotification = new Notification();
            newNotification.setUserId(originalNotification.getUserId());
            newNotification.setIsGlobal(0);  // 设为个人通知
            newNotification.setType(originalNotification.getType());
            newNotification.setTitle(originalNotification.getTitle());
            newNotification.setContent(originalNotification.getContent());
            newNotification.setLinkUrl(originalNotification.getLinkUrl());
            newNotification.setIsRead(0); // 设为未读
            newNotification.setDeleted(0); // 设为未删除
            
            int result = notificationMapper.insert(newNotification);
            if (result == 0) {
                throw new BusinessException(ErrorCode.INTERNAL_ERROR, "重新发送通知失败");
            }
            
            log.info("重新发送个人通知成功: id={}", id);
            return 1;
        }
    }
}
