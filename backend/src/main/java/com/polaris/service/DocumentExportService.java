package com.polaris.service;

import com.polaris.dto.ExportRequest;
import com.polaris.dto.ExportResponse;

import java.util.List;

/**
 * 文档导出服务接口
 * 提供 Markdown 到 DOCX/PDF/HTML 的转换功能
 */
public interface DocumentExportService {
    
    /**
     * 导出单个文档
     * 
     * @param documentId 文档 ID
     * @param format 导出格式 (docx, pdf, html)
     * @param template 模板名称
     * @return 导出结果（包含文件数据）
     */
    ExportResponse exportDocument(Long documentId, String format, String template);
    
    /**
     * 批量导出文档
     * 
     * @param request 批量导出请求
     * @return 导出结果列表
     */
    List<ExportResponse> batchExport(ExportRequest request);
    
    /**
     * 批量导出并打包为 ZIP
     * 
     * @param request 批量导出请求
     * @return ZIP 文件字节数组
     */
    byte[] batchExportAsZip(ExportRequest request);
    
    /**
     * 将 Markdown 转换为 HTML
     * 
     * @param markdown Markdown 内容
     * @return HTML 内容
     */
    String markdownToHtml(String markdown);
    
    /**
     * 将 Markdown 转换为 DOCX 字节数组
     * 
     * @param markdown Markdown 内容
     * @param template 模板名称
     * @return DOCX 文件字节数组
     */
    byte[] markdownToDocx(String markdown, String template);
    
    /**
     * 将 Markdown 转换为 PDF 字节数组
     * 
     * @param markdown Markdown 内容
     * @param template 模板名称
     * @return PDF 文件字节数组
     */
    byte[] markdownToPdf(String markdown, String template);
}
