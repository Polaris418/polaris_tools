package com.polaris.controller;

import com.polaris.ai.dto.AiProviderConfigRequest;
import com.polaris.ai.dto.AiProviderConfigResponse;
import com.polaris.ai.dto.AiProviderConnectionTestResponse;
import com.polaris.ai.dto.AiProviderMonitoringDashboardResponse;
import com.polaris.ai.service.AiProviderConfigService;
import com.polaris.ai.service.AiProviderMonitoringService;
import com.polaris.auth.security.RequireAdmin;
import com.polaris.common.result.Result;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * AI 提供商管理控制器
 */
@RestController
@RequestMapping("/api/v1/admin/ai-providers")
@RequireAdmin
@RequiredArgsConstructor
@Tag(name = "AI Provider Management", description = "AI 提供商配置管理接口")
public class AiProviderAdminController {

    private final AiProviderConfigService configService;
    private final AiProviderMonitoringService monitoringService;

    @GetMapping
    @Operation(summary = "获取 AI 提供商配置列表")
    public Result<List<AiProviderConfigResponse>> list() {
        return Result.success(configService.listAll());
    }

    @GetMapping("/monitoring")
    @Operation(summary = "获取 AI 提供商监控视图")
    public Result<AiProviderMonitoringDashboardResponse> monitoring(
            @RequestParam(required = false) Integer hours,
            @RequestParam(required = false) Long providerId
    ) {
        return Result.success(monitoringService.getDashboard(hours, providerId));
    }

    @GetMapping("/{id}")
    @Operation(summary = "获取 AI 提供商配置详情")
    public Result<AiProviderConfigResponse> detail(@PathVariable Long id) {
        return Result.success(configService.getById(id));
    }

    @PostMapping
    @Operation(summary = "创建 AI 提供商配置")
    public Result<AiProviderConfigResponse> create(@Valid @RequestBody AiProviderConfigRequest request) {
        return Result.success(configService.create(request));
    }

    @PutMapping("/{id}")
    @Operation(summary = "更新 AI 提供商配置")
    public Result<AiProviderConfigResponse> update(@PathVariable Long id, @Valid @RequestBody AiProviderConfigRequest request) {
        return Result.success(configService.update(id, request));
    }

    @PostMapping("/{id}/status")
    @Operation(summary = "更新 AI 提供商启用状态")
    public Result<AiProviderConfigResponse> updateStatus(@PathVariable Long id, @RequestParam boolean enabled) {
        return Result.success(configService.updateEnabled(id, enabled));
    }

    @PostMapping("/{id}/set-primary")
    @Operation(summary = "设置 AI 主用提供商")
    public Result<AiProviderConfigResponse> setPrimary(@PathVariable Long id) {
        return Result.success(configService.setPrimary(id));
    }

    @PostMapping("/{id}/test-connection")
    @Operation(summary = "测试 AI 提供商连接")
    public Result<AiProviderConnectionTestResponse> testConnection(@PathVariable Long id) {
        return Result.success(configService.testConnection(id));
    }
}
