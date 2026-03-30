package com.polaris.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.polaris.common.base.BaseConverter;
import com.polaris.common.base.BaseServiceImpl;
import com.polaris.common.exception.BusinessException;
import com.polaris.common.exception.ErrorCode;
import com.polaris.converter.FolderConverter;
import com.polaris.dto.document.FolderCreateRequest;
import com.polaris.dto.document.FolderQueryRequest;
import com.polaris.dto.document.FolderResponse;
import com.polaris.dto.document.FolderUpdateRequest;
import com.polaris.entity.DocumentFolder;
import com.polaris.entity.UserDocument;
import com.polaris.mapper.DocumentFolderMapper;
import com.polaris.mapper.DocumentMapper;
import com.polaris.auth.security.UserContext;
import com.polaris.service.FolderService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.stream.Collectors;

/**
 * 文件夹服务实现类
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class FolderServiceImpl 
        extends BaseServiceImpl<DocumentFolder, FolderResponse, FolderCreateRequest, 
                               FolderUpdateRequest, FolderQueryRequest>
        implements FolderService {
    
    private final DocumentFolderMapper folderMapper;
    private final DocumentMapper documentMapper;
    private final UserContext userContext;
    private final FolderConverter folderConverter;
    
    // ==================== BaseServiceImpl 必需方法 ====================
    
    @Override
    protected BaseMapper<DocumentFolder> getMapper() {
        return folderMapper;
    }
    
    @Override
    protected BaseConverter<DocumentFolder, FolderResponse, FolderCreateRequest, FolderUpdateRequest> getConverter() {
        // 返回适配器，因为 FolderConverter 接口签名不同
        return new FolderConverterAdapter(folderConverter);
    }
    
    @Override
    protected String getResourceName() {
        return "文件夹";
    }
    
    // ==================== 构建查询条件 ====================
    
    @Override
    protected LambdaQueryWrapper<DocumentFolder> buildQueryWrapper(FolderQueryRequest query) {
        Long userId = getCurrentUserId();
        
        LambdaQueryWrapper<DocumentFolder> queryWrapper = new LambdaQueryWrapper<>();
        queryWrapper.eq(DocumentFolder::getUserId, userId);
        
        // 父文件夹过滤
        if (query != null && query.getParentId() != null) {
            queryWrapper.eq(DocumentFolder::getParentId, query.getParentId());
        }
        
        // 只查询根目录
        if (query != null && Boolean.TRUE.equals(query.getRootOnly())) {
            queryWrapper.isNull(DocumentFolder::getParentId);
        }
        
        queryWrapper.orderByAsc(DocumentFolder::getSortOrder);
        queryWrapper.orderByDesc(DocumentFolder::getCreatedAt);
        
        return queryWrapper;
    }
    
    // ==================== 转换为响应 DTO ====================
    
    @Override
    protected FolderResponse convertToResponse(DocumentFolder folder) {
        FolderResponse response = folderConverter.toFolderResponse(folder);
        
        // 计算文件夹内的文档数量
        Long documentCount = documentMapper.selectCount(
                new LambdaQueryWrapper<UserDocument>()
                        .eq(UserDocument::getFolderId, folder.getId())
        );
        response.setDocumentCount(documentCount);
        
        return response;
    }
    
    // ==================== 钩子方法 ====================
    
    @Override
    protected void validateCreate(FolderCreateRequest request) {
        Long userId = getCurrentUserId();
        
        // 验证父文件夹存在且属于当前用户
        if (request.getParentId() != null) {
            DocumentFolder parent = folderMapper.selectById(request.getParentId());
            if (parent == null || !parent.getUserId().equals(userId)) {
                throw new BusinessException(ErrorCode.INVALID_PARAMETER, "父文件夹不存在");
            }
        }
        
        // 验证名称不重复（同一父文件夹下）
        Long count = folderMapper.selectCount(
                new LambdaQueryWrapper<DocumentFolder>()
                        .eq(DocumentFolder::getUserId, userId)
                        .eq(DocumentFolder::getName, request.getName())
                        .eq(request.getParentId() != null, DocumentFolder::getParentId, request.getParentId())
                        .isNull(request.getParentId() == null, DocumentFolder::getParentId)
        );
        if (count > 0) {
            throw new BusinessException(ErrorCode.INVALID_PARAMETER, "同名文件夹已存在");
        }
    }
    
    @Override
    protected void beforeCreate(DocumentFolder entity, FolderCreateRequest request) {
        entity.setUserId(getCurrentUserId());
        if (entity.getSortOrder() == null) {
            entity.setSortOrder(0);
        }
    }
    
    @Override
    protected void validateUpdate(DocumentFolder entity, FolderUpdateRequest request) {
        Long userId = getCurrentUserId();
        
        // 验证权限
        if (!entity.getUserId().equals(userId)) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED, "无权访问该文件夹");
        }
    }
    
    @Override
    protected void validateDelete(DocumentFolder entity) {
        Long userId = getCurrentUserId();
        
        // 验证权限
        if (!entity.getUserId().equals(userId)) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED, "无权访问该文件夹");
        }
        
        // 检查是否有子文件夹
        Long subFolderCount = folderMapper.selectCount(
                new LambdaQueryWrapper<DocumentFolder>()
                        .eq(DocumentFolder::getParentId, entity.getId())
        );
        if (subFolderCount > 0) {
            throw new BusinessException(ErrorCode.INVALID_PARAMETER, "该文件夹下还有子文件夹，无法删除");
        }
        
        // 检查是否有文档
        Long documentCount = documentMapper.selectCount(
                new LambdaQueryWrapper<UserDocument>()
                        .eq(UserDocument::getFolderId, entity.getId())
        );
        if (documentCount > 0) {
            throw new BusinessException(ErrorCode.INVALID_PARAMETER, "该文件夹下还有文档，无法删除");
        }
    }
    
    // ==================== 扩展方法实现 ====================
    
    @Override
    public List<FolderResponse> getFolderTree() {
        Long userId = getCurrentUserId();
        
        // 获取用户所有文件夹
        List<DocumentFolder> allFolders = folderMapper.selectList(
                new LambdaQueryWrapper<DocumentFolder>()
                        .eq(DocumentFolder::getUserId, userId)
                        .orderByAsc(DocumentFolder::getSortOrder)
        );
        
        // 转换为响应并构建树
        List<FolderResponse> allResponses = allFolders.stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
        
        // 构建树结构（返回顶层文件夹）
        return buildTree(allResponses, null);
    }
    
    @Override
    public List<FolderResponse> getSubFolders(Long parentId) {
        Long userId = getCurrentUserId();
        
        LambdaQueryWrapper<DocumentFolder> queryWrapper = new LambdaQueryWrapper<>();
        queryWrapper.eq(DocumentFolder::getUserId, userId);
        
        if (parentId != null) {
            queryWrapper.eq(DocumentFolder::getParentId, parentId);
        } else {
            queryWrapper.isNull(DocumentFolder::getParentId);
        }
        
        queryWrapper.orderByAsc(DocumentFolder::getSortOrder);
        
        List<DocumentFolder> folders = folderMapper.selectList(queryWrapper);
        
        return folders.stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }
    
    @Override
    @Transactional(rollbackFor = Exception.class)
    public FolderResponse moveFolder(Long id, Long newParentId) {
        Long userId = getCurrentUserId();
        
        // 获取文件夹
        DocumentFolder folder = folderMapper.selectById(id);
        if (folder == null || !folder.getUserId().equals(userId)) {
            throw new BusinessException(ErrorCode.INVALID_PARAMETER, "文件夹不存在");
        }
        
        // 验证新父文件夹
        if (newParentId != null) {
            // 不能移动到自己
            if (newParentId.equals(id)) {
                throw new BusinessException(ErrorCode.INVALID_PARAMETER, "不能将文件夹移动到自身");
            }
            
            DocumentFolder newParent = folderMapper.selectById(newParentId);
            if (newParent == null || !newParent.getUserId().equals(userId)) {
                throw new BusinessException(ErrorCode.INVALID_PARAMETER, "目标文件夹不存在");
            }
            
            // 不能移动到子文件夹
            if (isDescendant(newParentId, id)) {
                throw new BusinessException(ErrorCode.INVALID_PARAMETER, "不能将文件夹移动到其子文件夹");
            }
        }
        
        // 更新父文件夹
        folder.setParentId(newParentId);
        folderMapper.updateById(folder);
        
        log.info("移动文件夹: id={}, newParentId={}", id, newParentId);
        
        return convertToResponse(folder);
    }
    
    // ==================== 私有辅助方法 ====================
    
    private Long getCurrentUserId() {
        Long userId = userContext.getCurrentUserId();
        if (userId == null) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED);
        }
        return userId;
    }
    
    /**
     * 构建文件夹树
     */
    private List<FolderResponse> buildTree(List<FolderResponse> allFolders, Long parentId) {
        return allFolders.stream()
                .filter(f -> (parentId == null && f.getParentId() == null) 
                        || (parentId != null && parentId.equals(f.getParentId())))
                .peek(f -> f.setChildren(buildTree(allFolders, f.getId())))
                .collect(Collectors.toList());
    }
    
    /**
     * 检查 targetId 是否是 ancestorId 的后代
     */
    private boolean isDescendant(Long targetId, Long ancestorId) {
        DocumentFolder current = folderMapper.selectById(targetId);
        while (current != null && current.getParentId() != null) {
            if (current.getParentId().equals(ancestorId)) {
                return true;
            }
            current = folderMapper.selectById(current.getParentId());
        }
        return false;
    }
    
    /**
     * 适配器类：将 FolderConverter 适配为 BaseConverter
     */
    private static class FolderConverterAdapter implements BaseConverter<DocumentFolder, FolderResponse, FolderCreateRequest, FolderUpdateRequest> {
        
        private final FolderConverter folderConverter;
        
        public FolderConverterAdapter(FolderConverter folderConverter) {
            this.folderConverter = folderConverter;
        }
        
        @Override
        public FolderResponse toResponse(DocumentFolder entity) {
            return folderConverter.toFolderResponse(entity);
        }
        
        @Override
        public DocumentFolder toEntity(FolderCreateRequest request) {
            return folderConverter.toDocumentFolder(request);
        }
        
        @Override
        public void updateEntity(DocumentFolder entity, FolderUpdateRequest request) {
            folderConverter.updateFolderFromRequest(request, entity);
        }
    }
}
