package com.polaris.controller;

import com.polaris.common.result.Result;
import com.polaris.dto.ToolResponse;
import com.polaris.service.FavoriteService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 收藏管理 Controller
 * 
 * 注意：此控制器不继承 BaseController，因为其 API 契约与 BaseController 提供的标准 CRUD 端点不同。
 * 收藏功能的特殊性在于：
 * 1. GET / 返回的是 ToolResponse 列表而不是 FavoriteResponse 的分页结果
 * 2. POST / 使用简化的请求格式（Map）而不是标准的 FavoriteCreateRequest
 * 3. DELETE /{toolId} 使用 toolId 而不是收藏记录的 id
 * 
 * 如果强制继承 BaseController，会导致 Spring 检测到重复的路径映射而启动失败。
 * 这是一个合理的设计决策，符合"不强制所有文件都继承基类"的原则。
 */
@RestController
@RequestMapping("/api/v1/favorites")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Favorite Management", description = "收藏管理 API")
public class FavoriteController {
    
    private final FavoriteService favoriteService;
    
    @GetMapping
    @Operation(summary = "获取用户收藏列表", description = "获取当前用户的收藏列表，按时间降序排序")
    public Result<List<ToolResponse>> listFavorites() {
        log.info("获取用户收藏列表");
        List<ToolResponse> favorites = favoriteService.listFavorites();
        return Result.success(favorites);
    }
    
    @PostMapping
    @Operation(summary = "添加收藏", description = "添加工具到收藏列表")
    public Result<Void> addFavorite(@RequestBody Map<String, Long> request) {
        Long toolId = request.get("toolId");
        log.info("添加收藏, toolId: {}", toolId);
        favoriteService.addFavorite(toolId);
        return Result.success(null);
    }
    
    @DeleteMapping("/{toolId}")
    @Operation(summary = "取消收藏", description = "从收藏列表中移除工具")
    public Result<Void> removeFavorite(@PathVariable Long toolId) {
        log.info("取消收藏, toolId: {}", toolId);
        favoriteService.removeFavorite(toolId);
        return Result.success(null);
    }
    
    @GetMapping("/check/{toolId}")
    @Operation(summary = "检查是否已收藏", description = "检查当前用户是否已收藏指定工具")
    public Result<Boolean> checkFavorite(@PathVariable Long toolId) {
        log.info("检查是否已收藏, toolId: {}", toolId);
        boolean isFavorited = favoriteService.isFavorited(toolId);
        return Result.success(isFavorited);
    }
}
