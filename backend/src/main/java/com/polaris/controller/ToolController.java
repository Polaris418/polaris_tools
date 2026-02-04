package com.polaris.controller;

import com.polaris.common.base.BaseController;
import com.polaris.common.base.BaseService;
import com.polaris.common.result.Result;
import com.polaris.dto.ToolCreateRequest;
import com.polaris.dto.ToolQueryRequest;
import com.polaris.dto.ToolResponse;
import com.polaris.dto.ToolUpdateRequest;
import com.polaris.entity.Tool;
import com.polaris.service.ToolService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

/**
 * 工具管理控制器
 * 继承 BaseController 获得标准 REST API 端点
 */
@RestController
@RequestMapping("/api/v1/tools")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Tool Management", description = "工具管理 API")
public class ToolController extends BaseController<Tool, ToolResponse, ToolCreateRequest, ToolUpdateRequest, ToolQueryRequest> {
    
    private final ToolService toolService;
    
    // ==================== BaseController 必需方法 ====================
    
    @Override
    protected BaseService<Tool, ToolResponse, ToolCreateRequest, ToolUpdateRequest, ToolQueryRequest> getService() {
        return toolService;
    }
    
    @Override
    protected String getResourceName() {
        return "工具";
    }
    
    // ==================== 自定义端点 ====================
    
    /**
     * 记录工具浏览
     */
    @PostMapping("/{id}/view")
    @Operation(summary = "记录工具浏览", description = "增加工具浏览计数")
    public Result<Void> recordView(@PathVariable Long id) {
        log.info("记录工具浏览: id={}", id);
        toolService.incrementViewCount(id);
        return Result.success();
    }
    
    /**
     * 记录工具使用
     * 支持匿名用户（Authorization header 可选）
     */
    @PostMapping("/{id}/use")
    @Operation(summary = "记录工具使用", description = "记录工具使用并增加使用计数（支持匿名用户）")
    public Result<Void> recordUse(
            @PathVariable Long id, 
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            HttpServletRequest request) {
        log.info("记录工具使用: id={}, hasAuth={}", id, authHeader != null);
        toolService.recordToolUsage(id, authHeader, request);
        return Result.success();
    }
    
    /**
     * 通过工具 URL 记录使用
     * 支持匿名用户（Authorization header 可选）
     * 返回使用记录 ID，用于后续更新使用时长
     */
    @PostMapping("/use-by-url")
    @Operation(summary = "通过 URL 记录工具使用", description = "通过工具 URL 记录使用（支持匿名用户），返回记录ID")
    public Result<Long> recordUseByUrl(
            @RequestParam String url,
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            HttpServletRequest request) {
        log.info("通过 URL 记录工具使用: url={}, hasAuth={}", url, authHeader != null);
        Long usageId = toolService.recordToolUsageByUrl(url, authHeader, request);
        return Result.success(usageId);
    }
    
    /**
     * 更新工具使用时长
     */
    @PutMapping("/usage/{usageId}/duration")
    @Operation(summary = "更新使用时长", description = "更新工具使用记录的使用时长（秒）")
    public Result<Void> updateUsageDuration(
            @PathVariable Long usageId,
            @RequestParam Integer duration) {
        log.info("更新使用时长: usageId={}, duration={}s", usageId, duration);
        toolService.updateUsageDuration(usageId, duration);
        return Result.success();
    }
}
