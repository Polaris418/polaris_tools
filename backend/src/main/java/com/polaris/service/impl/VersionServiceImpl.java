package com.polaris.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.polaris.common.base.BaseConverter;
import com.polaris.common.base.BaseServiceImpl;
import com.polaris.common.exception.BusinessException;
import com.polaris.common.exception.ErrorCode;
import com.polaris.converter.VersionConverter;
import com.polaris.dto.document.VersionQueryRequest;
import com.polaris.dto.document.VersionResponse;
import com.polaris.dto.document.VersionCreateRequest;
import com.polaris.dto.document.VersionUpdateRequest;
import com.polaris.entity.DocumentVersion;
import com.polaris.entity.User;
import com.polaris.entity.UserDocument;
import com.polaris.mapper.DocumentMapper;
import com.polaris.mapper.DocumentVersionMapper;
import com.polaris.mapper.UserMapper;
import com.polaris.auth.security.UserContext;
import com.polaris.service.VersionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

/**
 * 版本服务实现类
 * 提供文档版本历史管理功能
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class VersionServiceImpl extends BaseServiceImpl<DocumentVersion, VersionResponse, VersionCreateRequest, VersionUpdateRequest, VersionQueryRequest> 
        implements VersionService {
    
    private final DocumentVersionMapper versionMapper;
    private final DocumentMapper documentMapper;
    private final UserMapper userMapper;
    private final UserContext userContext;
    private final VersionConverter versionConverter;
    
    // 会员版本保留时间（天）
    private static final int FREE_VERSION_RETENTION_DAYS = 7;
    private static final int PRO_VERSION_RETENTION_DAYS = 30;
    private static final int ENTERPRISE_VERSION_RETENTION_DAYS = 365;
    
    // 会员最大版本数量
    private static final int FREE_MAX_VERSIONS = 5;
    private static final int PRO_MAX_VERSIONS = 50;
    private static final int ENTERPRISE_MAX_VERSIONS = 1000;
    
    // ==================== BaseServiceImpl 必需方法 ====================
    
    @Override
    protected BaseMapper<DocumentVersion> getMapper() {
        return versionMapper;
    }
    
    @Override
    protected BaseConverter<DocumentVersion, VersionResponse, VersionCreateRequest, VersionUpdateRequest> getConverter() {
        return versionConverter;
    }
    
    @Override
    protected String getResourceName() {
        return "版本";
    }
    
    @Override
    protected LambdaQueryWrapper<DocumentVersion> buildQueryWrapper(VersionQueryRequest query) {
        LambdaQueryWrapper<DocumentVersion> wrapper = new LambdaQueryWrapper<>();
        
        if (query.getDocumentId() != null) {
            wrapper.eq(DocumentVersion::getDocumentId, query.getDocumentId());
        }
        
        if (query.getVersionNumber() != null) {
            wrapper.eq(DocumentVersion::getVersionNumber, query.getVersionNumber());
        }
        
        // 只查询未过期的版本
        wrapper.and(w -> w.isNull(DocumentVersion::getExpireAt)
                .or()
                .gt(DocumentVersion::getExpireAt, LocalDateTime.now()));
        
        // 按版本号降序排序
        wrapper.orderByDesc(DocumentVersion::getVersionNumber);
        
        return wrapper;
    }
    
    // ==================== 公开接口实现 ====================
    
    @Override
    public List<VersionResponse> getVersionHistory(Long documentId) {
        // 验证文档权限
        validateDocumentAccess(documentId);
        
        // 查询版本历史
        List<DocumentVersion> versions = versionMapper.selectByDocumentId(documentId);
        
        return versions.stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }
    
    @Override
    public VersionResponse getVersion(Long documentId, Integer versionNumber) {
        // 验证文档权限
        validateDocumentAccess(documentId);
        
        // 查询特定版本
        LambdaQueryWrapper<DocumentVersion> queryWrapper = new LambdaQueryWrapper<>();
        queryWrapper.eq(DocumentVersion::getDocumentId, documentId)
                   .eq(DocumentVersion::getVersionNumber, versionNumber)
                   .and(wrapper -> wrapper.isNull(DocumentVersion::getExpireAt)
                           .or()
                           .gt(DocumentVersion::getExpireAt, LocalDateTime.now()));
        
        DocumentVersion version = versionMapper.selectOne(queryWrapper);
        if (version == null) {
            throw new BusinessException(ErrorCode.NOT_FOUND, "版本不存在或已过期");
        }
        
        return convertToResponse(version);
    }
    
    @Override
    @Transactional
    public VersionResponse restoreVersion(Long documentId, Integer versionNumber) {
        // 验证文档权限
        UserDocument document = validateDocumentAccess(documentId);
        
        // 获取要恢复的版本
        VersionResponse targetVersion = getVersion(documentId, versionNumber);
        
        // 保存当前版本到历史（恢复前）
        createVersionInternal(document, "恢复版本 " + versionNumber + " 前自动保存");
        
        // 更新文档内容为目标版本
        document.setContent(targetVersion.getContent());
        document.setUpdatedAt(LocalDateTime.now());
        documentMapper.updateById(document);
        
        log.info("文档 {} 已恢复到版本 {}", documentId, versionNumber);
        
        // 为恢复后的文档创建新版本
        DocumentVersion newVersion = createVersionInternal(document, "从版本 " + versionNumber + " 恢复");
        
        return convertToResponse(newVersion);
    }
    
    @Override
    @Transactional
    public VersionResponse createVersion(Long documentId, String comment) {
        // 验证文档权限
        UserDocument document = validateDocumentAccess(documentId);
        
        // 检查版本数量限制
        checkVersionLimit(documentId);
        
        // 创建新版本
        DocumentVersion version = createVersionInternal(document, comment);
        
        return convertToResponse(version);
    }
    
    @Override
    public String compareVersions(Long documentId, Integer versionA, Integer versionB) {
        // 验证文档权限
        validateDocumentAccess(documentId);
        
        // 获取两个版本
        VersionResponse verA = getVersion(documentId, versionA);
        VersionResponse verB = getVersion(documentId, versionB);
        
        // 简单的差异比较（返回 JSON 格式）
        return generateDiff(verA.getContent(), verB.getContent(), versionA, versionB);
    }
    
    // ==================== 内部方法 ====================
    
    /**
     * 验证文档访问权限
     */
    private UserDocument validateDocumentAccess(Long documentId) {
        Long userId = userContext.getCurrentUserId();
        if (userId == null) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED);
        }
        
        UserDocument document = documentMapper.selectById(documentId);
        if (document == null) {
            throw new BusinessException(ErrorCode.NOT_FOUND, "文档不存在");
        }
        
        if (!document.getUserId().equals(userId)) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED, "无权访问该文档");
        }
        
        return document;
    }
    
    /**
     * 内部创建版本方法
     */
    private DocumentVersion createVersionInternal(UserDocument document, String comment) {
        Long userId = userContext.getCurrentUserId();
        
        // 获取下一个版本号
        int nextVersionNumber = versionMapper.selectMaxVersionNumber(document.getId()) + 1;
        
        // 创建版本记录
        DocumentVersion version = new DocumentVersion();
        version.setDocumentId(document.getId());
        version.setContent(document.getContent());
        version.setVersionNumber(nextVersionNumber);
        version.setExpireAt(calculateVersionExpireAt(userId));
        version.setCreatedAt(LocalDateTime.now());
        version.setUpdatedAt(LocalDateTime.now());
        
        versionMapper.insert(version);
        
        log.info("为文档 {} 创建版本 {}，备注: {}", document.getId(), nextVersionNumber, comment);
        
        // 清理超出限制的旧版本
        cleanupOldVersions(document.getId(), userId);
        
        return version;
    }
    
    /**
     * 计算版本过期时间
     * planType: 0-免费用户, 1-会员用户
     */
    private LocalDateTime calculateVersionExpireAt(Long userId) {
        User user = userMapper.selectById(userId);
        Integer planType = user != null ? user.getPlanType() : 0;
        
        int retentionDays = switch (planType) {
            case 1 -> PRO_VERSION_RETENTION_DAYS;
            case 2 -> ENTERPRISE_VERSION_RETENTION_DAYS;
            default -> FREE_VERSION_RETENTION_DAYS;
        };
        
        return LocalDateTime.now().plusDays(retentionDays);
    }
    
    /**
     * 检查版本数量限制
     * planType: 0-免费用户, 1-会员用户
     */
    private void checkVersionLimit(Long documentId) {
        Long userId = userContext.getCurrentUserId();
        User user = userMapper.selectById(userId);
        Integer planType = user != null ? user.getPlanType() : 0;
        
        int maxVersions = switch (planType) {
            case 1 -> PRO_MAX_VERSIONS;
            case 2 -> ENTERPRISE_MAX_VERSIONS;
            default -> FREE_MAX_VERSIONS;
        };
        
        // 查询当前版本数量
        LambdaQueryWrapper<DocumentVersion> queryWrapper = new LambdaQueryWrapper<>();
        queryWrapper.eq(DocumentVersion::getDocumentId, documentId)
                   .and(wrapper -> wrapper.isNull(DocumentVersion::getExpireAt)
                           .or()
                           .gt(DocumentVersion::getExpireAt, LocalDateTime.now()));
        
        long currentCount = versionMapper.selectCount(queryWrapper);
        
        if (currentCount >= maxVersions) {
            throw new BusinessException(ErrorCode.FORBIDDEN, 
                    "版本数量已达上限（" + maxVersions + "），请升级会员或删除旧版本");
        }
    }
    
    /**
     * 清理超出限制的旧版本
     * planType: 0-免费用户, 1-会员用户
     */
    private void cleanupOldVersions(Long documentId, Long userId) {
        User user = userMapper.selectById(userId);
        Integer planType = user != null ? user.getPlanType() : 0;
        
        int maxVersions = switch (planType) {
            case 1 -> PRO_MAX_VERSIONS;
            case 2 -> ENTERPRISE_MAX_VERSIONS;
            default -> FREE_MAX_VERSIONS;
        };
        
        // 查询所有版本（按版本号降序）
        List<DocumentVersion> versions = versionMapper.selectByDocumentId(documentId);
        
        // 删除超出限制的旧版本
        if (versions.size() > maxVersions) {
            List<DocumentVersion> toDelete = versions.subList(maxVersions, versions.size());
            for (DocumentVersion version : toDelete) {
                versionMapper.deleteById(version.getId());
                log.info("删除超出限制的版本: 文档={}, 版本号={}", documentId, version.getVersionNumber());
            }
        }
    }
    
    /**
     * 生成版本差异（简单的行对比）
     */
    private String generateDiff(String contentA, String contentB, Integer versionA, Integer versionB) {
        String[] linesA = contentA != null ? contentA.split("\n") : new String[0];
        String[] linesB = contentB != null ? contentB.split("\n") : new String[0];
        
        StringBuilder diff = new StringBuilder();
        diff.append("{\n");
        diff.append("  \"versionA\": ").append(versionA).append(",\n");
        diff.append("  \"versionB\": ").append(versionB).append(",\n");
        diff.append("  \"linesA\": ").append(linesA.length).append(",\n");
        diff.append("  \"linesB\": ").append(linesB.length).append(",\n");
        diff.append("  \"diff\": [\n");
        
        int maxLines = Math.max(linesA.length, linesB.length);
        List<String> diffs = new ArrayList<>();
        
        for (int i = 0; i < maxLines; i++) {
            String lineA = i < linesA.length ? linesA[i] : "";
            String lineB = i < linesB.length ? linesB[i] : "";
            
            if (!lineA.equals(lineB)) {
                StringBuilder diffLine = new StringBuilder();
                diffLine.append("    { \"line\": ").append(i + 1);
                diffLine.append(", \"a\": \"").append(escapeJson(lineA)).append("\"");
                diffLine.append(", \"b\": \"").append(escapeJson(lineB)).append("\" }");
                diffs.add(diffLine.toString());
            }
        }
        
        diff.append(String.join(",\n", diffs));
        diff.append("\n  ]\n");
        diff.append("}");
        
        return diff.toString();
    }
    
    /**
     * JSON 字符串转义
     */
    private String escapeJson(String text) {
        if (text == null) return "";
        return text.replace("\\", "\\\\")
                   .replace("\"", "\\\"")
                   .replace("\n", "\\n")
                   .replace("\r", "\\r")
                   .replace("\t", "\\t");
    }
    
    /**
     * 转换为响应 DTO
     */
    @Override
    protected VersionResponse convertToResponse(DocumentVersion version) {
        return versionConverter.toResponse(version);
    }
    
    // ==================== 定时任务 ====================
    
    /**
     * 每天凌晨 2 点清理过期版本
     */
    @Scheduled(cron = "0 0 2 * * ?")
    @Transactional
    public void cleanupExpiredVersions() {
        int deleted = versionMapper.deleteExpired();
        log.info("定时任务：清理了 {} 个过期版本", deleted);
    }
}
