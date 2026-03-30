package com.polaris.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.polaris.common.base.BaseConverter;
import com.polaris.common.base.BaseServiceImpl;
import com.polaris.common.exception.BusinessException;
import com.polaris.common.exception.ErrorCode;
import com.polaris.converter.FavoriteConverter;
import com.polaris.converter.ToolConverter;
import com.polaris.dto.favorite.FavoriteCreateRequest;
import com.polaris.dto.favorite.FavoriteQueryRequest;
import com.polaris.dto.favorite.FavoriteResponse;
import com.polaris.dto.tool.ToolResponse;
import com.polaris.entity.Tool;
import com.polaris.entity.UserFavorite;
import com.polaris.mapper.ToolMapper;
import com.polaris.mapper.UserFavoriteMapper;
import com.polaris.auth.security.UserContext;
import com.polaris.service.FavoriteService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

/**
 * 收藏服务实现类
 * 继承 BaseServiceImpl 以支持标准 CRUD 操作
 * 同时保留特殊的收藏管理方法
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class FavoriteServiceImpl extends BaseServiceImpl<UserFavorite, FavoriteResponse, FavoriteCreateRequest, FavoriteCreateRequest, FavoriteQueryRequest> 
        implements FavoriteService {
    
    private final UserFavoriteMapper userFavoriteMapper;
    private final FavoriteConverter favoriteConverter;
    private final ToolMapper toolMapper;
    private final UserContext userContext;
    private final ToolConverter toolConverter;
    
    @Override
    protected BaseMapper<UserFavorite> getMapper() {
        return userFavoriteMapper;
    }
    
    @Override
    protected BaseConverter<UserFavorite, FavoriteResponse, FavoriteCreateRequest, FavoriteCreateRequest> getConverter() {
        return favoriteConverter;
    }
    
    @Override
    protected String getResourceName() {
        return "收藏";
    }
    
    @Override
    protected LambdaQueryWrapper<UserFavorite> buildQueryWrapper(FavoriteQueryRequest query) {
        Long userId = userContext.getCurrentUserId();
        if (userId == null) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED);
        }
        
        LambdaQueryWrapper<UserFavorite> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(UserFavorite::getUserId, userId);
        wrapper.orderByDesc(UserFavorite::getCreatedAt);
        
        return wrapper;
    }
    
    /**
     * 获取当前用户ID（用于缓存key）
     */
    public Long getCurrentUserId() {
        return userContext.getCurrentUserId();
    }
    
    /**
     * 获取用户收藏列表（按时间降序）
     * 返回 ToolResponse 而不是 FavoriteResponse
     */
    @Override
    @Cacheable(value = "favorites:list", key = "#root.target.getCurrentUserId()", unless = "#result == null || #result.isEmpty()")
    public List<ToolResponse> listFavorites() {
        Long userId = userContext.getCurrentUserId();
        if (userId == null) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED);
        }
        
        log.debug("查询用户收藏列表, userId: {}", userId);
        
        List<Tool> tools = userFavoriteMapper.listFavoriteTools(userId);
        
        return tools.stream()
                .map(this::convertToFavoritedResponse)
                .collect(Collectors.toList());
    }
    
    /**
     * 添加收藏（检查重复）
     */
    @Override
    @Transactional(rollbackFor = Exception.class)
    @CacheEvict(value = "favorites:list", key = "#root.target.getCurrentUserId()")
    public void addFavorite(Long toolId) {
        Long userId = userContext.getCurrentUserId();
        if (userId == null) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED);
        }
        
        // 验证工具是否存在
        Tool tool = toolMapper.selectById(toolId);
        if (tool == null) {
            throw new BusinessException(ErrorCode.TOOL_NOT_FOUND);
        }
        
        // 检查是否已收藏
        boolean exists = userFavoriteMapper.isFavorited(userId, toolId);
        if (exists) {
            throw new BusinessException(ErrorCode.ALREADY_FAVORITED);
        }
        
        // 查找是否有已删除的记录
        UserFavorite existingFavorite = userFavoriteMapper.findByUserIdAndToolId(userId, toolId);
        
        if (existingFavorite != null && existingFavorite.getDeleted() == 1) {
            // 如果存在已删除的记录，则恢复它
            int updated = userFavoriteMapper.restoreFavorite(userId, toolId);
            log.info("恢复收藏记录, userId: {}, toolId: {}, updated: {}", userId, toolId, updated);
        } else {
            // 创建新的收藏记录
            UserFavorite favorite = new UserFavorite();
            favorite.setUserId(userId);
            favorite.setToolId(toolId);
            // createdAt 和 updatedAt 由 MyBatis Plus 自动填充
            
            try {
                userFavoriteMapper.insert(favorite);
            } catch (DuplicateKeyException e) {
                // 并发下的重复插入直接视为已收藏
                throw new BusinessException(ErrorCode.ALREADY_FAVORITED);
            }
            log.info("添加收藏成功, userId: {}, toolId: {}", userId, toolId);
        }
    }
    
    /**
     * 取消收藏
     */
    @Override
    @Transactional(rollbackFor = Exception.class)
    @CacheEvict(value = "favorites:list", key = "#root.target.getCurrentUserId()")
    public void removeFavorite(Long toolId) {
        Long userId = userContext.getCurrentUserId();
        if (userId == null) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED);
        }
        
        // 查找收藏记录
        LambdaQueryWrapper<UserFavorite> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(UserFavorite::getUserId, userId)
               .eq(UserFavorite::getToolId, toolId);
        
        UserFavorite favorite = userFavoriteMapper.selectOne(wrapper);
        if (favorite == null) {
            throw new BusinessException(ErrorCode.FAVORITE_NOT_FOUND);
        }
        
        // 删除收藏记录
        userFavoriteMapper.deleteById(favorite.getId());
        
        log.info("取消收藏成功, userId: {}, toolId: {}", userId, toolId);
    }
    
    /**
     * 检查是否已收藏
     */
    @Override
    public boolean isFavorited(Long toolId) {
        Long userId = userContext.getCurrentUserId();
        if (userId == null) {
            return false;
        }
        
        return userFavoriteMapper.isFavorited(userId, toolId);
    }
    
    /**
     * 转换为响应 DTO，并标记为已收藏
     * 使用 ToolConverter 进行转换，避免重复代码
     */
    private ToolResponse convertToFavoritedResponse(Tool tool) {
        ToolResponse response = toolConverter.toResponse(tool);
        response.setIsFavorited(true); // 收藏列表中的工具都是已收藏的
        return response;
    }
}
