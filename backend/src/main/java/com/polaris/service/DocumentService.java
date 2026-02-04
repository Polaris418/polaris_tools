package com.polaris.service;

import com.polaris.common.base.BaseService;
import com.polaris.dto.DocumentCreateRequest;
import com.polaris.dto.DocumentQueryRequest;
import com.polaris.dto.DocumentResponse;
import com.polaris.dto.DocumentUpdateRequest;
import com.polaris.entity.UserDocument;

import java.util.List;

/**
 * 文档服务接口
 * 继承 BaseService 获得标准 CRUD 操作
 */
public interface DocumentService extends BaseService<UserDocument, DocumentResponse, 
                                                      DocumentCreateRequest, DocumentUpdateRequest, 
                                                      DocumentQueryRequest> {
    
    // ==================== 扩展方法（MD2Word 特有功能） ====================
    
    /**
     * 搜索文档（全文搜索，支持文件夹和标签过滤）
     * 
     * @param keyword 关键词
     * @param folderId 文件夹 ID
     * @param tags 标签
     * @return 文档列表
     */
    List<DocumentResponse> searchDocuments(String keyword, Long folderId, String tags);
    
    /**
     * 标记为模板
     * 
     * @param id 文档 ID
     * @return 文档响应
     */
    DocumentResponse markAsTemplate(Long id);
    
    /**
     * 从模板创建文档
     * 
     * @param templateId 模板 ID
     * @return 文档响应
     */
    DocumentResponse createFromTemplate(Long templateId);
    
    /**
     * 增加浏览次数
     * 
     * @param id 文档 ID
     */
    void incrementViewCount(Long id);
    
    /**
     * 增加导出次数
     * 
     * @param id 文档 ID
     */
    void incrementExportCount(Long id);
}
