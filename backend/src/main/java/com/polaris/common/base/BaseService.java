package com.polaris.common.base;

import com.polaris.common.result.PageResult;
import java.util.List;

/**
 * 通用 CRUD Service 接口
 * 
 * @param <E> Entity 类型
 * @param <R> Response DTO 类型
 * @param <C> Create Request DTO 类型
 * @param <U> Update Request DTO 类型
 * @param <Q> Query Request DTO 类型
 */
public interface BaseService<E, R, C, U, Q> {
    
    /**
     * 查询列表（支持分页和过滤）
     * 
     * @param query 查询请求
     * @return 分页结果
     */
    PageResult<R> list(Q query);
    
    /**
     * 统计数量
     * 
     * @param query 查询请求
     * @return 数量
     */
    long count(Q query);
    
    /**
     * 根据 ID 获取详情
     * 
     * @param id 主键 ID
     * @return 响应 DTO
     */
    R getById(Long id);
    
    /**
     * 创建
     * 
     * @param request 创建请求
     * @return 响应 DTO
     */
    R create(C request);
    
    /**
     * 更新
     * 
     * @param id 主键 ID
     * @param request 更新请求
     * @return 响应 DTO
     */
    R update(Long id, U request);
    
    /**
     * 删除（软删除）
     * 
     * @param id 主键 ID
     */
    void delete(Long id);
    
    /**
     * 批量删除（软删除）
     * 
     * @param ids 主键 ID 列表
     */
    void batchDelete(List<Long> ids);
}
