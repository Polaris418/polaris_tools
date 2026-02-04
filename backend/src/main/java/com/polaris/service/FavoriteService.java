package com.polaris.service;

import com.polaris.common.base.BaseService;
import com.polaris.dto.FavoriteCreateRequest;
import com.polaris.dto.FavoriteQueryRequest;
import com.polaris.dto.FavoriteResponse;
import com.polaris.dto.ToolResponse;
import com.polaris.entity.UserFavorite;

import java.util.List;

/**
 * 收藏服务接口
 * 继承 BaseService 以支持标准 CRUD 操作
 * 同时保留特殊的收藏管理方法
 */
public interface FavoriteService extends BaseService<UserFavorite, FavoriteResponse, FavoriteCreateRequest, FavoriteCreateRequest, FavoriteQueryRequest> {
    
    /**
     * 获取用户收藏列表（按时间降序）
     * 
     * @return 工具响应列表
     */
    List<ToolResponse> listFavorites();
    
    /**
     * 添加收藏（检查重复）
     * 
     * @param toolId 工具 ID
     */
    void addFavorite(Long toolId);
    
    /**
     * 取消收藏
     * 
     * @param toolId 工具 ID
     */
    void removeFavorite(Long toolId);
    
    /**
     * 检查是否已收藏
     * 
     * @param toolId 工具 ID
     * @return 是否已收藏
     */
    boolean isFavorited(Long toolId);
}
