package com.polaris.service;

import com.polaris.common.base.BaseService;
import com.polaris.dto.FolderCreateRequest;
import com.polaris.dto.FolderQueryRequest;
import com.polaris.dto.FolderResponse;
import com.polaris.dto.FolderUpdateRequest;
import com.polaris.entity.DocumentFolder;

import java.util.List;

/**
 * 文件夹服务接口
 */
public interface FolderService extends BaseService<DocumentFolder, FolderResponse, 
        FolderCreateRequest, FolderUpdateRequest, FolderQueryRequest> {
    
    /**
     * 获取用户的文件夹树
     * 
     * @return 文件夹树（包含子文件夹）
     */
    List<FolderResponse> getFolderTree();
    
    /**
     * 获取指定文件夹的子文件夹
     * 
     * @param parentId 父文件夹 ID（null 表示根目录）
     * @return 子文件夹列表
     */
    List<FolderResponse> getSubFolders(Long parentId);
    
    /**
     * 移动文件夹
     * 
     * @param id 文件夹 ID
     * @param newParentId 新的父文件夹 ID
     * @return 更新后的文件夹
     */
    FolderResponse moveFolder(Long id, Long newParentId);
}
