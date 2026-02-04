package com.polaris.controller;

import com.polaris.common.result.Result;
import com.polaris.dto.ExportRequest;
import com.polaris.dto.ExportResponse;
import com.polaris.dto.ExportMarkdownRequest;
import com.polaris.entity.UserDocument;
import com.polaris.mapper.DocumentMapper;
import com.polaris.security.UserContext;
import com.polaris.service.DocumentExportService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.List;

/**
 * 文档导出控制器
 * 提供 Markdown 到 DOCX/PDF/HTML 的转换 API
 */
@RestController
@RequestMapping("/api/v1/documents")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Document Export", description = "文档导出 API")
public class DocumentExportController {
    
    private final DocumentExportService exportService;
    private final DocumentMapper documentMapper;
    private final UserContext userContext;
    
    /**
     * 导出单个文档
     */
    @PostMapping("/{id}/export")
    @Operation(summary = "导出文档", description = "将文档导出为指定格式 (docx, pdf, html)")
    public ResponseEntity<byte[]> exportDocument(
            @Parameter(description = "文档 ID") @PathVariable Long id,
            @Parameter(description = "导出格式") @RequestParam(defaultValue = "docx") String format,
            @Parameter(description = "模板名称") @RequestParam(defaultValue = "corporate") String template) {
        
        log.info("导出文档: id={}, format={}, template={}", id, format, template);
        
        // 获取文档信息用于文件名
        UserDocument document = documentMapper.selectById(id);
        String fileName = (document != null ? document.getTitle() : "document") + "." + format;
        
        // 执行导出
        byte[] fileData;
        String contentType;
        
        switch (format.toLowerCase()) {
            case "docx":
                fileData = exportService.markdownToDocx(
                        document != null ? document.getContent() : "", template);
                contentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
                break;
            case "pdf":
                fileData = exportService.markdownToPdf(
                        document != null ? document.getContent() : "", template);
                contentType = "application/pdf";
                break;
            case "html":
                fileData = exportService.markdownToHtml(
                        document != null ? document.getContent() : "").getBytes(StandardCharsets.UTF_8);
                contentType = "text/html";
                break;
            default:
                return ResponseEntity.badRequest().build();
        }
        
        // 记录导出（如果登录）
        if (userContext.getCurrentUserId() != null && document != null) {
            exportService.exportDocument(id, format, template);
        }
        
        // 返回文件
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, 
                        "attachment; filename*=UTF-8''" + URLEncoder.encode(fileName, StandardCharsets.UTF_8))
                .contentType(MediaType.parseMediaType(contentType))
                .contentLength(fileData.length)
                .body(fileData);
    }
    
    /**
     * 批量导出文档（返回 JSON 结果）
     */
    @PostMapping("/batch-export")
    @Operation(summary = "批量导出文档", description = "批量导出多个文档")
    public Result<List<ExportResponse>> batchExport(@Valid @RequestBody ExportRequest request) {
        log.info("批量导出文档: count={}, format={}", request.getDocumentIds().size(), request.getFormat());
        
        List<ExportResponse> results = exportService.batchExport(request);
        return Result.success(results);
    }
    
    /**
     * 批量导出并下载 ZIP
     */
    @PostMapping("/batch-export/download")
    @Operation(summary = "批量导出并下载", description = "批量导出多个文档并打包为 ZIP 下载")
    public ResponseEntity<byte[]> batchExportDownload(@Valid @RequestBody ExportRequest request) {
        log.info("批量导出下载: count={}, format={}", request.getDocumentIds().size(), request.getFormat());
        
        byte[] zipData = exportService.batchExportAsZip(request);
        
        String fileName = "documents_export_" + System.currentTimeMillis() + ".zip";
        
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, 
                        "attachment; filename*=UTF-8''" + URLEncoder.encode(fileName, StandardCharsets.UTF_8))
                .contentType(MediaType.parseMediaType("application/zip"))
                .contentLength(zipData.length)
                .body(zipData);
    }
    
    /**
     * 预览 Markdown 转 HTML
     */
    @PostMapping("/preview")
    @Operation(summary = "预览 HTML", description = "将 Markdown 转换为 HTML 预览")
    public Result<String> previewHtml(@RequestBody String markdown) {
        log.debug("预览 Markdown: length={}", markdown != null ? markdown.length() : 0);
        
        String html = exportService.markdownToHtml(markdown);
        return Result.success(html);
    }
    
    /**
     * 直接导出 Markdown 内容（无需保存为文档）
     */
    @PostMapping("/export-markdown")
    @Operation(summary = "导出 Markdown", description = "直接导出 Markdown 内容为指定格式")
    public ResponseEntity<byte[]> exportMarkdown(@RequestBody ExportMarkdownRequest request) {
        log.info("导出 Markdown: format={}, template={}, fileName={}", 
                request.getFormat(), request.getTemplate(), request.getFileName());
        
        String markdown = request.getMarkdown();
        String format = request.getFormat();
        String template = request.getTemplate() != null ? request.getTemplate() : "corporate";
        String fileName = request.getFileName() != null ? request.getFileName() : "document";
        
        // 执行导出
        byte[] fileData;
        String contentType;
        
        switch (format.toLowerCase()) {
            case "docx":
                fileData = exportService.markdownToDocx(markdown, template);
                contentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
                fileName = fileName + ".docx";
                break;
            case "pdf":
                fileData = exportService.markdownToPdf(markdown, template);
                contentType = "application/pdf";
                fileName = fileName + ".pdf";
                break;
            case "html":
                fileData = exportService.markdownToHtml(markdown).getBytes(StandardCharsets.UTF_8);
                contentType = "text/html";
                fileName = fileName + ".html";
                break;
            default:
                return ResponseEntity.badRequest().build();
        }
        
        // 返回文件
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, 
                        "attachment; filename*=UTF-8''" + URLEncoder.encode(fileName, StandardCharsets.UTF_8))
                .contentType(MediaType.parseMediaType(contentType))
                .contentLength(fileData.length)
                .body(fileData);
    }
}
