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
import com.polaris.converter.ToolUsageConverter;
import com.polaris.dto.tool.ToolResponse;
import com.polaris.dto.tool.ToolUsageCreateRequest;
import com.polaris.dto.tool.ToolUsageQueryRequest;
import com.polaris.dto.tool.ToolUsageResponse;
import com.polaris.dto.tool.ToolUsageUpdateRequest;
import com.polaris.entity.Tool;
import com.polaris.entity.ToolUsage;
import com.polaris.mapper.ToolMapper;
import com.polaris.mapper.ToolUsageMapper;
import com.polaris.auth.security.UserContext;
import com.polaris.service.UsageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

/**
 * 使用统计服务实现类
 * 继承 BaseServiceImpl 提供标准 CRUD 操作
 * 同时保留特殊的统计和查询方法
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class UsageServiceImpl extends BaseServiceImpl<ToolUsage, ToolUsageResponse, ToolUsageCreateRequest, ToolUsageUpdateRequest, ToolUsageQueryRequest> 
        implements UsageService {
    
    private final ToolUsageMapper toolUsageMapper;
    private final ToolUsageConverter toolUsageConverter;
    private final ToolMapper toolMapper;
    private final UserContext userContext;
    private final ToolConverter toolConverter;
    
    @Override
    protected BaseMapper<ToolUsage> getMapper() {
        return toolUsageMapper;
    }
    
    @Override
    protected BaseConverter<ToolUsage, ToolUsageResponse, ToolUsageCreateRequest, ToolUsageUpdateRequest> getConverter() {
        return toolUsageConverter;
    }
    
    @Override
    protected String getResourceName() {
        return "工具使用记录";
    }
    
    @Override
    protected LambdaQueryWrapper<ToolUsage> buildQueryWrapper(ToolUsageQueryRequest query) {
        LambdaQueryWrapper<ToolUsage> wrapper = new LambdaQueryWrapper<>();
        
        if (query.getUserId() != null) {
            wrapper.eq(ToolUsage::getUserId, query.getUserId());
        }
        
        if (query.getToolId() != null) {
            wrapper.eq(ToolUsage::getToolId, query.getToolId());
        }
        
        // 按使用时间倒序排列
        wrapper.orderByDesc(ToolUsage::getUsedAt);
        
        return wrapper;
    }
    
    @Override
    public List<ToolResponse> getRecentTools(Integer limit) {
        Long userId = userContext.getCurrentUserId();
        if (userId == null) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED);
        }
        
        // 设置默认限制
        if (limit == null || limit <= 0) {
            limit = 10;
        }
        
        log.debug("查询最近使用的工具, userId: {}, limit: {}", userId, limit);
        
        List<Tool> tools = toolUsageMapper.getRecentTools(userId, limit);
        
        return tools.stream()
                .map(toolConverter::toResponse)
                .collect(Collectors.toList());
    }
    
    @Override
    @Cacheable(value = "usage:popular", key = "#limit", unless = "#result == null || #result.isEmpty()")
    public List<ToolResponse> getPopularTools(Integer limit) {
        // 设置默认限制
        if (limit == null || limit <= 0) {
            limit = 10;
        }
        
        log.debug("查询热门工具, limit: {}", limit);
        
        List<Tool> tools = toolMapper.getPopularTools(limit);
        
        return tools.stream()
                .map(toolConverter::toResponse)
                .collect(Collectors.toList());
    }
    
    @Override
    public PageResult<ToolUsageResponse> getUserHistory(Integer page, Integer size) {
        Long userId = userContext.getCurrentUserId();
        if (userId == null) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED);
        }
        
        // 设置默认分页参数
        if (page == null || page <= 0) {
            page = 1;
        }
        if (size == null || size <= 0) {
            size = 20;
        }
        
        log.debug("查询用户使用历史, userId: {}, page: {}, size: {}", userId, page, size);
        
        Page<ToolUsage> pageParam = new Page<>(page, size);
        IPage<ToolUsage> pageResult = toolUsageMapper.getUserHistory(userId, pageParam);
        
        List<ToolUsageResponse> records = pageResult.getRecords().stream()
                .map(toolUsageConverter::toResponse)
                .collect(Collectors.toList());
        
        return new PageResult<>(records, pageResult.getTotal(), pageResult.getPages(), 
                               (int) pageResult.getCurrent(), (int) pageResult.getSize());
    }
}
