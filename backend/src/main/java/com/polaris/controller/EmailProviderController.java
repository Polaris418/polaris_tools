package com.polaris.controller;

import com.polaris.common.result.Result;
import com.polaris.security.RequireAdmin;
import com.polaris.service.EmailProviderManager;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

/**
 * 邮件服务提供商管理控制器
 */
@Slf4j
@Tag(name = "邮件服务提供商管理", description = "管理和切换邮件服务提供商")
@RestController
@RequestMapping("/api/admin/email-provider")
@RequireAdmin
@RequiredArgsConstructor
public class EmailProviderController {
    
    private final EmailProviderManager providerManager;
    
    /**
     * 获取当前使用的邮件服务提供商
     */
    @Operation(summary = "获取当前邮件服务提供商")
    @GetMapping("/current")
    public Result<EmailProviderInfo> getCurrentProvider() {
        try {
            String providerName = providerManager.getCurrentProviderName();
            Map<String, Boolean> providersStatus = providerManager.getProvidersStatus();
            
            EmailProviderInfo info = new EmailProviderInfo();
            info.setCurrent(providerName);
            info.setProvidersStatus(providersStatus);
            
            return Result.success(info);
        } catch (Exception e) {
            log.error("获取当前邮件服务提供商失败", e);
            return Result.error(500, "获取失败: " + e.getMessage());
        }
    }
    
    /**
     * 切换邮件服务提供商
     */
    @Operation(summary = "切换邮件服务提供商")
    @PostMapping("/switch")
    public Result<String> switchProvider(@RequestBody SwitchProviderRequest request) {
        try {
            String providerName = request.getProvider();
            
            if (providerName == null || providerName.isEmpty()) {
                return Result.error(400, "提供商名称不能为空");
            }
            
            // 验证提供商名称
            if (!providerName.equals("aws-ses") && !providerName.equals("resend")) {
                return Result.error(400, "无效的提供商名称，支持: aws-ses, resend");
            }
            
            boolean success = providerManager.switchProvider(providerName);
            
            if (success) {
                log.info("管理员切换邮件服务提供商: {}", providerName);
                return Result.success("成功切换到 " + providerName);
            } else {
                return Result.error(500, "切换失败，提供商可能不可用");
            }
        } catch (Exception e) {
            log.error("切换邮件服务提供商失败", e);
            return Result.error(500, "切换失败: " + e.getMessage());
        }
    }
    
    /**
     * 获取所有邮件服务提供商的状态
     */
    @Operation(summary = "获取所有提供商状态")
    @GetMapping("/status")
    public Result<Map<String, ProviderStatus>> getProvidersStatus() {
        try {
            Map<String, Boolean> statusMap = providerManager.getProvidersStatus();
            String currentProvider = providerManager.getCurrentProviderName();
            
            Map<String, ProviderStatus> result = new HashMap<>();
            
            for (Map.Entry<String, Boolean> entry : statusMap.entrySet()) {
                ProviderStatus status = new ProviderStatus();
                status.setName(entry.getKey());
                status.setAvailable(entry.getValue());
                status.setCurrent(entry.getKey().equals(currentProvider));
                status.setDisplayName(getDisplayName(entry.getKey()));
                result.put(entry.getKey(), status);
            }
            
            return Result.success(result);
        } catch (Exception e) {
            log.error("获取邮件服务提供商状态失败", e);
            return Result.error(500, "获取失败: " + e.getMessage());
        }
    }
    
    /**
     * 获取提供商的显示名称
     */
    private String getDisplayName(String providerName) {
        return switch (providerName) {
            case "aws-ses" -> "AWS SES";
            case "resend" -> "Resend";
            default -> providerName;
        };
    }
    
    // DTO Classes
    
    @Data
    public static class EmailProviderInfo {
        private String current;
        private Map<String, Boolean> providersStatus;
    }
    
    @Data
    public static class SwitchProviderRequest {
        private String provider;
    }
    
    @Data
    public static class ProviderStatus {
        private String name;
        private String displayName;
        private boolean available;
        private boolean current;
    }
}
