package com.polaris.service;

import com.polaris.common.base.BaseService;
import com.polaris.common.result.PageResult;
import com.polaris.dto.ToolResponse;
import com.polaris.dto.ToolUsageCreateRequest;
import com.polaris.dto.ToolUsageQueryRequest;
import com.polaris.dto.ToolUsageResponse;
import com.polaris.dto.ToolUsageUpdateRequest;
import com.polaris.entity.ToolUsage;

import java.util.List;

/**
 * 使用统计服务接口
 * 继承 BaseService 提供标准 CRUD 操作
 * 同时保留特殊的统计和查询方法
 */
public interface UsageService extends BaseService<ToolUsage, ToolUsageResponse, ToolUsageCreateRequest, ToolUsageUpdateRequest, ToolUsageQueryRequest> {
    
    /**
     * 获取最近使用的工具
     * 
     * @param limit 限制数量
     * @return 工具响应列表
     */
    List<ToolResponse> getRecentTools(Integer limit);
    
    /**
     * 获取热门工具（按 use_count 排序）
     * 
     * @param limit 限制数量
     * @return 工具响应列表
     */
    List<ToolResponse> getPopularTools(Integer limit);
    
    /**
     * 获取用户使用历史（分页）
     * 
     * @param page 页码
     * @param size 每页数量
     * @return 分页结果
     */
    PageResult<ToolUsageResponse> getUserHistory(Integer page, Integer size);
}
