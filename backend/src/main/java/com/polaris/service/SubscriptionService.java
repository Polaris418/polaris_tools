package com.polaris.service;

import com.polaris.email.entity.EmailType;
import com.polaris.entity.UserEmailPreference;

import java.util.List;
import java.util.Map;

/**
 * 邮件订阅服务接口
 */
public interface SubscriptionService {
    
    /**
     * 查询用户的订阅偏好
     * 
     * @param userId 用户 ID
     * @return 订阅偏好列表
     */
    List<UserEmailPreference> getUserPreferences(Long userId);
    
    /**
     * 查询用户对特定邮件类型的订阅状态
     * 
     * @param userId 用户 ID
     * @param emailType 邮件类型
     * @return 是否订阅（默认为 true）
     */
    boolean isSubscribed(Long userId, EmailType emailType);
    
    /**
     * 更新用户的订阅偏好
     * 
     * @param userId 用户 ID
     * @param emailType 邮件类型
     * @param subscribed 是否订阅
     * @param reason 退订原因（可选）
     * @return 更新后的订阅偏好
     */
    UserEmailPreference updateSubscription(Long userId, EmailType emailType, boolean subscribed, String reason);
    
    /**
     * 批量更新用户的订阅偏好
     * 
     * @param userId 用户 ID
     * @param preferences 订阅偏好映射（邮件类型 -> 是否订阅）
     */
    void updateSubscriptions(Long userId, Map<EmailType, Boolean> preferences);
    
    /**
     * 通过退订令牌退订
     * 
     * @param token 退订令牌
     * @param reason 退订原因（可选）
     * @return 是否成功
     */
    boolean unsubscribeByToken(String token, String reason);
    
    /**
     * 生成退订令牌
     * 
     * @param userId 用户 ID
     * @param emailType 邮件类型
     * @return 退订令牌
     */
    String generateUnsubscribeToken(Long userId, EmailType emailType);
    
    /**
     * 初始化用户的默认订阅偏好
     * 当新用户注册时调用
     * 
     * @param userId 用户 ID
     */
    void initializeDefaultPreferences(Long userId);
    
    /**
     * 获取用户的订阅历史
     * 
     * @param userId 用户 ID
     * @return 订阅历史列表（包括已删除的记录）
     */
    List<UserEmailPreference> getSubscriptionHistory(Long userId);
    
    /**
     * 获取订阅统计信息（管理员）
     * 
     * @return 统计信息
     */
    Map<String, Object> getSubscriptionStats();
    
    /**
     * 获取订阅分析数据（管理员）
     * 
     * @return 分析数据
     */
    Map<String, Object> getSubscriptionAnalytics();
    
    /**
     * 获取订阅列表（管理员）
     * 
     * @param page 页码
     * @param size 每页大小
     * @param emailType 邮件类型过滤
     * @param subscribed 订阅状态过滤
     * @return 分页结果
     */
    com.polaris.common.result.PageResult<UserEmailPreference> getSubscriptionList(
            Integer page, Integer size, String emailType, Boolean subscribed);
}
