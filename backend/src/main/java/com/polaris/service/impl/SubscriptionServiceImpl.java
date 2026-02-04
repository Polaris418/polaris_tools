package com.polaris.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.polaris.entity.EmailType;
import com.polaris.entity.UserEmailPreference;
import com.polaris.mapper.UserEmailPreferenceMapper;
import com.polaris.service.SubscriptionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * 邮件订阅服务实现
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SubscriptionServiceImpl implements SubscriptionService {
    
    private final UserEmailPreferenceMapper preferenceMapper;
    
    @Override
    public List<UserEmailPreference> getUserPreferences(Long userId) {
        log.debug("查询用户订阅偏好: userId={}", userId);
        
        List<UserEmailPreference> preferences = preferenceMapper.findByUserId(userId);
        
        // 如果用户没有任何偏好设置，初始化默认偏好
        if (preferences.isEmpty()) {
            initializeDefaultPreferences(userId);
            preferences = preferenceMapper.findByUserId(userId);
        }
        
        return preferences;
    }
    
    @Override
    public boolean isSubscribed(Long userId, EmailType emailType) {
        // 事务性邮件始终视为已订阅
        if (emailType.isTransactional()) {
            return true;
        }
        
        UserEmailPreference preference = preferenceMapper.findByUserIdAndEmailType(
                userId, emailType.getCode());
        
        // 如果没有找到偏好设置，默认为已订阅
        if (preference == null) {
            log.debug("用户 {} 没有 {} 类型的订阅偏好，默认为已订阅", userId, emailType.getCode());
            return true;
        }
        
        return preference.getSubscribed();
    }
    
    @Override
    @Transactional
    public UserEmailPreference updateSubscription(Long userId, EmailType emailType, 
                                                   boolean subscribed, String reason) {
        log.info("更新用户订阅偏好: userId={}, emailType={}, subscribed={}", 
                userId, emailType.getCode(), subscribed);
        
        // 事务性邮件不允许退订
        if (emailType.isTransactional()) {
            log.warn("尝试退订事务性邮件，操作被拒绝: userId={}, emailType={}", userId, emailType.getCode());
            throw new IllegalArgumentException("事务性邮件不允许退订");
        }
        
        UserEmailPreference preference = preferenceMapper.findByUserIdAndEmailType(
                userId, emailType.getCode());
        
        if (preference == null) {
            // 创建新的偏好设置
            preference = new UserEmailPreference();
            preference.setUserId(userId);
            preference.setEmailType(emailType.getCode());
            preference.setSubscribed(subscribed);
            
            if (!subscribed) {
                preference.setUnsubscribedAt(LocalDateTime.now());
                preference.setUnsubscribeReason(reason);
                preference.setUnsubscribeToken(generateUnsubscribeToken(userId, emailType));
            }
            
            preferenceMapper.insert(preference);
            log.info("创建新的订阅偏好: userId={}, emailType={}, subscribed={}", 
                    userId, emailType.getCode(), subscribed);
        } else {
            // 更新现有偏好设置
            preference.setSubscribed(subscribed);
            
            if (!subscribed) {
                preference.setUnsubscribedAt(LocalDateTime.now());
                preference.setUnsubscribeReason(reason);
                if (preference.getUnsubscribeToken() == null) {
                    preference.setUnsubscribeToken(generateUnsubscribeToken(userId, emailType));
                }
            } else {
                // 重新订阅时清除退订信息
                preference.setUnsubscribedAt(null);
                preference.setUnsubscribeReason(null);
            }
            
            preferenceMapper.updateById(preference);
            log.info("更新订阅偏好: userId={}, emailType={}, subscribed={}", 
                    userId, emailType.getCode(), subscribed);
        }
        
        return preference;
    }
    
    @Override
    @Transactional
    public void updateSubscriptions(Long userId, Map<EmailType, Boolean> preferences) {
        log.info("批量更新用户订阅偏好: userId={}, count={}", userId, preferences.size());
        
        for (Map.Entry<EmailType, Boolean> entry : preferences.entrySet()) {
            EmailType emailType = entry.getKey();
            Boolean subscribed = entry.getValue();
            
            // 跳过事务性邮件
            if (emailType.isTransactional()) {
                continue;
            }
            
            updateSubscription(userId, emailType, subscribed, null);
        }
    }
    
    @Override
    @Transactional
    public boolean unsubscribeByToken(String token, String reason) {
        log.info("通过令牌退订: token={}", token);
        
        UserEmailPreference preference = preferenceMapper.findByUnsubscribeToken(token);
        
        if (preference == null) {
            log.warn("未找到对应的订阅偏好: token={}", token);
            return false;
        }
        
        // 检查是否为事务性邮件
        EmailType emailType = EmailType.fromCode(preference.getEmailType());
        if (emailType.isTransactional()) {
            log.warn("尝试退订事务性邮件，操作被拒绝: token={}, emailType={}", 
                    token, preference.getEmailType());
            return false;
        }
        
        preference.setSubscribed(false);
        preference.setUnsubscribedAt(LocalDateTime.now());
        preference.setUnsubscribeReason(reason);
        
        preferenceMapper.updateById(preference);
        
        log.info("退订成功: userId={}, emailType={}", preference.getUserId(), preference.getEmailType());
        return true;
    }
    
    @Override
    public String generateUnsubscribeToken(Long userId, EmailType emailType) {
        // 生成唯一的退订令牌
        String token = UUID.randomUUID().toString().replace("-", "");
        log.debug("生成退订令牌: userId={}, emailType={}, token={}", userId, emailType.getCode(), token);
        return token;
    }
    
    @Override
    @Transactional
    public void initializeDefaultPreferences(Long userId) {
        log.info("初始化用户默认订阅偏好: userId={}", userId);
        
        // 为所有可订阅的邮件类型创建默认偏好（全部订阅）
        for (EmailType emailType : EmailType.values()) {
            // 跳过事务性邮件
            if (emailType.isTransactional()) {
                continue;
            }
            
            // 检查是否已存在
            UserEmailPreference existing = preferenceMapper.findByUserIdAndEmailType(
                    userId, emailType.getCode());
            
            if (existing == null) {
                UserEmailPreference preference = new UserEmailPreference();
                preference.setUserId(userId);
                preference.setEmailType(emailType.getCode());
                preference.setSubscribed(true);
                preference.setUnsubscribeToken(generateUnsubscribeToken(userId, emailType));
                
                preferenceMapper.insert(preference);
                log.debug("创建默认订阅偏好: userId={}, emailType={}", userId, emailType.getCode());
            }
        }
    }
    
    @Override
    public List<UserEmailPreference> getSubscriptionHistory(Long userId) {
        log.debug("查询用户订阅历史: userId={}", userId);
        
        // 查询所有记录，包括已删除的
        LambdaQueryWrapper<UserEmailPreference> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(UserEmailPreference::getUserId, userId);
        wrapper.orderByDesc(UserEmailPreference::getUpdatedAt);
        
        return preferenceMapper.selectList(wrapper);
    }
    
    @Override
    public Map<String, Object> getSubscriptionStats() {
        log.debug("获取订阅统计信息");
        
        Map<String, Object> stats = new HashMap<>();
        
        // 获取所有用户的订阅偏好
        List<UserEmailPreference> allPreferences = preferenceMapper.selectList(
                new LambdaQueryWrapper<UserEmailPreference>()
                        .eq(UserEmailPreference::getDeleted, 0)
        );
        
        // 按用户分组统计
        Map<Long, List<UserEmailPreference>> byUser = allPreferences.stream()
                .collect(Collectors.groupingBy(UserEmailPreference::getUserId));
        
        // 统计订阅用户数（至少订阅一种邮件类型）
        long totalSubscribers = byUser.values().stream()
                .filter(prefs -> prefs.stream().anyMatch(UserEmailPreference::getSubscribed))
                .count();
        
        // 统计各类邮件的订阅数和订阅率
        long systemNotificationsCount = allPreferences.stream()
                .filter(p -> "SYSTEM_NOTIFICATION".equals(p.getEmailType()) && p.getSubscribed())
                .count();
        long marketingEmailsCount = allPreferences.stream()
                .filter(p -> "MARKETING".equals(p.getEmailType()) && p.getSubscribed())
                .count();
        long productUpdatesCount = allPreferences.stream()
                .filter(p -> "PRODUCT_UPDATE".equals(p.getEmailType()) && p.getSubscribed())
                .count();
        
        long totalUsers = byUser.size();
        double systemNotificationsRate = totalUsers > 0 ? (double) systemNotificationsCount / totalUsers * 100 : 0;
        double marketingEmailsRate = totalUsers > 0 ? (double) marketingEmailsCount / totalUsers * 100 : 0;
        double productUpdatesRate = totalUsers > 0 ? (double) productUpdatesCount / totalUsers * 100 : 0;
        
        stats.put("totalSubscribers", totalSubscribers);
        stats.put("systemNotificationsRate", systemNotificationsRate);
        stats.put("marketingEmailsRate", marketingEmailsRate);
        stats.put("productUpdatesRate", productUpdatesRate);
        
        return stats;
    }
    
    @Override
    public Map<String, Object> getSubscriptionAnalytics() {
        log.debug("获取订阅分析数据");
        
        Map<String, Object> analytics = new HashMap<>();
        
        // 总退订数
        long totalUnsubscribes = preferenceMapper.selectCount(
                new LambdaQueryWrapper<UserEmailPreference>()
                        .eq(UserEmailPreference::getSubscribed, false)
                        .eq(UserEmailPreference::getDeleted, 0)
        );
        
        // 本周退订数
        LocalDateTime weekAgo = LocalDateTime.now().minusDays(7);
        long weekUnsubscribes = preferenceMapper.selectCount(
                new LambdaQueryWrapper<UserEmailPreference>()
                        .eq(UserEmailPreference::getSubscribed, false)
                        .ge(UserEmailPreference::getUnsubscribedAt, weekAgo)
                        .eq(UserEmailPreference::getDeleted, 0)
        );
        
        // 退订率
        long totalPreferences = preferenceMapper.selectCount(
                new LambdaQueryWrapper<UserEmailPreference>()
                        .eq(UserEmailPreference::getDeleted, 0)
        );
        
        double unsubscribeRate = totalPreferences > 0 
                ? (double) totalUnsubscribes / totalPreferences * 100 
                : 0.0;
        
        // 退订原因统计
        List<UserEmailPreference> unsubscribedPrefs = preferenceMapper.selectList(
                new LambdaQueryWrapper<UserEmailPreference>()
                        .eq(UserEmailPreference::getSubscribed, false)
                        .isNotNull(UserEmailPreference::getUnsubscribeReason)
                        .eq(UserEmailPreference::getDeleted, 0)
        );
        
        Map<String, Long> reasonStats = unsubscribedPrefs.stream()
                .collect(Collectors.groupingBy(
                        p -> p.getUnsubscribeReason() != null ? p.getUnsubscribeReason() : "未指定",
                        Collectors.counting()
                ));
        
        analytics.put("totalUnsubscribes", totalUnsubscribes);
        analytics.put("weekUnsubscribes", weekUnsubscribes);
        analytics.put("unsubscribeRate", unsubscribeRate);
        analytics.put("reasonStats", reasonStats);
        
        return analytics;
    }
    
    @Override
    public com.polaris.common.result.PageResult<UserEmailPreference> getSubscriptionList(
            Integer page, Integer size, String emailType, Boolean subscribed) {
        log.debug("获取订阅列表: page={}, size={}, emailType={}, subscribed={}", 
                page, size, emailType, subscribed);
        
        LambdaQueryWrapper<UserEmailPreference> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(UserEmailPreference::getDeleted, 0);
        
        if (emailType != null && !emailType.isEmpty()) {
            wrapper.eq(UserEmailPreference::getEmailType, emailType);
        }
        
        if (subscribed != null) {
            wrapper.eq(UserEmailPreference::getSubscribed, subscribed);
        }
        
        wrapper.orderByDesc(UserEmailPreference::getUpdatedAt);
        
        // 分页查询
        long offset = (long) (page - 1) * size;
        wrapper.last("LIMIT " + offset + ", " + size);
        
        List<UserEmailPreference> records = preferenceMapper.selectList(wrapper);
        
        // 获取总数
        LambdaQueryWrapper<UserEmailPreference> countWrapper = new LambdaQueryWrapper<>();
        countWrapper.eq(UserEmailPreference::getDeleted, 0);
        
        if (emailType != null && !emailType.isEmpty()) {
            countWrapper.eq(UserEmailPreference::getEmailType, emailType);
        }
        
        if (subscribed != null) {
            countWrapper.eq(UserEmailPreference::getSubscribed, subscribed);
        }
        
        long total = preferenceMapper.selectCount(countWrapper);
        long pages = (total + size - 1) / size;
        
        com.polaris.common.result.PageResult<UserEmailPreference> result = 
                new com.polaris.common.result.PageResult<>();
        result.setList(records);
        result.setTotal(total);
        result.setPages(pages);
        result.setPageNum(page);
        result.setPageSize(size);
        
        return result;
    }
}
