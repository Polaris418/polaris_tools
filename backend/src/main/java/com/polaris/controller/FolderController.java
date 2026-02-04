package com.polaris.controller;

import com.polaris.common.base.BaseController;
import com.polaris.common.base.BaseService;
import com.polaris.common.result.Result;
import com.polaris.dto.FolderCreateRequest;
import com.polaris.dto.FolderQueryRequest;
import com.polaris.dto.FolderResponse;
import com.polaris.dto.FolderUpdateRequest;
import com.polaris.entity.DocumentFolder;
import com.polaris.service.FolderService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 文件夹管理控制器
 */
@RestController
@RequestMapping("/api/v1/folders")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Folder Management", description = "文件夹管理 API")
public class FolderController extends BaseController<DocumentFolder, FolderResponse, 
        FolderCreateRequest, FolderUpdateRequest, FolderQueryRequest> {
    
    private final FolderService folderService;
    
    @Override
    protected BaseService<DocumentFolder, FolderResponse, FolderCreateRequest, 
            FolderUpdateRequest, FolderQueryRequest> getService() {
        return folderService;
    }
    
    @Override
    protected String getResourceName() {
        return "文件夹";
    }
    
    // ==================== 自定义端点 ====================
    
    /**
     * 获取文件夹树
     */
    @GetMapping("/tree")
    @Operation(summary = "获取文件夹树", description = "获取当前用户的完整文件夹树结构")
    public Result<List<FolderResponse>> getFolderTree() {
        log.info("获取文件夹树");
        List<FolderResponse> tree = folderService.getFolderTree();
        return Result.success(tree);
    }
    
    /**
     * 获取子文件夹
     */
    @GetMapping("/children")
    @Operation(summary = "获取子文件夹", description = "获取指定文件夹的子文件夹列表")
    public Result<List<FolderResponse>> getSubFolders(
            @Parameter(description = "父文件夹 ID（不填则获取根目录）") 
            @RequestParam(required = false) Long parentId) {
        log.info("获取子文件夹: parentId={}", parentId);
        List<FolderResponse> folders = folderService.getSubFolders(parentId);
        return Result.success(folders);
    }
    
    /**
     * 移动文件夹
     */
    @PostMapping("/{id}/move")
    @Operation(summary = "移动文件夹", description = "将文件夹移动到新的父文件夹")
    public Result<FolderResponse> moveFolder(
            @Parameter(description = "文件夹 ID") @PathVariable Long id,
            @Parameter(description = "新的父文件夹 ID（不填则移动到根目录）") 
            @RequestParam(required = false) Long newParentId) {
        log.info("移动文件夹: id={}, newParentId={}", id, newParentId);
        FolderResponse response = folderService.moveFolder(id, newParentId);
        return Result.success(response);
    }
}
