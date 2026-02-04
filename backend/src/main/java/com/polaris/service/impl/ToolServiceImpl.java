package com.polaris.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.polaris.common.base.BaseConverter;
import com.polaris.common.base.BaseServiceImpl;
import com.polaris.common.exception.BusinessException;
import com.polaris.common.exception.ErrorCode;
import com.polaris.common.result.PageResult;
import com.polaris.converter.ToolConverter;
import com.polaris.dto.ToolCreateRequest;
import com.polaris.dto.ToolQueryRequest;
import com.polaris.dto.ToolResponse;
import com.polaris.dto.ToolUpdateRequest;
import com.polaris.entity.Category;
import com.polaris.entity.Tool;
import com.polaris.entity.ToolUsage;
import com.polaris.mapper.CategoryMapper;
import com.polaris.mapper.ToolMapper;
import com.polaris.mapper.ToolUsageMapper;
import com.polaris.mapper.UserFavoriteMapper;
import com.polaris.security.UserContext;
import com.polaris.service.FavoriteService;
import com.polaris.service.ToolService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.HashSet;
import java.util.stream.Collectors;

/**
 * 工具服务实现类
 * 继承 BaseServiceImpl 获得标准 CRUD 操作
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ToolServiceImpl 
        extends BaseServiceImpl<Tool, ToolResponse, ToolCreateRequest, ToolUpdateRequest, ToolQueryRequest>
        implements ToolService {
    
    private final ToolMapper toolMapper;
    private final CategoryMapper categoryMapper;
    private final ToolUsageMapper toolUsageMapper;
    private final UserContext userContext;
    private final ToolConverter toolConverter;
    private final FavoriteService favoriteService;
    private final UserFavoriteMapper userFavoriteMapper;

    private static final ThreadLocal<Set<Long>> FAVORITED_IDS = new ThreadLocal<>();
    
    // ==================== BaseServiceImpl 必需方法 ====================
    
    @Override
    protected BaseMapper<Tool> getMapper() {
        return toolMapper;
    }
    
    @Override
    protected BaseConverter<Tool, ToolResponse, ToolCreateRequest, ToolUpdateRequest> getConverter() {
        return toolConverter;
    }
    
    @Override
    protected String getResourceName() {
        return "工具";
    }
    
    // ==================== 覆盖 list 方法支持查询已删除数据 ====================
    
    @Override
    public PageResult<ToolResponse> list(ToolQueryRequest query) {
        // includeDeleted=true 走自定义查询
        if (Boolean.TRUE.equals(query.getIncludeDeleted())) {
            log.info("查询已删除工具列表: query={}", query);
            
            Page<Tool> page = new Page<>(query.getPage(), query.getSize());
            IPage<Tool> toolPage = toolMapper.selectToolsIncludeDeleted(
                page,
                query.getKeyword(),
                query.getCategoryId(),
                query.getStatus(),
                true
            );
            
            preloadFavorited(toolPage.getRecords());
            try {
                List<ToolResponse> responses = toolPage.getRecords().stream()
                    .map(this::convertToResponse)
                    .collect(Collectors.toList());
                
                PageResult<ToolResponse> result = new PageResult<>();
                result.setList(responses);
                result.setTotal(toolPage.getTotal());
                result.setPages(toolPage.getPages());
                result.setPageNum((int) toolPage.getCurrent());
                result.setPageSize((int) toolPage.getSize());
                
                log.info("查询已删除工具列表成功: total={}", toolPage.getTotal());
                return result;
            } finally {
                FAVORITED_IDS.remove();
            }
        }
        
        // 默认查询（仅未删除）
        LambdaQueryWrapper<Tool> queryWrapper = buildQueryWrapper(query);
        Page<Tool> page = new Page<>(query.getPage(), query.getSize());
        IPage<Tool> toolPage = toolMapper.selectPage(page, queryWrapper);
        
        preloadFavorited(toolPage.getRecords());
        try {
            List<ToolResponse> responses = toolPage.getRecords().stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
            
            PageResult<ToolResponse> result = new PageResult<>();
            result.setList(responses);
            result.setTotal(toolPage.getTotal());
            result.setPages(toolPage.getPages());
            result.setPageNum((int) toolPage.getCurrent());
            result.setPageSize((int) toolPage.getSize());
            
            log.info("查询工具列表成功: total={}, returned={}", toolPage.getTotal(), responses.size());
            return result;
        } finally {
            FAVORITED_IDS.remove();
        }
    }
    
    // ==================== 覆盖 update 方法支持更新已删除数据 ====================
    
    @Override
    @Transactional(rollbackFor = Exception.class)
    public ToolResponse update(Long id, ToolUpdateRequest request) {
        log.info("更新工具开始: id={}, request={}", id, request);
        
        try {
            // 查询工具（包含已删除的数据）
            Tool entity = toolMapper.selectByIdIncludeDeleted(id);
            if (entity == null) {
                log.warn("更新工具失败，工具不存在: id={}", id);
                throw new BusinessException(ErrorCode.INVALID_PARAMETER, "工具不存在");
            }
            
            // 记录旧值（用于日志）
            Tool oldEntity = cloneEntity(entity);
            
            // 执行更新前验证（子类可以覆盖）
            validateUpdate(entity, request);
            
            // 执行更新前处理（子类可以覆盖）
            beforeUpdate(entity, request);
            
            // 更新实体
            getConverter().updateEntity(entity, request);
            entity.setUpdatedAt(LocalDateTime.now());
            
            // 使用自定义更新方法（不受逻辑删除限制）
            toolMapper.updateByIdIncludeDeleted(
                entity.getId(),
                entity.getName(),
                entity.getNameZh(),
                entity.getDescription(),
                entity.getDescriptionZh(),
                entity.getIcon(),
                entity.getUrl(),
                entity.getColorClass(),
                entity.getBgHoverClass(),
                entity.getCategoryId(),
                entity.getToolType(),
                entity.getStatus(),
                entity.getIsFeatured(),
                entity.getSortOrder(),
                entity.getViewCount(),
                entity.getUseCount(),
                entity.getUpdatedAt()
            );
            
            // 执行更新后处理（子类可以覆盖）
            afterUpdate(entity, request);
            
            log.info("更新工具成功: id={}, oldEntity={}, newEntity={}", id, oldEntity, entity);
            
            return convertToResponse(entity);
        } catch (BusinessException e) {
            log.warn("更新工具失败: id={}, request={}, error={}", id, request, e.getMessage());
            throw e;
        } catch (Exception e) {
            log.error("更新工具异常: id={}, request={}, error={}", id, request, e.getMessage(), e);
            throw e;
        }
    }
    
    // ==================== 覆盖 delete 方法支持删除已删除数据检查 ====================
    
    @Override
    @Transactional(rollbackFor = Exception.class)
    public void delete(Long id) {
        log.info("删除工具开始: id={}", id);
        
        try {
            // 查询工具（包含已删除的数据）
            Tool entity = toolMapper.selectByIdIncludeDeleted(id);
            if (entity == null) {
                log.warn("删除工具失败，工具不存在: id={}", id);
                throw new BusinessException(ErrorCode.INVALID_PARAMETER, "工具不存在");
            }
            
            // 检查是否已删除
            if (entity.getDeleted() == 1) {
                log.warn("删除工具失败，工具已被删除: id={}", id);
                throw new BusinessException(ErrorCode.INVALID_PARAMETER, "工具已被删除");
            }
            
            // 执行删除前验证（子类可以覆盖）
            validateDelete(entity);
            
            // 执行删除前处理（子类可以覆盖）
            beforeDelete(entity);
            
            // 软删除
            toolMapper.deleteById(id);
            
            // 执行删除后处理（子类可以覆盖）
            afterDelete(entity);
            
            log.info("删除工具成功: id={}", id);
        } catch (BusinessException e) {
            log.warn("删除工具失败: id={}, error={}", id, e.getMessage());
            throw e;
        } catch (Exception e) {
            log.error("删除工具异常: id={}, error={}", id, e.getMessage(), e);
            throw e;
        }
    }
    
    // ==================== 覆盖 getById 方法支持查询已删除数据 ====================
    
    @Override
    public ToolResponse getById(Long id) {
        log.info("查询工具详情: id={}", id);
        
        Tool entity = toolMapper.selectById(id);
        if (entity == null || entity.getDeleted() == 1) {
            log.warn("查询工具详情失败，工具不存在或已删除: id={}", id);
            throw new BusinessException(ErrorCode.INVALID_PARAMETER, "工具不存在");
        }
        
        return convertToResponse(entity);
    }
    
    // ==================== 构建查询条件 ====================
    
    @Override
    protected LambdaQueryWrapper<Tool> buildQueryWrapper(ToolQueryRequest query) {
        LambdaQueryWrapper<Tool> queryWrapper = new LambdaQueryWrapper<>();
        
        // 显式过滤：只查询未删除的数据（deleted=0）
        // 注意：虽然配置了 @TableLogic，但显式添加条件更可靠
        queryWrapper.eq(Tool::getDeleted, 0);
        
        // 状态过滤 - 如果传入了状态参数则按状态筛选
        // 如果没有传入状态参数，默认只查询启用状态（status=1）的工具
        if (query.getStatus() != null) {
            queryWrapper.eq(Tool::getStatus, query.getStatus());
        } else {
            // 默认只返回启用状态的工具（普通用户访问）
            queryWrapper.eq(Tool::getStatus, 1);
        }
        
        // 分类过滤
        if (query.getCategoryId() != null) {
            queryWrapper.eq(Tool::getCategoryId, query.getCategoryId());
        }
        
        // 工具类型过滤
        if (query.getToolType() != null) {
            queryWrapper.eq(Tool::getToolType, query.getToolType());
        }
        
        // 是否精选过滤
        if (query.getIsFeatured() != null) {
            queryWrapper.eq(Tool::getIsFeatured, query.getIsFeatured());
        }
        
        // 关键词搜索（搜索名称和描述）
        if (query.getKeyword() != null && !query.getKeyword().trim().isEmpty()) {
            String keyword = query.getKeyword().trim();
            queryWrapper.and(wrapper -> wrapper
                .like(Tool::getName, keyword)
                .or()
                .like(Tool::getNameZh, keyword)
                .or()
                .like(Tool::getDescription, keyword)
                .or()
                .like(Tool::getDescriptionZh, keyword));
        }
        
        // 排序 - 支持 sortOrder, viewCount, useCount, createdAt, rating
        applySorting(queryWrapper, query.getSortBy(), query.getSortOrder());
        
        return queryWrapper;
    }
    
    /**
     * 应用排序到 QueryWrapper
     */
    private void applySorting(LambdaQueryWrapper<Tool> queryWrapper, String sortBy, String sortOrder) {
        boolean isAsc = "asc".equalsIgnoreCase(sortOrder);
        
        switch (sortBy) {
            case "viewCount":
                queryWrapper.orderBy(true, isAsc, Tool::getViewCount);
                break;
            case "useCount":
                queryWrapper.orderBy(true, isAsc, Tool::getUseCount);
                break;
            case "createdAt":
                queryWrapper.orderBy(true, isAsc, Tool::getCreatedAt);
                break;
            case "rating":
                // Rating 功能尚未实现，暂时按 sortOrder 排序
                log.warn("Rating sort not yet implemented, falling back to sortOrder");
                queryWrapper.orderBy(true, isAsc, Tool::getSortOrder);
                queryWrapper.orderByDesc(Tool::getCreatedAt);
                break;
            case "sortOrder":
            default:
                queryWrapper.orderBy(true, isAsc, Tool::getSortOrder);
                // 添加次要排序：创建时间降序
                queryWrapper.orderByDesc(Tool::getCreatedAt);
                break;
        }
    }
    
    /**
     * 预加载当前用户对给定工具列表的收藏状态，降低 N+1 查询
     */
    private void preloadFavorited(List<Tool> tools) {
        Long userId = userContext.getCurrentUserId();
        if (userId == null || tools == null || tools.isEmpty()) {
            FAVORITED_IDS.set(null);
            return;
        }
        
        List<Long> toolIds = tools.stream()
                .map(Tool::getId)
                .collect(Collectors.toList());
        
        List<Long> favoritedIds = userFavoriteMapper.listFavoritedToolIds(userId, toolIds);
        FAVORITED_IDS.set(new HashSet<>(favoritedIds));
    }
    
    // ==================== 转换为响应 DTO ====================
    
    @Override
    protected ToolResponse convertToResponse(Tool tool) {
        ToolResponse response = toolConverter.toResponse(tool);
        
        // 设置是否已收藏（仅对已登录用户）
        try {
            Set<Long> cached = FAVORITED_IDS.get();
            if (cached != null) {
                response.setIsFavorited(cached.contains(tool.getId()));
            } else {
                Long currentUserId = userContext.getCurrentUserId();
                if (currentUserId != null) {
                    boolean isFavorited = favoriteService.isFavorited(tool.getId());
                    response.setIsFavorited(isFavorited);
                } else {
                    response.setIsFavorited(false);
                }
            }
        } catch (Exception e) {
            // 如果获取用户信息失败（如未登录），默认为未收藏
            response.setIsFavorited(false);
        }
        
        return response;
    }
    
    // ==================== 钩子方法：验证和处理 ====================
    
    @Override
    protected void validateCreate(ToolCreateRequest request) {
        Long adminId = userContext.getCurrentUserId();
        log.info("管理员创建工具，验证开始: adminId={}, categoryId={}", adminId, request.getCategoryId());
        
        // 验证分类存在
        Category category = categoryMapper.selectById(request.getCategoryId());
        if (category == null) {
            log.warn("管理员创建工具失败，分类不存在: adminId={}, categoryId={}", adminId, request.getCategoryId());
            throw new BusinessException(ErrorCode.INVALID_PARAMETER, "分类不存在");
        }
    }
    
    @Override
    protected void validateUpdate(Tool entity, ToolUpdateRequest request) {
        Long adminId = userContext.getCurrentUserId();
        log.info("管理员更新工具，验证开始: adminId={}, toolId={}, categoryId={}", 
                 adminId, entity.getId(), request.getCategoryId());
        
        // 如果更新分类，验证分类存在
        if (request.getCategoryId() != null) {
            Category category = categoryMapper.selectById(request.getCategoryId());
            if (category == null) {
                log.warn("管理员更新工具失败，分类不存在: adminId={}, toolId={}, categoryId={}", 
                         adminId, entity.getId(), request.getCategoryId());
                throw new BusinessException(ErrorCode.INVALID_PARAMETER, "分类不存在");
            }
        }
    }
    
    // ==================== 扩展方法实现 ====================
    
    @Override
    @Transactional(rollbackFor = Exception.class)
    public void incrementViewCount(Long id) {
        log.debug("增加工具浏览计数: toolId={}", id);
        
        int result = toolMapper.incrementViewCount(id);
        if (result <= 0) {
            log.warn("增加浏览计数失败: toolId={}", id);
        }
    }
    
    @Override
    @Transactional(rollbackFor = Exception.class)
    public void recordToolUsage(Long id, String authHeader, HttpServletRequest request) {
        log.info("记录工具使用开始: toolId={}, hasAuth={}", id, authHeader != null);
        
        try {
            // 验证工具存在
            Tool tool = toolMapper.selectById(id);
            if (tool == null) {
                log.warn("记录工具使用失败，工具不存在: toolId={}", id);
                throw new BusinessException(ErrorCode.INVALID_PARAMETER, "工具不存在");
            }
            
            // 尝试从 Authorization header 提取用户 ID
            Long userId = extractUserIdFromAuth(authHeader);
            
            // 获取 IP 地址
            String ipAddress = getClientIpAddress(request);
            
            // 获取 User-Agent
            String userAgent = request.getHeader("User-Agent");
            
            // 创建使用记录
            ToolUsage toolUsage = new ToolUsage();
            toolUsage.setUserId(userId != null ? userId : 0L); // 0 表示匿名用户
            toolUsage.setToolId(id);
            toolUsage.setUsedAt(LocalDateTime.now());
            toolUsage.setIpAddress(ipAddress);
            toolUsage.setUserAgent(userAgent);
            
            // 保存使用记录
            toolUsageMapper.insert(toolUsage);
            
            // 原子性增加使用计数
            toolMapper.incrementUseCount(id);
            
            String userType = userId != null ? "登录用户" : "匿名用户";
            log.info("记录工具使用成功: toolId={}, toolName={}, userType={}, userId={}, ip={}, usageId={}", 
                     id, tool.getName(), userType, userId != null ? userId : "anonymous", ipAddress, toolUsage.getId());
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            log.error("记录工具使用异常: toolId={}, error={}", id, e.getMessage(), e);
            throw e;
        }
    }
    
    /**
     * 记录工具使用并返回使用记录 ID
     */
    private Long recordToolUsageAndReturnId(Long id, String authHeader, HttpServletRequest request) {
        log.info("记录工具使用开始: toolId={}, hasAuth={}", id, authHeader != null);
        
        try {
            // 验证工具存在
            Tool tool = toolMapper.selectById(id);
            if (tool == null) {
                log.warn("记录工具使用失败，工具不存在: toolId={}", id);
                throw new BusinessException(ErrorCode.INVALID_PARAMETER, "工具不存在");
            }
            
            // 尝试从 Authorization header 提取用户 ID
            Long userId = extractUserIdFromAuth(authHeader);
            
            // 获取 IP 地址
            String ipAddress = getClientIpAddress(request);
            
            // 获取 User-Agent
            String userAgent = request.getHeader("User-Agent");
            
            // 创建使用记录
            ToolUsage toolUsage = new ToolUsage();
            toolUsage.setUserId(userId != null ? userId : 0L); // 0 表示匿名用户
            toolUsage.setToolId(id);
            toolUsage.setUsedAt(LocalDateTime.now());
            toolUsage.setIpAddress(ipAddress);
            toolUsage.setUserAgent(userAgent);
            
            // 保存使用记录
            toolUsageMapper.insert(toolUsage);
            
            // 原子性增加使用计数
            toolMapper.incrementUseCount(id);
            
            String userType = userId != null ? "登录用户" : "匿名用户";
            log.info("记录工具使用成功: toolId={}, toolName={}, userType={}, userId={}, ip={}, usageId={}", 
                     id, tool.getName(), userType, userId != null ? userId : "anonymous", ipAddress, toolUsage.getId());
            
            return toolUsage.getId();
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            log.error("记录工具使用异常: toolId={}, error={}", id, e.getMessage(), e);
            throw e;
        }
    }
    
    @Override
    @Transactional(rollbackFor = Exception.class)
    public Long recordToolUsageByUrl(String url, String authHeader, HttpServletRequest request) {
        log.info("通过 URL 记录工具使用: url={}, hasAuth={}", url, authHeader != null);
        
        if (url == null || url.isEmpty()) {
            log.warn("URL 为空，无法记录使用");
            return null;
        }
        
        // 通过 URL 查找工具
        Tool tool = toolMapper.selectByUrl(url);
        if (tool == null) {
            log.warn("未找到对应的工具: url={}", url);
            // 不抛出异常，静默失败
            return null;
        }
        
        // 调用记录方法并返回 ID
        return recordToolUsageAndReturnId(tool.getId(), authHeader, request);
    }
    
    @Override
    @Transactional(rollbackFor = Exception.class)
    public void updateUsageDuration(Long usageId, Integer duration) {
        log.info("更新使用时长: usageId={}, duration={}s", usageId, duration);
        
        if (usageId == null || duration == null) {
            log.warn("参数无效: usageId={}, duration={}", usageId, duration);
            return;
        }
        
        // 限制最大时长为 24 小时（86400 秒）
        if (duration > 86400) {
            duration = 86400;
        }
        
        // 更新使用时长
        ToolUsage toolUsage = toolUsageMapper.selectById(usageId);
        if (toolUsage == null) {
            log.warn("使用记录不存在: usageId={}", usageId);
            return;
        }
        
        toolUsage.setDuration(duration);
        toolUsageMapper.updateById(toolUsage);
        
        log.info("更新使用时长成功: usageId={}, duration={}s", usageId, duration);
    }
    
    /**
     * 从 Authorization header 提取用户 ID
     * 
     * @param authHeader Authorization header
     * @return 用户 ID，如果无效或不存在则返回 null
     */
    private Long extractUserIdFromAuth(String authHeader) {
        if (authHeader == null || authHeader.isEmpty()) {
            log.debug("无 Authorization header，作为匿名用户处理");
            return null;
        }
        
        if (!authHeader.startsWith("Bearer ")) {
            log.debug("Authorization header 格式无效，作为匿名用户处理");
            return null;
        }
        
        try {
            // 使用 JwtTokenProvider 验证并提取用户 ID
            // 注意：这里需要注入 JwtTokenProvider
            // 但为了避免循环依赖，我们直接解析 token
            // 如果 token 无效，捕获异常并返回 null
            
            // 简单验证：尝试从 UserContext 获取（如果 JWT filter 已处理）
            Long userId = userContext.getCurrentUserId();
            if (userId != null) {
                log.debug("从 UserContext 获取用户 ID: userId={}", userId);
                return userId;
            }
            
            // 如果 UserContext 没有用户信息，说明 token 可能无效或未经过 filter
            // 这种情况下作为匿名用户处理
            log.debug("UserContext 中无用户信息，作为匿名用户处理");
            return null;
        } catch (Exception e) {
            log.debug("解析 token 失败，作为匿名用户处理: error={}", e.getMessage());
            return null;
        }
    }
    
    // ==================== 私有辅助方法 ====================
    
    @Override
    @Transactional(rollbackFor = Exception.class)
    public void restoreTool(Long id) {
        Long adminId = userContext.getCurrentUserId();
        log.info("管理员恢复工具开始: toolId={}, adminId={}", id, adminId);
        
        try {
            // 查询工具（包含已删除）
            Tool tool = toolMapper.selectByIdIncludeDeleted(id);
            if (tool == null) {
                log.warn("管理员恢复工具失败，工具不存在: toolId={}, adminId={}", id, adminId);
                throw new BusinessException(ErrorCode.TOOL_NOT_FOUND);
            }
            
            // 检查是否已删除
            if (tool.getDeleted() != 1) {
                log.warn("管理员恢复工具失败，工具未被删除: toolId={}, deleted={}, adminId={}", 
                         id, tool.getDeleted(), adminId);
                throw new BusinessException(ErrorCode.INVALID_PARAMETER, "只能恢复已删除的工具");
            }
            
            // 验证分类是否存在且未删除
            Category category = categoryMapper.selectById(tool.getCategoryId());
            if (category == null || category.getDeleted() == 1) {
                log.warn("管理员恢复工具失败，关联分类不存在或已删除: toolId={}, categoryId={}, adminId={}", 
                         id, tool.getCategoryId(), adminId);
                throw new BusinessException(ErrorCode.INVALID_PARAMETER, "关联分类不存在或已删除");
            }
            
            // 恢复工具（设置 deleted=0）
            int rows = toolMapper.restoreById(id);
            if (rows == 0) {
                log.error("管理员恢复工具失败，数据库更新失败: toolId={}, adminId={}", id, adminId);
                throw new BusinessException(ErrorCode.INTERNAL_ERROR, "恢复工具失败");
            }
            
            log.info("管理员恢复工具成功: toolId={}, toolName={}, categoryId={}, adminId={}", 
                     id, tool.getName(), tool.getCategoryId(), adminId);
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            log.error("管理员恢复工具异常: toolId={}, adminId={}, error={}", id, adminId, e.getMessage(), e);
            throw e;
        }
    }
    
    @Override
    @Transactional(rollbackFor = Exception.class)
    public void hardDeleteTool(Long id) {
        Long adminId = userContext.getCurrentUserId();
        log.info("管理员永久删除工具开始: toolId={}, adminId={}", id, adminId);
        
        try {
            // 查询工具（包含已删除）
            Tool tool = toolMapper.selectByIdIncludeDeleted(id);
            if (tool == null) {
                log.warn("管理员永久删除工具失败，工具不存在: toolId={}, adminId={}", id, adminId);
                throw new BusinessException(ErrorCode.TOOL_NOT_FOUND);
            }
            
            // 检查是否已软删除
            if (tool.getDeleted() != 1) {
                log.warn("管理员永久删除工具失败，只能永久删除已软删除的记录: toolId={}, deleted={}, adminId={}", 
                         id, tool.getDeleted(), adminId);
                throw new BusinessException(ErrorCode.INVALID_PARAMETER, "只能永久删除已软删除的记录");
            }
            
            // 记录被永久删除的工具信息
            log.info("管理员永久删除工具，记录删除数据: toolId={}, toolName={}, categoryId={}, status={}, adminId={}",
                     id, tool.getName(), tool.getCategoryId(), tool.getStatus(), adminId);
            
            // 物理删除
            int rows = toolMapper.hardDeleteById(id);
            if (rows == 0) {
                log.error("管理员永久删除工具失败，数据库删除失败: toolId={}, adminId={}", id, adminId);
                throw new BusinessException(ErrorCode.INTERNAL_ERROR, "永久删除工具失败");
            }
            
            log.info("管理员永久删除工具成功: toolId={}, adminId={}", id, adminId);
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            log.error("管理员永久删除工具异常: toolId={}, adminId={}, error={}", id, adminId, e.getMessage(), e);
            throw e;
        }
    }
    
    /**
     * 获取客户端 IP 地址
     */
    private String getClientIpAddress(HttpServletRequest request) {
        String ip = request.getHeader("X-Forwarded-For");
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("Proxy-Client-IP");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("WL-Proxy-Client-IP");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("HTTP_CLIENT_IP");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("HTTP_X_FORWARDED_FOR");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getRemoteAddr();
        }
        
        // 处理多个 IP 的情况，取第一个
        if (ip != null && ip.contains(",")) {
            ip = ip.split(",")[0].trim();
        }
        
        return ip;
    }
}
