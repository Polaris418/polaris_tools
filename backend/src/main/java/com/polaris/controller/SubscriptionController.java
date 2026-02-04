package com.polaris.controller;

import com.polaris.common.result.Result;
import com.polaris.converter.SubscriptionConverter;
import com.polaris.dto.subscription.SubscriptionPreferenceRequest;
import com.polaris.dto.subscription.SubscriptionPreferenceResponse;
import com.polaris.dto.subscription.UnsubscribeRequest;
import com.polaris.entity.EmailType;
import com.polaris.entity.UserEmailPreference;
import com.polaris.security.UserContext;
import com.polaris.service.SubscriptionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * 邮件订阅管理控制器
 */
@Slf4j
@RestController
@RequestMapping("/api/subscription")
@RequiredArgsConstructor
@Tag(name = "邮件订阅管理", description = "管理用户的邮件订阅偏好")
public class SubscriptionController {
    
    private final SubscriptionService subscriptionService;
    private final SubscriptionConverter subscriptionConverter;
    private final UserContext userContext;
    
    /**
     * 获取当前用户的订阅偏好
     */
    @GetMapping("/preferences")
    @Operation(summary = "获取订阅偏好", description = "获取当前用户的所有邮件订阅偏好")
    public Result<List<SubscriptionPreferenceResponse>> getPreferences() {
        Long userId = userContext.getCurrentUserId();
        log.info("获取用户订阅偏好: userId={}", userId);
        
        List<UserEmailPreference> preferences = subscriptionService.getUserPreferences(userId);
        List<SubscriptionPreferenceResponse> responses = preferences.stream()
                .map(subscriptionConverter::toResponse)
                .collect(Collectors.toList());
        
        return Result.success(responses);
    }
    
    /**
     * 更新订阅偏好
     */
    @PutMapping("/preferences")
    @Operation(summary = "更新订阅偏好", description = "批量更新用户的邮件订阅偏好")
    public Result<String> updatePreferences(@RequestBody SubscriptionPreferenceRequest request) {
        Long userId = userContext.getCurrentUserId();
        log.info("更新用户订阅偏好: userId={}, preferences={}", userId, request.getPreferences());
        
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
     * 通过令牌退订（一键退订）
     */
    @PostMapping("/unsubscribe")
    @Operation(summary = "一键退订", description = "通过退订令牌退订邮件")
    public Result<String> unsubscribe(@RequestBody UnsubscribeRequest request) {
        log.info("处理退订请求: token={}", request.getToken());
        
        boolean success = subscriptionService.unsubscribeByToken(
                request.getToken(), 
                request.getReason()
        );
        
        if (success) {
            return Result.success("退订成功");
        } else {
            return Result.error(400, "退订失败，令牌无效或已过期");
        }
    }
    
    /**
     * 通过令牌退订（GET 方式，用于邮件链接）
     */
    @GetMapping("/unsubscribe")
    @Operation(summary = "一键退订（GET）", description = "通过 URL 参数退订邮件")
    public Result<String> unsubscribeByGet(@RequestParam("token") String token,
                                            @RequestParam(value = "reason", required = false) String reason) {
        log.info("处理退订请求（GET）: token={}", token);
        
        boolean success = subscriptionService.unsubscribeByToken(token, reason);
        
        if (success) {
            return Result.success("退订成功，您将不再收到此类邮件");
        } else {
            return Result.error(400, "退订失败，链接无效或已过期");
        }
    }
    
    /**
     * 获取订阅历史
     */
    @GetMapping("/history")
    @Operation(summary = "获取订阅历史", description = "获取用户的订阅变更历史")
    public Result<List<SubscriptionPreferenceResponse>> getHistory() {
        Long userId = userContext.getCurrentUserId();
        log.info("获取用户订阅历史: userId={}", userId);
        
        List<UserEmailPreference> history = subscriptionService.getSubscriptionHistory(userId);
        List<SubscriptionPreferenceResponse> responses = history.stream()
                .map(subscriptionConverter::toResponse)
                .collect(Collectors.toList());
        
        return Result.success(responses);
    }
    
}
