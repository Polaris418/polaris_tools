package com.polaris.controller;

import com.polaris.common.result.PageResult;
import com.polaris.common.result.Result;
import com.polaris.dto.tool.ToolResponse;
import com.polaris.dto.tool.ToolUsageResponse;
import com.polaris.service.UsageService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 使用统计 Controller
 */
@RestController
@RequestMapping("/api/v1/usage")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Usage Statistics", description = "使用统计 API")
public class UsageController {
    
    private final UsageService usageService;
    
    @GetMapping("/recent")
    @Operation(summary = "获取最近使用的工具", description = "获取当前用户最近使用的工具列表")
    public Result<List<ToolResponse>> getRecentTools(
            @Parameter(description = "限制数量，默认 10")
            @RequestParam(required = false, defaultValue = "10") Integer limit) {
        log.info("获取最近使用的工具, limit: {}", limit);
        List<ToolResponse> tools = usageService.getRecentTools(limit);
        return Result.success(tools);
    }
    
    @GetMapping("/popular")
    @Operation(summary = "获取热门工具", description = "获取按使用次数排序的热门工具列表")
    public Result<List<ToolResponse>> getPopularTools(
            @Parameter(description = "限制数量，默认 10")
            @RequestParam(required = false, defaultValue = "10") Integer limit) {
        log.info("获取热门工具, limit: {}", limit);
        List<ToolResponse> tools = usageService.getPopularTools(limit);
        return Result.success(tools);
    }
    
    @GetMapping("/history")
    @Operation(summary = "获取用户使用历史", description = "获取当前用户的工具使用历史记录（分页）")
    public Result<PageResult<ToolUsageResponse>> getUserHistory(
            @Parameter(description = "页码，默认 1")
            @RequestParam(required = false, defaultValue = "1") Integer page,
            @Parameter(description = "每页数量，默认 20")
            @RequestParam(required = false, defaultValue = "20") Integer size) {
        log.info("获取用户使用历史, page: {}, size: {}", page, size);
        PageResult<ToolUsageResponse> history = usageService.getUserHistory(page, size);
        return Result.success(history);
    }
}
