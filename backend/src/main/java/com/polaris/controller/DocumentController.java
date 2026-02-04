package com.polaris.controller;

import com.polaris.common.base.BaseController;
import com.polaris.common.base.BaseService;
import com.polaris.common.result.Result;
import com.polaris.dto.DocumentCreateRequest;
import com.polaris.dto.DocumentQueryRequest;
import com.polaris.dto.DocumentResponse;
import com.polaris.dto.DocumentUpdateRequest;
import com.polaris.entity.UserDocument;
import com.polaris.service.DocumentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 文档管理控制器
 * 继承 BaseController 获得标准 REST API 端点
 */
@RestController
@RequestMapping("/api/v1/documents")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Document Management", description = "文档管理 API")
public class DocumentController extends BaseController<UserDocument, DocumentResponse, DocumentCreateRequest, DocumentUpdateRequest, DocumentQueryRequest> {
    
    private final DocumentService documentService;
    
    // ==================== BaseController 必需方法 ====================
    
    @Override
    protected BaseService<UserDocument, DocumentResponse, DocumentCreateRequest, DocumentUpdateRequest, DocumentQueryRequest> getService() {
        return documentService;
    }
    
    @Override
    protected String getResourceName() {
        return "文档";
    }
    
    // ==================== 自定义端点 ====================
    
    /**
     * 搜索文档
     */
    @GetMapping("/search")
    @Operation(summary = "搜索文档", description = "全文搜索文档，支持文件夹和标签过滤")
    public Result<List<DocumentResponse>> searchDocuments(
            @Parameter(description = "关键词") @RequestParam(required = false) String keyword,
            @Parameter(description = "文件夹 ID") @RequestParam(required = false) Long folderId,
            @Parameter(description = "标签（逗号分隔）") @RequestParam(required = false) String tags) {
        log.info("搜索文档: keyword={}, folderId={}, tags={}", keyword, folderId, tags);
        List<DocumentResponse> documents = documentService.searchDocuments(keyword, folderId, tags);
        return Result.success(documents);
    }
    
    /**
     * 标记为模板
     */
    @PostMapping("/{id}/template")
    @Operation(summary = "标记为模板", description = "将文档标记为模板")
    public Result<DocumentResponse> markAsTemplate(@PathVariable Long id) {
        log.info("标记文档为模板: id={}", id);
        DocumentResponse response = documentService.markAsTemplate(id);
        return Result.success(response);
    }
    
    /**
     * 从模板创建文档
     */
    @PostMapping("/from-template/{templateId}")
    @Operation(summary = "从模板创建文档", description = "复制模板内容创建新文档")
    public Result<DocumentResponse> createFromTemplate(@PathVariable Long templateId) {
        log.info("从模板创建文档: templateId={}", templateId);
        DocumentResponse response = documentService.createFromTemplate(templateId);
        return Result.success(response);
    }
    
    /**
     * 记录文档浏览
     */
    @PostMapping("/{id}/view")
    @Operation(summary = "记录文档浏览", description = "增加文档浏览计数")
    public Result<Void> recordView(@PathVariable Long id) {
        log.info("记录文档浏览: id={}", id);
        documentService.incrementViewCount(id);
        return Result.success();
    }
}
