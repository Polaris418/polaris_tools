package com.polaris.common.base;

import com.polaris.common.result.PageResult;
import com.polaris.common.result.Result;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.validation.Valid;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 通用 CRUD Controller
 * 提供标准的 REST API 端点
 * 
 * @param <E> Entity 类型
 * @param <R> Response DTO 类型
 * @param <C> Create Request DTO 类型
 * @param <U> Update Request DTO 类型
 * @param <Q> Query Request DTO 类型
 */
@Slf4j
public abstract class BaseController<E, R, C, U, Q> {
    
    /**
     * 子类需要提供 Service
     */
    protected abstract BaseService<E, R, C, U, Q> getService();
    
    /**
     * 获取资源名称（用于日志和 Swagger 文档）
     */
    protected abstract String getResourceName();
    
    /**
     * 获取列表
     */
    @GetMapping
    @Operation(summary = "获取列表")
    public Result<PageResult<R>> list(@Valid Q query) {
        log.info("获取{}列表, query: {}", getResourceName(), query);
        
        PageResult<R> result = getService().list(query);
        
        return Result.success(result);
    }
    
    /**
     * 获取详情
     */
    @GetMapping("/{id}")
    @Operation(summary = "获取详情")
    public Result<R> getById(@PathVariable Long id) {
        log.info("获取{}详情, id: {}", getResourceName(), id);
        
        R response = getService().getById(id);
        
        return Result.success(response);
    }
    
    /**
     * 创建
     */
    @PostMapping
    @Operation(summary = "创建")
    public Result<R> create(@Valid @RequestBody C request) {
        log.info("创建{}, request: {}", getResourceName(), request);
        
        R response = getService().create(request);
        
        return Result.success(response);
    }
    
    /**
     * 更新
     */
    @PutMapping("/{id}")
    @Operation(summary = "更新")
    public Result<R> update(@PathVariable Long id, @Valid @RequestBody U request) {
        log.info("更新{}, id: {}, request: {}", getResourceName(), id, request);
        
        R response = getService().update(id, request);
        
        return Result.success(response);
    }
    
    /**
     * 删除
     */
    @DeleteMapping("/{id}")
    @Operation(summary = "删除")
    public Result<Void> delete(@PathVariable Long id) {
        log.info("删除{}, id: {}", getResourceName(), id);
        
        getService().delete(id);
        
        return Result.success(null);
    }
    
    /**
     * 批量删除
     */
    @DeleteMapping("/batch")
    @Operation(summary = "批量删除")
    public Result<Void> batchDelete(@RequestBody List<Long> ids) {
        log.info("批量删除{}, ids: {}", getResourceName(), ids);
        
        getService().batchDelete(ids);
        
        return Result.success(null);
    }
}
