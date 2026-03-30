package com.polaris.controller;

import com.polaris.common.result.Result;
import com.polaris.dto.document.VersionResponse;
import com.polaris.service.VersionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 版本历史控制器
 * 提供文档版本管理 API
 * 
 * 注意：此控制器不继承 BaseController，因为其 API 契约与 BaseController 提供的标准 CRUD 端点不同。
 * 版本管理的特殊性在于：
 * 1. 路径是嵌套资源：/api/documents/{documentId}/versions，而不是独立的顶级资源
 * 2. 使用版本号（versionNumber）而不是数据库 ID 来标识版本
 * 3. 有多个特殊端点（/restore、/compare）不符合标准 CRUD 模式
 * 4. 所有操作都需要 documentId 上下文，方法签名与 BaseController 不匹配
 * 
 * 如果强制继承 BaseController，会导致：
 * - 路径冲突：BaseController 的 GET /{id} 与 GET /{versionNumber} 冲突
 * - 参数不匹配：BaseController 的方法签名无法满足版本管理的需求
 * - Spring 检测到重复的路径映射而启动失败
 * 
 * 这是一个合理的设计决策，符合"不强制所有文件都继承基类"的原则。
 * 
 * 详见：.kiro/specs/backend-architecture-completion/VERSIONCONTROLLER_REFACTORING_DECISION.md
 */
@Tag(name = "版本历史", description = "文档版本历史管理")
@RestController
@RequestMapping("/api/documents/{documentId}/versions")
@RequiredArgsConstructor
@Slf4j
public class VersionController {
    
    private final VersionService versionService;
    
    /**
     * 获取文档版本历史列表
     */
    @Operation(summary = "获取版本历史", description = "获取指定文档的所有版本历史")
    @GetMapping
    public Result<List<VersionResponse>> getVersionHistory(
            @Parameter(description = "文档 ID") @PathVariable Long documentId) {
        log.info("获取文档版本历史: documentId={}", documentId);
        List<VersionResponse> versions = versionService.getVersionHistory(documentId);
        return Result.success(versions);
    }
    
    /**
     * 获取指定版本详情
     */
    @Operation(summary = "获取版本详情", description = "获取指定版本的详细内容")
    @GetMapping("/{versionNumber}")
    public Result<VersionResponse> getVersion(
            @Parameter(description = "文档 ID") @PathVariable Long documentId,
            @Parameter(description = "版本号") @PathVariable Integer versionNumber) {
        log.info("获取文档版本: documentId={}, versionNumber={}", documentId, versionNumber);
        VersionResponse version = versionService.getVersion(documentId, versionNumber);
        return Result.success(version);
    }
    
    /**
     * 恢复到指定版本
     */
    @Operation(summary = "恢复版本", description = "将文档恢复到指定版本")
    @PostMapping("/{versionNumber}/restore")
    public Result<VersionResponse> restoreVersion(
            @Parameter(description = "文档 ID") @PathVariable Long documentId,
            @Parameter(description = "版本号") @PathVariable Integer versionNumber) {
        log.info("恢复文档版本: documentId={}, versionNumber={}", documentId, versionNumber);
        VersionResponse version = versionService.restoreVersion(documentId, versionNumber);
        return Result.success(version);
    }
    
    /**
     * 手动创建版本
     */
    @Operation(summary = "创建版本", description = "手动创建当前文档的版本快照")
    @PostMapping
    public Result<VersionResponse> createVersion(
            @Parameter(description = "文档 ID") @PathVariable Long documentId,
            @Parameter(description = "版本备注") @RequestParam(required = false, defaultValue = "手动保存") String comment) {
        log.info("创建文档版本: documentId={}, comment={}", documentId, comment);
        VersionResponse version = versionService.createVersion(documentId, comment);
        return Result.success(version);
    }
    
    /**
     * 比较两个版本
     */
    @Operation(summary = "比较版本", description = "比较两个版本之间的差异")
    @GetMapping("/compare")
    public Result<String> compareVersions(
            @Parameter(description = "文档 ID") @PathVariable Long documentId,
            @Parameter(description = "版本 A") @RequestParam Integer versionA,
            @Parameter(description = "版本 B") @RequestParam Integer versionB) {
        log.info("比较版本: documentId={}, versionA={}, versionB={}", documentId, versionA, versionB);
        String diff = versionService.compareVersions(documentId, versionA, versionB);
        return Result.success(diff);
    }
}
