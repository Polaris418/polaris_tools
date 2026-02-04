package com.polaris.service;

import com.polaris.common.base.BaseService;
import com.polaris.dto.VersionCreateRequest;
import com.polaris.dto.VersionQueryRequest;
import com.polaris.dto.VersionResponse;
import com.polaris.dto.VersionUpdateRequest;
import com.polaris.entity.DocumentVersion;

import java.util.List;

/**
 * 文档版本服务接口
 */
public interface VersionService extends BaseService<DocumentVersion, VersionResponse, VersionCreateRequest, VersionUpdateRequest, VersionQueryRequest> {
    
    /**
     * 获取文档的版本历史
     * 
     * @param documentId 文档 ID
     * @return 版本列表（按版本号降序）
     */
    List<VersionResponse> getVersionHistory(Long documentId);
    
    /**
     * 获取指定版本
     * 
     * @param documentId 文档 ID
     * @param versionNumber 版本号
     * @return 版本详情
     */
    VersionResponse getVersion(Long documentId, Integer versionNumber);
    
    /**
     * 恢复到指定版本
     * 
     * @param documentId 文档 ID
     * @param versionNumber 版本号
     * @return 恢复后的文档版本
     */
    VersionResponse restoreVersion(Long documentId, Integer versionNumber);
    
    /**
     * 手动创建版本（用于用户主动保存）
     * 
     * @param documentId 文档 ID
     * @param comment 版本备注
     * @return 新版本
     */
    VersionResponse createVersion(Long documentId, String comment);
    
    /**
     * 比较两个版本的差异
     * 
     * @param documentId 文档 ID
     * @param versionA 版本 A
     * @param versionB 版本 B
     * @return 差异信息
     */
    String compareVersions(Long documentId, Integer versionA, Integer versionB);
}
