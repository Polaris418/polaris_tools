package com.polaris.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.polaris.common.base.BaseConverter;
import com.polaris.common.base.BaseServiceImpl;
import com.polaris.common.exception.BusinessException;
import com.polaris.common.exception.ErrorCode;
import com.polaris.converter.DocumentConverter;
import com.polaris.dto.DocumentCreateRequest;
import com.polaris.dto.DocumentQueryRequest;
import com.polaris.dto.DocumentResponse;
import com.polaris.dto.DocumentUpdateRequest;
import com.polaris.entity.DocumentFolder;
import com.polaris.entity.DocumentVersion;
import com.polaris.entity.User;
import com.polaris.entity.UserDocument;
import com.polaris.mapper.DocumentFolderMapper;
import com.polaris.mapper.DocumentMapper;
import com.polaris.mapper.DocumentVersionMapper;
import com.polaris.mapper.UserMapper;
import com.polaris.security.UserContext;
import com.polaris.service.DocumentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * 文档服务实现类
 * 继承 BaseServiceImpl 获得标准 CRUD 操作
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class DocumentServiceImpl 
        extends BaseServiceImpl<UserDocument, DocumentResponse, DocumentCreateRequest, 
                               DocumentUpdateRequest, DocumentQueryRequest>
        implements DocumentService {
    
    private final DocumentMapper documentMapper;
    private final DocumentFolderMapper folderMapper;
    private final DocumentVersionMapper versionMapper;
    private final UserMapper userMapper;
    private final UserContext userContext;
    private final DocumentConverter documentConverter;
    
    // ==================== BaseServiceImpl 必需方法 ====================
    
    @Override
    protected BaseMapper<UserDocument> getMapper() {
        return documentMapper;
    }
    
    @Override
    protected BaseConverter<UserDocument, DocumentResponse, DocumentCreateRequest, DocumentUpdateRequest> getConverter() {
        return documentConverter;
    }
    
    @Override
    protected String getResourceName() {
        return "文档";
    }
    
    // ==================== 构建查询条件 ====================
    
    @Override
    protected LambdaQueryWrapper<UserDocument> buildQueryWrapper(DocumentQueryRequest query) {
        // 获取当前用户 ID
        Long userId = userContext.getCurrentUserId();
        if (userId == null) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED);
        }
        
        LambdaQueryWrapper<UserDocument> queryWrapper = new LambdaQueryWrapper<>();
        
        // 只查询当前用户的文档
        queryWrapper.eq(UserDocument::getUserId, userId);
        
        // 只查询未过期的文档
        queryWrapper.and(wrapper -> wrapper.isNull(UserDocument::getExpireAt)
                .or()
                .gt(UserDocument::getExpireAt, LocalDateTime.now()));
        
        // 文件夹过滤
        if (query.getFolderId() != null) {
            queryWrapper.eq(UserDocument::getFolderId, query.getFolderId());
        }
        
        // 标签过滤（AND 逻辑）
        if (query.getTags() != null && !query.getTags().trim().isEmpty()) {
            String[] tags = query.getTags().split(",");
            for (String tag : tags) {
                queryWrapper.like(UserDocument::getTags, tag.trim());
            }
        }
        
        // 模板过滤
        if (query.getIsTemplate() != null) {
            queryWrapper.eq(UserDocument::getIsTemplate, query.getIsTemplate());
        }
        
        // 关键词搜索（标题或内容）
        if (query.getKeyword() != null && !query.getKeyword().trim().isEmpty()) {
            queryWrapper.and(wrapper -> wrapper
                .like(UserDocument::getTitle, query.getKeyword().trim())
                .or()
                .like(UserDocument::getContent, query.getKeyword().trim()));
        }
        
        // 排序：按创建时间降序
        queryWrapper.orderByDesc(UserDocument::getCreatedAt);
        
        return queryWrapper;
    }
    
    // ==================== 转换为响应 DTO ====================
    
    @Override
    protected DocumentResponse convertToResponse(UserDocument document) {
        DocumentResponse response = documentConverter.toResponse(document);
        
        // 计算字数、字符数和阅读时间
        if (document.getContent() != null) {
            String content = document.getContent();
            
            // 字符数
            response.setCharCount((long) content.length());
            
            // 字数（按空格分隔）
            String[] words = content.trim().split("\\s+");
            response.setWordCount((long) words.length);
            
            // 阅读时间（分钟）：按每分钟200字计算
            response.setReadingTime((long) Math.ceil(words.length / 200.0));
        } else {
            response.setCharCount(0L);
            response.setWordCount(0L);
            response.setReadingTime(0L);
        }
        
        return response;
    }
    
    // ==================== 钩子方法：验证和处理 ====================
    
    @Override
    protected void validateGetById(UserDocument entity) {
        // 验证权限
        Long userId = userContext.getCurrentUserId();
        if (!entity.getUserId().equals(userId)) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED, "无权访问该文档");
        }
        
        // 检查是否过期
        if (entity.getExpireAt() != null && entity.getExpireAt().isBefore(LocalDateTime.now())) {
            throw new BusinessException(ErrorCode.INVALID_PARAMETER, "文档已过期");
        }
    }
    
    @Override
    protected void validateCreate(DocumentCreateRequest request) {
        // 获取当前用户 ID
        Long userId = userContext.getCurrentUserId();
        if (userId == null) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED);
        }
        
        // 验证文件夹（如果指定）
        if (request.getFolderId() != null) {
            DocumentFolder folder = folderMapper.selectById(request.getFolderId());
            if (folder == null || !folder.getUserId().equals(userId)) {
                throw new BusinessException(ErrorCode.INVALID_PARAMETER, "文件夹不存在或无权访问");
            }
        }
        
        // 验证标签数量
        if (request.getTags() != null && !request.getTags().trim().isEmpty()) {
            String[] tags = request.getTags().split(",");
            if (tags.length > 10) {
                throw new BusinessException(ErrorCode.INVALID_PARAMETER, "每个文档最多允许10个标签");
            }
        }
    }
    
    @Override
    protected void beforeCreate(UserDocument entity, DocumentCreateRequest request) {
        // 设置用户 ID
        Long userId = userContext.getCurrentUserId();
        entity.setUserId(userId);
        
        // 根据会员类型设置过期时间
        entity.setExpireAt(calculateExpireAt(userId));
        
        // 去重标签
        if (request.getTags() != null && !request.getTags().trim().isEmpty()) {
            String[] tags = request.getTags().split(",");
            Set<String> uniqueTags = new HashSet<>(Arrays.asList(tags));
            entity.setTags(String.join(",", uniqueTags));
        }
    }
    
    @Override
    protected void afterCreate(UserDocument entity, DocumentCreateRequest request) {
        // 创建初始版本
        Long userId = userContext.getCurrentUserId();
        createVersion(entity.getId(), entity.getContent(), userId);
    }
    
    @Override
    protected void validateUpdate(UserDocument entity, DocumentUpdateRequest request) {
        // 验证权限
        Long userId = userContext.getCurrentUserId();
        if (!entity.getUserId().equals(userId)) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED, "无权访问该文档");
        }
        
        // 验证文件夹（如果指定）
        if (request.getFolderId() != null) {
            DocumentFolder folder = folderMapper.selectById(request.getFolderId());
            if (folder == null || !folder.getUserId().equals(userId)) {
                throw new BusinessException(ErrorCode.INVALID_PARAMETER, "文件夹不存在或无权访问");
            }
        }
        
        // 验证标签数量
        if (request.getTags() != null && !request.getTags().trim().isEmpty()) {
            String[] tags = request.getTags().split(",");
            if (tags.length > 10) {
                throw new BusinessException(ErrorCode.INVALID_PARAMETER, "每个文档最多允许10个标签");
            }
        }
    }
    
    @Override
    protected void beforeUpdate(UserDocument entity, DocumentUpdateRequest request) {
        // 去重标签
        if (request.getTags() != null && !request.getTags().trim().isEmpty()) {
            String[] tags = request.getTags().split(",");
            Set<String> uniqueTags = new HashSet<>(Arrays.asList(tags));
            request.setTags(String.join(",", uniqueTags));
        }
    }
    
    @Override
    protected void afterUpdate(UserDocument entity, DocumentUpdateRequest request) {
        // 如果内容有变化，创建版本快照
        if (request.getContent() != null) {
            Long userId = userContext.getCurrentUserId();
            createVersion(entity.getId(), entity.getContent(), userId);
        }
    }
    
    @Override
    protected void validateDelete(UserDocument entity) {
        // 验证权限
        Long userId = userContext.getCurrentUserId();
        if (!entity.getUserId().equals(userId)) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED, "无权访问该文档");
        }
    }
    
    // ==================== 扩展方法实现 ====================
    
    @Override
    public List<DocumentResponse> searchDocuments(String keyword, Long folderId, String tags) {
        // 获取当前用户 ID
        Long userId = userContext.getCurrentUserId();
        if (userId == null) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED);
        }
        
        // 构建查询条件
        LambdaQueryWrapper<UserDocument> queryWrapper = new LambdaQueryWrapper<>();
        
        // 只查询当前用户的文档
        queryWrapper.eq(UserDocument::getUserId, userId);
        
        // 只查询未过期和未删除的文档
        queryWrapper.and(wrapper -> wrapper.isNull(UserDocument::getExpireAt)
                .or()
                .gt(UserDocument::getExpireAt, LocalDateTime.now()));
        
        // 关键词搜索（标题或内容）
        if (keyword != null && !keyword.trim().isEmpty()) {
            queryWrapper.and(wrapper -> wrapper
                .like(UserDocument::getTitle, keyword.trim())
                .or()
                .like(UserDocument::getContent, keyword.trim()));
        }
        
        // 文件夹过滤
        if (folderId != null) {
            queryWrapper.eq(UserDocument::getFolderId, folderId);
        }
        
        // 标签过滤（AND 逻辑）
        if (tags != null && !tags.trim().isEmpty()) {
            String[] tagArray = tags.split(",");
            for (String tag : tagArray) {
                queryWrapper.like(UserDocument::getTags, tag.trim());
            }
        }
        
        // 排序：按创建时间降序
        queryWrapper.orderByDesc(UserDocument::getCreatedAt);
        
        // 查询所有匹配的文档
        List<UserDocument> documents = documentMapper.selectList(queryWrapper);
        
        // 转换为响应 DTO
        return documents.stream()
            .map(this::convertToResponse)
            .collect(Collectors.toList());
    }
    
    @Override
    @Transactional(rollbackFor = Exception.class)
    public DocumentResponse markAsTemplate(Long id) {
        // 获取当前用户 ID
        Long userId = userContext.getCurrentUserId();
        if (userId == null) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED);
        }
        
        // 验证文档存在且属于当前用户
        UserDocument document = documentMapper.selectById(id);
        if (document == null) {
            throw new BusinessException(ErrorCode.INVALID_PARAMETER, "文档不存在");
        }
        if (!document.getUserId().equals(userId)) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED, "无权访问该文档");
        }
        
        // 标记为模板
        document.setIsTemplate(1);
        documentMapper.updateById(document);
        
        log.info("标记文档为模板: id={}, userId={}, title={}", id, userId, document.getTitle());
        
        return convertToResponse(document);
    }
    
    @Override
    @Transactional(rollbackFor = Exception.class)
    public DocumentResponse createFromTemplate(Long templateId) {
        // 获取当前用户 ID
        Long userId = userContext.getCurrentUserId();
        if (userId == null) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED);
        }
        
        // 验证模板存在
        UserDocument template = documentMapper.selectById(templateId);
        if (template == null) {
            throw new BusinessException(ErrorCode.INVALID_PARAMETER, "模板不存在");
        }
        if (template.getIsTemplate() != 1) {
            throw new BusinessException(ErrorCode.INVALID_PARAMETER, "该文档不是模板");
        }
        
        // 创建新文档（复制内容但不复制元数据）
        UserDocument newDocument = new UserDocument();
        newDocument.setUserId(userId);
        newDocument.setTitle(template.getTitle() + " (副本)");
        newDocument.setContent(template.getContent());
        newDocument.setFormat("markdown");
        newDocument.setIsTemplate(0);
        newDocument.setViewCount(0L);
        newDocument.setExportCount(0L);
        newDocument.setExpireAt(calculateExpireAt(userId));
        
        // 保存文档
        documentMapper.insert(newDocument);
        
        // 创建初始版本
        createVersion(newDocument.getId(), newDocument.getContent(), userId);
        
        log.info("从模板创建文档: templateId={}, newDocumentId={}, userId={}", 
                templateId, newDocument.getId(), userId);
        
        return convertToResponse(newDocument);
    }
    
    @Override
    @Transactional(rollbackFor = Exception.class)
    public void incrementViewCount(Long id) {
        int result = documentMapper.incrementViewCount(id);
        if (result <= 0) {
            log.warn("增加浏览次数失败: id={}", id);
        }
    }
    
    @Override
    @Transactional(rollbackFor = Exception.class)
    public void incrementExportCount(Long id) {
        int result = documentMapper.incrementExportCount(id);
        if (result <= 0) {
            log.warn("增加导出次数失败: id={}", id);
        }
    }
    
    // ==================== 私有辅助方法 ====================
    
    /**
     * 根据用户会员类型计算过期时间
     */
    private LocalDateTime calculateExpireAt(Long userId) {
        User user = userMapper.selectById(userId);
        if (user == null) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED, "用户不存在");
        }
        
        // planType: 0-免费用户, 1-会员用户
        if (user.getPlanType() != null && user.getPlanType() == 1) {
            // 会员用户：30天
            return LocalDateTime.now().plusDays(30);
        } else {
            // 免费用户：3天
            return LocalDateTime.now().plusDays(3);
        }
    }
    
    /**
     * 创建文档版本
     */
    private void createVersion(Long documentId, String content, Long userId) {
        // 获取最新版本号
        int maxVersionNumber = versionMapper.selectMaxVersionNumber(documentId);
        
        // 创建新版本
        DocumentVersion version = new DocumentVersion();
        version.setDocumentId(documentId);
        version.setContent(content);
        version.setVersionNumber(maxVersionNumber + 1);
        version.setExpireAt(calculateExpireAt(userId));
        
        versionMapper.insert(version);
        
        log.debug("创建文档版本: documentId={}, versionNumber={}", documentId, version.getVersionNumber());
    }
}
