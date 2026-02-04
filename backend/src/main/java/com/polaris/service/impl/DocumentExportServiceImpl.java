package com.polaris.service.impl;

import com.openhtmltopdf.pdfboxout.PdfRendererBuilder;
import com.polaris.common.exception.BusinessException;
import com.polaris.common.exception.ErrorCode;
import com.polaris.dto.ExportRequest;
import com.polaris.dto.ExportResponse;
import com.polaris.entity.DocumentExport;
import com.polaris.entity.User;
import com.polaris.entity.UserDocument;
import com.polaris.mapper.DocumentExportMapper;
import com.polaris.mapper.DocumentMapper;
import com.polaris.mapper.UserMapper;
import com.polaris.security.UserContext;
import com.polaris.service.DocumentExportService;
import com.vladsch.flexmark.ext.gfm.strikethrough.StrikethroughExtension;
import com.vladsch.flexmark.ext.tables.TablesExtension;
import com.vladsch.flexmark.ext.toc.TocExtension;
import com.vladsch.flexmark.html.HtmlRenderer;
import com.vladsch.flexmark.parser.Parser;
import com.vladsch.flexmark.util.ast.Node;
import com.vladsch.flexmark.util.data.MutableDataSet;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.compress.archivers.zip.ZipArchiveEntry;
import org.apache.commons.compress.archivers.zip.ZipArchiveOutputStream;
import org.docx4j.openpackaging.packages.WordprocessingMLPackage;
import org.docx4j.openpackaging.parts.WordprocessingML.MainDocumentPart;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.time.LocalDateTime;
import java.util.*;

/**
 * 文档导出服务实现类
 * 支持 Markdown 到 DOCX/PDF/HTML 的转换
 */
@Service
@Slf4j
public class DocumentExportServiceImpl implements DocumentExportService {
    
    private final DocumentMapper documentMapper;
    private final DocumentExportMapper exportMapper;
    private final UserMapper userMapper;
    private final UserContext userContext;
    
    // Markdown 解析器和渲染器
    private final Parser markdownParser;
    private final HtmlRenderer htmlRenderer;
    
    // 批量导出限制
    private static final int FREE_USER_BATCH_LIMIT = 3;
    private static final int PRO_USER_BATCH_LIMIT = 20;
    
    /**
     * 构造函数 - 初始化依赖和 Markdown 解析器
     */
    public DocumentExportServiceImpl(DocumentMapper documentMapper, 
                                     DocumentExportMapper exportMapper,
                                     UserMapper userMapper, 
                                     UserContext userContext) {
        this.documentMapper = documentMapper;
        this.exportMapper = exportMapper;
        this.userMapper = userMapper;
        this.userContext = userContext;
        
        // 初始化 Markdown 解析器
        MutableDataSet options = new MutableDataSet();
        options.set(Parser.EXTENSIONS, Arrays.asList(
                TablesExtension.create(),
                StrikethroughExtension.create(),
                TocExtension.create()
        ));
        this.markdownParser = Parser.builder(options).build();
        this.htmlRenderer = HtmlRenderer.builder(options).build();
    }
    
    @Override
    @Transactional(rollbackFor = Exception.class)
    public ExportResponse exportDocument(Long documentId, String format, String template) {
        Long userId = getCurrentUserId();
        
        // 获取文档
        UserDocument document = getDocumentWithPermissionCheck(documentId, userId);
        
        // 执行转换
        byte[] fileData;
        switch (format.toLowerCase()) {
            case "docx":
                fileData = markdownToDocx(document.getContent(), template);
                break;
            case "pdf":
                fileData = markdownToPdf(document.getContent(), template);
                break;
            case "html":
                fileData = markdownToHtml(document.getContent()).getBytes();
                break;
            default:
                throw new BusinessException(ErrorCode.INVALID_PARAMETER, "不支持的导出格式: " + format);
        }
        
        // 记录导出
        DocumentExport exportRecord = new DocumentExport();
        exportRecord.setDocumentId(documentId);
        exportRecord.setUserId(userId);
        exportRecord.setFormat(format);
        exportRecord.setFileSize((long) fileData.length);
        exportMapper.insert(exportRecord);
        
        // 更新文档导出计数
        documentMapper.incrementExportCount(documentId);
        
        log.info("导出文档成功: documentId={}, format={}, size={}", documentId, format, fileData.length);
        
        // 构建响应
        ExportResponse response = new ExportResponse();
        response.setId(exportRecord.getId());
        response.setDocumentId(documentId);
        response.setUserId(userId);
        response.setFormat(format);
        response.setFileSize((long) fileData.length);
        response.setCreatedAt(LocalDateTime.now());
        
        return response;
    }
    
    @Override
    @Transactional(rollbackFor = Exception.class)
    public List<ExportResponse> batchExport(ExportRequest request) {
        Long userId = getCurrentUserId();
        
        // 检查批量导出限制
        checkBatchLimit(userId, request.getDocumentIds().size());
        
        List<ExportResponse> results = new ArrayList<>();
        String batchId = UUID.randomUUID().toString();
        
        for (Long documentId : request.getDocumentIds()) {
            try {
                ExportResponse response = exportDocument(documentId, request.getFormat(), "corporate");
                response.setBatchId(batchId);
                results.add(response);
            } catch (Exception e) {
                log.error("批量导出文档失败: documentId={}, error={}", documentId, e.getMessage());
                // 继续处理其他文档
            }
        }
        
        return results;
    }
    
    @Override
    @Transactional(rollbackFor = Exception.class)
    public byte[] batchExportAsZip(ExportRequest request) {
        Long userId = getCurrentUserId();
        
        // 检查批量导出限制
        checkBatchLimit(userId, request.getDocumentIds().size());
        
        try (ByteArrayOutputStream baos = new ByteArrayOutputStream();
             ZipArchiveOutputStream zipOut = new ZipArchiveOutputStream(baos)) {
            
            String batchId = UUID.randomUUID().toString();
            
            for (Long documentId : request.getDocumentIds()) {
                try {
                    UserDocument document = getDocumentWithPermissionCheck(documentId, userId);
                    
                    // 转换文档
                    byte[] fileData;
                    String extension;
                    switch (request.getFormat().toLowerCase()) {
                        case "docx":
                            fileData = markdownToDocx(document.getContent(), "corporate");
                            extension = ".docx";
                            break;
                        case "pdf":
                            fileData = markdownToPdf(document.getContent(), "corporate");
                            extension = ".pdf";
                            break;
                        case "html":
                            fileData = markdownToHtml(document.getContent()).getBytes();
                            extension = ".html";
                            break;
                        default:
                            continue;
                    }
                    
                    // 添加到 ZIP
                    String fileName = sanitizeFileName(document.getTitle()) + extension;
                    ZipArchiveEntry entry = new ZipArchiveEntry(fileName);
                    entry.setSize(fileData.length);
                    zipOut.putArchiveEntry(entry);
                    zipOut.write(fileData);
                    zipOut.closeArchiveEntry();
                    
                    // 记录导出
                    DocumentExport exportRecord = new DocumentExport();
                    exportRecord.setDocumentId(documentId);
                    exportRecord.setUserId(userId);
                    exportRecord.setFormat(request.getFormat());
                    exportRecord.setFileSize((long) fileData.length);
                    exportRecord.setBatchId(batchId);
                    exportMapper.insert(exportRecord);
                    
                    documentMapper.incrementExportCount(documentId);
                    
                } catch (Exception e) {
                    log.error("批量导出文档失败: documentId={}, error={}", documentId, e.getMessage());
                }
            }
            
            zipOut.finish();
            return baos.toByteArray();
            
        } catch (Exception e) {
            log.error("创建 ZIP 文件失败: {}", e.getMessage());
            throw new BusinessException(ErrorCode.INTERNAL_ERROR, "创建 ZIP 文件失败");
        }
    }
    
    @Override
    public String markdownToHtml(String markdown) {
        if (markdown == null || markdown.isEmpty()) {
            return "";
        }
        
        Node document = markdownParser.parse(markdown);
        String htmlContent = htmlRenderer.render(document);
        
        // 包装为完整 HTML
        return wrapHtml(htmlContent, "corporate");
    }
    
    @Override
    public byte[] markdownToDocx(String markdown, String template) {
        if (markdown == null || markdown.isEmpty()) {
            markdown = "";
        }
        
        try {
            // 创建 Word 文档
            WordprocessingMLPackage wordPackage = WordprocessingMLPackage.createPackage();
            MainDocumentPart mainPart = wordPackage.getMainDocumentPart();
            
            // 解析 Markdown 并添加内容
            String[] lines = markdown.split("\n");
            for (String line : lines) {
                if (line.startsWith("# ")) {
                    // H1 标题
                    mainPart.addStyledParagraphOfText("Heading1", line.substring(2));
                } else if (line.startsWith("## ")) {
                    // H2 标题
                    mainPart.addStyledParagraphOfText("Heading2", line.substring(3));
                } else if (line.startsWith("### ")) {
                    // H3 标题
                    mainPart.addStyledParagraphOfText("Heading3", line.substring(4));
                } else if (line.startsWith("- ") || line.startsWith("* ")) {
                    // 列表项
                    mainPart.addParagraphOfText("• " + line.substring(2));
                } else if (line.startsWith("> ")) {
                    // 引用
                    mainPart.addParagraphOfText("  " + line.substring(2));
                } else if (line.startsWith("```")) {
                    // 代码块开始/结束（简化处理）
                    continue;
                } else if (!line.trim().isEmpty()) {
                    // 普通段落
                    // 处理粗体和斜体
                    String processedLine = line
                            .replaceAll("\\*\\*(.+?)\\*\\*", "$1")
                            .replaceAll("\\*(.+?)\\*", "$1")
                            .replaceAll("`(.+?)`", "$1");
                    mainPart.addParagraphOfText(processedLine);
                }
            }
            
            // 导出为字节数组
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            wordPackage.save(baos);
            return baos.toByteArray();
            
        } catch (Exception e) {
            log.error("Markdown 转 DOCX 失败: {}", e.getMessage(), e);
            throw new BusinessException(ErrorCode.INTERNAL_ERROR, "文档转换失败: " + e.getMessage());
        }
    }
    
    @Override
    public byte[] markdownToPdf(String markdown, String template) {
        if (markdown == null || markdown.isEmpty()) {
            markdown = "";
        }
        
        try {
            // 先转换为 HTML
            String html = markdownToHtml(markdown);
            
            // HTML 转 PDF
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            PdfRendererBuilder builder = new PdfRendererBuilder();
            builder.useFastMode();
            builder.withHtmlContent(html, null);
            builder.toStream(baos);
            builder.run();
            
            return baos.toByteArray();
            
        } catch (Exception e) {
            log.error("Markdown 转 PDF 失败: {}", e.getMessage(), e);
            throw new BusinessException(ErrorCode.INTERNAL_ERROR, "PDF 转换失败: " + e.getMessage());
        }
    }
    
    // ==================== 私有辅助方法 ====================
    
    /**
     * 获取当前用户 ID
     */
    private Long getCurrentUserId() {
        Long userId = userContext.getCurrentUserId();
        if (userId == null) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED);
        }
        return userId;
    }
    
    /**
     * 获取文档并检查权限
     */
    private UserDocument getDocumentWithPermissionCheck(Long documentId, Long userId) {
        UserDocument document = documentMapper.selectById(documentId);
        if (document == null) {
            throw new BusinessException(ErrorCode.INVALID_PARAMETER, "文档不存在");
        }
        if (!document.getUserId().equals(userId)) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED, "无权访问该文档");
        }
        return document;
    }
    
    /**
     * 检查批量导出限制
     */
    private void checkBatchLimit(Long userId, int count) {
        User user = userMapper.selectById(userId);
        if (user == null) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED);
        }
        
        int limit = (user.getPlanType() != null && user.getPlanType() >= 1) 
                ? PRO_USER_BATCH_LIMIT 
                : FREE_USER_BATCH_LIMIT;
        
        if (count > limit) {
            throw new BusinessException(
                    ErrorCode.INVALID_PARAMETER, 
                    String.format("批量导出数量超出限制（最多 %d 个，当前 %d 个）", limit, count)
            );
        }
    }
    
    /**
     * 包装 HTML 内容为完整文档
     */
    private String wrapHtml(String content, String template) {
        String css = getTemplateCss(template);
        return """
                <!DOCTYPE html>
                <html lang="zh-CN">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Document</title>
                    <style>
                        %s
                    </style>
                </head>
                <body>
                    <div class="container">
                        %s
                    </div>
                </body>
                </html>
                """.formatted(css, content);
    }
    
    /**
     * 获取模板 CSS
     */
    private String getTemplateCss(String template) {
        // 基础样式
        String baseCss = """
                body {
                    font-family: 'Microsoft YaHei', 'SimSun', Arial, sans-serif;
                    line-height: 1.8;
                    color: #333;
                    max-width: 800px;
                    margin: 0 auto;
                    padding: 40px 20px;
                }
                h1 { font-size: 28px; margin-top: 32px; margin-bottom: 16px; border-bottom: 2px solid #333; padding-bottom: 8px; }
                h2 { font-size: 24px; margin-top: 28px; margin-bottom: 14px; }
                h3 { font-size: 20px; margin-top: 24px; margin-bottom: 12px; }
                p { margin-bottom: 16px; text-align: justify; }
                ul, ol { padding-left: 24px; margin-bottom: 16px; }
                li { margin-bottom: 8px; }
                code { background: #f5f5f5; padding: 2px 6px; border-radius: 4px; font-family: Consolas, monospace; }
                pre { background: #f5f5f5; padding: 16px; border-radius: 8px; overflow-x: auto; }
                pre code { background: none; padding: 0; }
                blockquote { border-left: 4px solid #ddd; padding-left: 16px; color: #666; margin: 16px 0; }
                table { border-collapse: collapse; width: 100%; margin-bottom: 16px; }
                th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
                th { background: #f5f5f5; font-weight: bold; }
                """;
        
        // 根据模板添加额外样式
        return switch (template) {
            case "academic" -> baseCss + """
                    body { font-family: 'SimSun', serif; }
                    p { text-indent: 2em; }
                    """;
            case "technical" -> baseCss + """
                    code { background: #1e1e1e; color: #d4d4d4; }
                    pre { background: #1e1e1e; color: #d4d4d4; }
                    """;
            default -> baseCss;
        };
    }
    
    /**
     * 清理文件名（移除非法字符）
     */
    private String sanitizeFileName(String fileName) {
        if (fileName == null || fileName.isEmpty()) {
            return "untitled";
        }
        return fileName.replaceAll("[\\\\/:*?\"<>|]", "_");
    }
}
