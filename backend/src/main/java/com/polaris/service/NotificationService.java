package com.polaris.service;

import com.polaris.common.base.BaseService;
import com.polaris.common.result.PageResult;
import com.polaris.dto.notification.NotificationCreateRequest;
import com.polaris.dto.notification.NotificationQueryRequest;
import com.polaris.dto.notification.NotificationResponse;
import com.polaris.dto.notification.NotificationUpdateRequest;
import com.polaris.entity.Notification;

/**
 * 通知服务接口
 */
public interface NotificationService extends BaseService<Notification, NotificationResponse, NotificationCreateRequest, NotificationUpdateRequest, NotificationQueryRequest> {
    
    /**
     * 获取用户通知列表
     * @param query 查询参数
     * @return 通知分页数据
     */
    PageResult<NotificationResponse> listUserNotifications(NotificationQueryRequest query);
    
    /**
     * 获取未读通知数量
     * @return 未读数量
     */
    Long getUnreadCount();
    
    /**
     * 标记通知为已读
     * @param id 通知ID
     */
    void markAsRead(Long id);
    
    /**
     * 标记所有通知为已读
     */
    void markAllAsRead();
    
    /**
     * 删除通知
     * @param id 通知ID
     */
    void deleteNotification(Long id);
    
    /**
     * 发送通知（管理员功能）
     * @param request 创建请求
     * @return 创建的通知数量（全站通知会为每个用户创建一条记录）
     */
    Long sendNotification(NotificationCreateRequest request);
    
    /**
     * 获取所有通知列表（管理员功能）
     * @param query 查询参数
     * @return 通知分页数据
     */
    PageResult<NotificationResponse> listAllNotifications(NotificationQueryRequest query);
    
    /**
     * 更新通知（管理员功能）
     * @param id 通知ID
     * @param request 更新请求
     * @return 更新的通知数量
     */
    Integer updateNotification(Long id, NotificationUpdateRequest request);
    
    /**
     * 恢复已删除的通知（管理员功能）
     * @param id 通知ID
     */
    void restoreNotification(Long id);
    
    /**
     * 重新发送已删除的通知（管理员功能）
     * @param id 通知ID
     * @return 发送成功的数量
     */
    Integer resendNotification(Long id);
}
