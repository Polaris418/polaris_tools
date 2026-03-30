package com.polaris.controller;

import com.polaris.common.result.PageResult;
import com.polaris.common.result.Result;
import com.polaris.converter.SubscriptionConverter;
import com.polaris.dto.subscription.SubscriptionPreferenceRequest;
import com.polaris.email.entity.EmailType;
import com.polaris.entity.User;
import com.polaris.entity.UserEmailPreference;
import com.polaris.mapper.UserMapper;
import com.polaris.auth.security.RequireAdmin;
import com.polaris.service.SubscriptionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.ByteArrayOutputStream;
import java.io.OutputStreamWriter;
import java.nio.charset.StandardCharsets;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

/**
 * 管理员订阅管理控制器
 */
@Slf4j
@RestController
@RequestMapping("/api/admin/subscriptions")
@RequireAdmin
@RequiredArgsConstructor
@Tag(name = "管理员订阅管理", description = "管理员管理用户的邮件订阅")
public class AdminSubscriptionController {
    
    private final SubscriptionService subscriptionService;
    private final SubscriptionConverter subscriptionConverter;
    private final UserMapper userMapper;
    
    /**
     * 获取订阅统计信息
     */
    @GetMapping("/stats")
    @Operation(summary = "获取订阅统计", description = "管理员获取订阅统计信息")
    public Result<Map<String, Object>> getSubscriptionStats() {
        log.info("管理员获取订阅统计");
        
        Map<String, Object> stats = subscriptionService.getSubscriptionStats();
        
        return Result.success(stats);
    }
    
    /**
     * 获取订阅分析数据
     */
    @GetMapping("/analytics")
    @Operation(summary = "获取订阅分析", description = "管理员获取订阅分析数据")
    public Result<Map<String, Object>> getSubscriptionAnalytics() {
        log.info("管理员获取订阅分析");
        
        Map<String, Object> analytics = subscriptionService.getSubscriptionAnalytics();
        
        return Result.success(analytics);
    }
    
    /**
     * 获取订阅列表（按用户聚合）
     */
    @GetMapping
    @Operation(summary = "获取订阅列表", description = "管理员获取所有用户的订阅列表")
    public Result<PageResult<Map<String, Object>>> getSubscriptionList(
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "20") Integer size,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String subscriptionStatus) {
        log.info("管理员获取订阅列表: page={}, size={}, keyword={}, subscriptionStatus={}", 
                page, size, keyword, subscriptionStatus);
        
        // 获取所有用户
        List<User> allUsers = userMapper.selectList(null);
        
        // 过滤用户
        List<User> filteredUsers = allUsers.stream()
                .filter(user -> keyword == null || keyword.isEmpty() || 
                        user.getUsername().contains(keyword) || 
                        user.getEmail().contains(keyword))
                .collect(Collectors.toList());
        
        // 分页
        int start = (page - 1) * size;
        int end = Math.min(start + size, filteredUsers.size());
        List<User> pagedUsers = filteredUsers.subList(start, end);
        
        // 构建响应
        List<Map<String, Object>> records = new ArrayList<>();
        for (User user : pagedUsers) {
            List<UserEmailPreference> preferences = subscriptionService.getUserPreferences(user.getId());
            
            Map<String, Object> record = new HashMap<>();
            record.put("userId", user.getId());
            record.put("username", user.getUsername());
            record.put("email", user.getEmail());
            
            // 获取各类邮件的订阅状态
            boolean systemNotifications = preferences.stream()
                    .anyMatch(p -> "SYSTEM_NOTIFICATION".equals(p.getEmailType()) && p.getSubscribed());
            boolean marketingEmails = preferences.stream()
                    .anyMatch(p -> "MARKETING".equals(p.getEmailType()) && p.getSubscribed());
            boolean productUpdates = preferences.stream()
                    .anyMatch(p -> "PRODUCT_UPDATE".equals(p.getEmailType()) && p.getSubscribed());
            
            record.put("systemNotifications", systemNotifications);
            record.put("marketingEmails", marketingEmails);
            record.put("productUpdates", productUpdates);
            
            // 最后更新时间
            String updatedAt = preferences.stream()
                    .map(p -> p.getUpdatedAt())
                    .max(Comparator.naturalOrder())
                    .map(dt -> dt.toString())
                    .orElse(user.getCreatedAt().toString());
            record.put("updatedAt", updatedAt);
            
            // 根据订阅状态过滤
            if (subscriptionStatus != null && !subscriptionStatus.isEmpty()) {
                boolean allSubscribed = systemNotifications && marketingEmails && productUpdates;
                boolean allUnsubscribed = !systemNotifications && !marketingEmails && !productUpdates;
                boolean partialSubscribed = !allSubscribed && !allUnsubscribed;
                
                if ("all_subscribed".equals(subscriptionStatus) && !allSubscribed) continue;
                if ("all_unsubscribed".equals(subscriptionStatus) && !allUnsubscribed) continue;
                if ("partial_subscribed".equals(subscriptionStatus) && !partialSubscribed) continue;
            }
            
            records.add(record);
        }
        
        PageResult<Map<String, Object>> result = new PageResult<>();
        result.setList(records);
        result.setTotal((long) filteredUsers.size());
        result.setPageNum(page);
        result.setPageSize(size);
        result.setPages((long) Math.ceil((double) filteredUsers.size() / size));
        
        return Result.success(result);
    }
    
    /**
     * 获取单个用户的订阅详情
     */
    @GetMapping("/{userId}")
    @Operation(summary = "获取用户订阅详情", description = "管理员获取指定用户的订阅详情")
    public Result<Map<String, Object>> getUserSubscription(@PathVariable Long userId) {
        log.info("管理员获取用户订阅详情: userId={}", userId);
        
        User user = userMapper.selectById(userId);
        if (user == null) {
            return Result.error(404, "用户不存在");
        }
        
        List<UserEmailPreference> preferences = subscriptionService.getUserPreferences(userId);
        List<UserEmailPreference> history = subscriptionService.getSubscriptionHistory(userId);
        
        Map<String, Object> response = new HashMap<>();
        response.put("userId", user.getId());
        response.put("username", user.getUsername());
        response.put("email", user.getEmail());
        
        // 获取各类邮件的订阅状态
        boolean systemNotifications = preferences.stream()
                .anyMatch(p -> "SYSTEM_NOTIFICATION".equals(p.getEmailType()) && p.getSubscribed());
        boolean marketingEmails = preferences.stream()
                .anyMatch(p -> "MARKETING".equals(p.getEmailType()) && p.getSubscribed());
        boolean productUpdates = preferences.stream()
                .anyMatch(p -> "PRODUCT_UPDATE".equals(p.getEmailType()) && p.getSubscribed());
        
        response.put("systemNotifications", systemNotifications);
        response.put("marketingEmails", marketingEmails);
        response.put("productUpdates", productUpdates);
        
        // 最后更新时间
        String updatedAt = preferences.stream()
                .map(p -> p.getUpdatedAt())
                .max(Comparator.naturalOrder())
                .map(dt -> dt.toString())
                .orElse(user.getCreatedAt().toString());
        response.put("updatedAt", updatedAt);
        
        // 订阅历史
        List<Map<String, Object>> historyRecords = history.stream()
                .map(h -> {
                    Map<String, Object> record = new HashMap<>();
                    record.put("action", h.getSubscribed() ? "订阅" : "退订");
                    record.put("emailType", h.getEmailType());
                    record.put("timestamp", h.getUpdatedAt().toString());
                    if (!h.getSubscribed() && h.getUnsubscribeReason() != null) {
                        record.put("reason", h.getUnsubscribeReason());
                    }
                    return record;
                })
                .collect(Collectors.toList());
        response.put("history", historyRecords);
        
        return Result.success(response);
    }
    
    /**
     * 更新用户订阅偏好（管理员）
     */
    @PutMapping("/{userId}")
    @Operation(summary = "更新用户订阅偏好", description = "管理员更新指定用户的订阅偏好")
    public Result<String> updateUserSubscription(
            @PathVariable Long userId,
            @RequestBody SubscriptionPreferenceRequest request) {
        log.info("管理员更新用户订阅偏好: userId={}, preferences={}", userId, request.getPreferences());
        
        // 转换为 EmailType 映射
        Map<EmailType, Boolean> preferences = new HashMap<>();
        for (Map.Entry<String, Boolean> entry : request.getPreferences().entrySet()) {
            EmailType emailType = EmailType.fromCode(entry.getKey());
            preferences.put(emailType, entry.getValue());
        }
        
        subscriptionService.updateSubscriptions(userId, preferences);
        
        return Result.success("订阅偏好更新成功");
    }
    
    /**
     * 导出订阅数据
     */
    @GetMapping("/export")
    @Operation(summary = "导出订阅数据", description = "导出用户订阅数据为 CSV")
    public ResponseEntity<byte[]> exportSubscriptions(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String subscriptionStatus) {
        log.info("导出订阅数据: keyword={}, subscriptionStatus={}", keyword, subscriptionStatus);
        
        try {
            // 获取所有用户
            List<User> allUsers = userMapper.selectList(null);
            
            // 过滤用户
            List<User> filteredUsers = allUsers.stream()
                    .filter(user -> keyword == null || keyword.isEmpty() || 
                            user.getUsername().contains(keyword) || 
                            user.getEmail().contains(keyword))
                    .collect(Collectors.toList());
            
            // 生成 CSV
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            OutputStreamWriter writer = new OutputStreamWriter(baos, StandardCharsets.UTF_8);
            
            // 写入 BOM 以支持 Excel 正确识别 UTF-8
            writer.write('\ufeff');
            
            // 写入表头
            writer.write("用户ID,用户名,邮箱,系统通知,营销邮件,产品更新,最后更新时间\n");
            
            // 写入数据
            DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
            for (User user : filteredUsers) {
                List<UserEmailPreference> preferences = subscriptionService.getUserPreferences(user.getId());
                
                boolean systemNotifications = preferences.stream()
                        .anyMatch(p -> "SYSTEM_NOTIFICATION".equals(p.getEmailType()) && p.getSubscribed());
                boolean marketingEmails = preferences.stream()
                        .anyMatch(p -> "MARKETING".equals(p.getEmailType()) && p.getSubscribed());
                boolean productUpdates = preferences.stream()
                        .anyMatch(p -> "PRODUCT_UPDATE".equals(p.getEmailType()) && p.getSubscribed());
                
                String updatedAt = preferences.stream()
                        .map(p -> p.getUpdatedAt())
                        .max(Comparator.naturalOrder())
                        .map(dt -> dt.format(formatter))
                        .orElse(user.getCreatedAt().format(formatter));
                
                writer.write(String.format("%d,%s,%s,%s,%s,%s,%s\n",
                        user.getId(),
                        user.getUsername(),
                        user.getEmail(),
                        systemNotifications ? "是" : "否",
                        marketingEmails ? "是" : "否",
                        productUpdates ? "是" : "否",
                        updatedAt));
            }
            
            writer.flush();
            writer.close();
            
            byte[] data = baos.toByteArray();
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.parseMediaType("text/csv"));
            headers.setContentDispositionFormData("attachment", 
                    "subscriptions-" + System.currentTimeMillis() + ".csv");
            headers.setContentLength(data.length);
            
            return ResponseEntity.ok()
                    .headers(headers)
                    .body(data);
                    
        } catch (Exception e) {
            log.error("导出订阅数据失败", e);
            return ResponseEntity.internalServerError().build();
        }
    }
}
