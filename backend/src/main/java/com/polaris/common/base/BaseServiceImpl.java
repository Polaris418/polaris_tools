package com.polaris.common.base;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.polaris.common.exception.BusinessException;
import com.polaris.common.exception.ErrorCode;
import com.polaris.common.result.PageResult;
import lombok.extern.slf4j.Slf4j;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

/**
 * 通用 CRUD Service 实现
 * 提供默认的 CRUD 操作，子类可以覆盖
 * 
 * @param <E> Entity 类型
 * @param <R> Response DTO 类型
 * @param <C> Create Request DTO 类型
 * @param <U> Update Request DTO 类型
 * @param <Q> Query Request DTO 类型
 */
@Slf4j
public abstract class BaseServiceImpl<E extends BaseEntity, R, C, U, Q extends BaseRequest> 
        implements BaseService<E, R, C, U, Q> {
    
    /**
     * 子类需要提供 Mapper
     */
    protected abstract BaseMapper<E> getMapper();
    
    /**
     * 子类需要提供 Converter
     */
    protected abstract BaseConverter<E, R, C, U> getConverter();
    
    /**
     * 获取资源名称（用于日志和错误消息）
     */
    protected abstract String getResourceName();
    
    @Override
    public PageResult<R> list(Q query) {
        log.info("查询{}列表开始: query={}", getResourceName(), query);
        
        try {
            // 构建查询条件
            LambdaQueryWrapper<E> queryWrapper = buildQueryWrapper(query);
            
            // 分页查询
            Page<E> page = new Page<>(query.getPage(), query.getSize());
            IPage<E> entityPage = getMapper().selectPage(page, queryWrapper);
            
            // 转换为响应 DTO
            List<R> responses = entityPage.getRecords().stream()
                    .map(this::convertToResponse)
                    .collect(Collectors.toList());
            
            // 构建分页结果
            PageResult<R> result = new PageResult<>();
            result.setList(responses);
            result.setTotal(entityPage.getTotal());
            result.setPages(entityPage.getPages());
            result.setPageNum((int) entityPage.getCurrent());
            result.setPageSize((int) entityPage.getSize());
            
            log.info("查询{}列表成功: total={}, returned={}", getResourceName(), entityPage.getTotal(), responses.size());
            
            return result;
        } catch (Exception e) {
            log.error("查询{}列表失败: query={}, error={}", getResourceName(), query, e.getMessage(), e);
            throw e;
        }
    }
    
    @Override
    public long count(Q query) {
        LambdaQueryWrapper<E> queryWrapper = buildQueryWrapper(query);
        return getMapper().selectCount(queryWrapper);
    }
    
    @Override
    public R getById(Long id) {
        log.info("获取{}详情开始: id={}", getResourceName(), id);
        
        try {
            E entity = getMapper().selectById(id);
            if (entity == null) {
                log.warn("获取{}详情失败，资源不存在: id={}", getResourceName(), id);
                throw new BusinessException(ErrorCode.INVALID_PARAMETER, getResourceName() + "不存在");
            }
            
            // 执行额外的验证（子类可以覆盖）
            validateGetById(entity);
            
            log.info("获取{}详情成功: id={}", getResourceName(), id);
            
            return convertToResponse(entity);
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            log.error("获取{}详情异常: id={}, error={}", getResourceName(), id, e.getMessage(), e);
            throw e;
        }
    }
    
    @Override
    public R create(C request) {
        log.info("创建{}开始: request={}", getResourceName(), request);
        
        try {
            // 执行创建前验证（子类可以覆盖）
            validateCreate(request);
            
            // 转换为实体
            E entity = getConverter().toEntity(request);
            
            // 执行创建前处理（子类可以覆盖）
            beforeCreate(entity, request);
            
            // 保存到数据库
            getMapper().insert(entity);
            
            // 执行创建后处理（子类可以覆盖）
            afterCreate(entity, request);
            
            log.info("创建{}成功: id={}, entity={}", getResourceName(), entity.getId(), entity);
            
            return convertToResponse(entity);
        } catch (BusinessException e) {
            log.warn("创建{}失败: request={}, error={}", getResourceName(), request, e.getMessage());
            throw e;
        } catch (Exception e) {
            log.error("创建{}异常: request={}, error={}", getResourceName(), request, e.getMessage(), e);
            throw e;
        }
    }
    
    @Override
    public R update(Long id, U request) {
        log.info("更新{}开始: id={}, request={}", getResourceName(), id, request);
        
        try {
            // 验证实体存在
            E entity = getMapper().selectById(id);
            if (entity == null) {
                log.warn("更新{}失败，资源不存在: id={}", getResourceName(), id);
                throw new BusinessException(ErrorCode.INVALID_PARAMETER, getResourceName() + "不存在");
            }
            
            // 记录旧值（用于日志）
            E oldEntity = cloneEntity(entity);
            
            // 执行更新前验证（子类可以覆盖）
            validateUpdate(entity, request);
            
            // 执行更新前处理（子类可以覆盖）
            beforeUpdate(entity, request);
            
            // 更新实体
            getConverter().updateEntity(entity, request);
            entity.setUpdatedAt(LocalDateTime.now());
            
            // 保存到数据库
            getMapper().updateById(entity);
            
            // 执行更新后处理（子类可以覆盖）
            afterUpdate(entity, request);
            
            log.info("更新{}成功: id={}, oldEntity={}, newEntity={}", getResourceName(), id, oldEntity, entity);
            
            return convertToResponse(entity);
        } catch (BusinessException e) {
            log.warn("更新{}失败: id={}, request={}, error={}", getResourceName(), id, request, e.getMessage());
            throw e;
        } catch (Exception e) {
            log.error("更新{}异常: id={}, request={}, error={}", getResourceName(), id, request, e.getMessage(), e);
            throw e;
        }
    }
    
    @Override
    public void delete(Long id) {
        log.info("删除{}开始: id={}", getResourceName(), id);
        
        try {
            // 验证实体存在
            E entity = getMapper().selectById(id);
            if (entity == null) {
                log.warn("删除{}失败，资源不存在: id={}", getResourceName(), id);
                throw new BusinessException(ErrorCode.INVALID_PARAMETER, getResourceName() + "不存在");
            }
            
            // 执行删除前验证（子类可以覆盖）
            validateDelete(entity);
            
            // 执行删除前处理（子类可以覆盖）
            beforeDelete(entity);
            
            // 记录被删除的数据
            log.info("删除{}，记录删除数据: id={}, entity={}", getResourceName(), id, entity);
            
            // 软删除（MyBatis-Plus 会自动设置 deleted=1）
            getMapper().deleteById(id);
            
            // 执行删除后处理（子类可以覆盖）
            afterDelete(entity);
            
            log.info("删除{}成功: id={}", getResourceName(), id);
        } catch (BusinessException e) {
            log.warn("删除{}失败: id={}, error={}", getResourceName(), id, e.getMessage());
            throw e;
        } catch (Exception e) {
            log.error("删除{}异常: id={}, error={}", getResourceName(), id, e.getMessage(), e);
            throw e;
        }
    }
    
    @Override
    public void batchDelete(List<Long> ids) {
        log.info("批量删除{}开始: ids={}, count={}", getResourceName(), ids, ids.size());
        
        try {
            ids.forEach(this::delete);
            
            log.info("批量删除{}成功: count={}", getResourceName(), ids.size());
        } catch (Exception e) {
            log.error("批量删除{}异常: ids={}, error={}", getResourceName(), ids, e.getMessage(), e);
            throw e;
        }
    }
    
    // ==================== 钩子方法（子类可以覆盖） ====================
    
    /**
     * 克隆实体（用于记录旧值）
     * 子类可以覆盖以提供更高效的克隆方式
     */
    protected E cloneEntity(E entity) {
        if (entity == null) {
            return null;
        }
        try {
            @SuppressWarnings("unchecked")
            E copy = (E) entity.getClass().getDeclaredConstructor().newInstance();
            org.springframework.beans.BeanUtils.copyProperties(entity, copy);
            return copy;
        } catch (Exception e) {
            // 克隆失败时返回原引用，避免主流程中断
            return entity;
        }
    }
    
    /**
     * 构建查询条件（子类可以覆盖）
     */
    protected LambdaQueryWrapper<E> buildQueryWrapper(Q query) {
        return new LambdaQueryWrapper<>();
    }
    
    /**
     * 转换为响应 DTO（子类可以覆盖以添加额外字段）
     */
    protected R convertToResponse(E entity) {
        return getConverter().toResponse(entity);
    }
    
    /**
     * 验证获取详情（子类可以覆盖）
     */
    protected void validateGetById(E entity) {
        // 默认不做额外验证
    }
    
    /**
     * 验证创建（子类可以覆盖）
     */
    protected void validateCreate(C request) {
        // 默认不做额外验证
    }
    
    /**
     * 创建前处理（子类可以覆盖）
     */
    protected void beforeCreate(E entity, C request) {
        // 默认不做额外处理
    }
    
    /**
     * 创建后处理（子类可以覆盖）
     */
    protected void afterCreate(E entity, C request) {
        // 默认不做额外处理
    }
    
    /**
     * 验证更新（子类可以覆盖）
     */
    protected void validateUpdate(E entity, U request) {
        // 默认不做额外验证
    }
    
    /**
     * 更新前处理（子类可以覆盖）
     */
    protected void beforeUpdate(E entity, U request) {
        // 默认不做额外处理
    }
    
    /**
     * 更新后处理（子类可以覆盖）
     */
    protected void afterUpdate(E entity, U request) {
        // 默认不做额外处理
    }
    
    /**
     * 验证删除（子类可以覆盖）
     */
    protected void validateDelete(E entity) {
        // 默认不做额外验证
    }
    
    /**
     * 删除前处理（子类可以覆盖）
     */
    protected void beforeDelete(E entity) {
        // 默认不做额外处理
    }
    
    /**
     * 删除后处理（子类可以覆盖）
     */
    protected void afterDelete(E entity) {
        // 默认不做额外处理
    }
}
