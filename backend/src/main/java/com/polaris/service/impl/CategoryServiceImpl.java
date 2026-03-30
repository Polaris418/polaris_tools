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
import com.polaris.converter.CategoryConverter;
import com.polaris.dto.category.CategoryCreateRequest;
import com.polaris.dto.category.CategoryQueryRequest;
import com.polaris.dto.category.CategoryReorderRequest;
import com.polaris.dto.category.CategoryResponse;
import com.polaris.dto.category.CategoryUpdateRequest;
import com.polaris.entity.Category;
import com.polaris.entity.Tool;
import com.polaris.mapper.CategoryMapper;
import com.polaris.mapper.ToolMapper;
import com.polaris.auth.security.UserContext;
import com.polaris.service.CategoryService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

/**
 * 分类服务实现类
 * 继承 BaseServiceImpl 获得标准 CRUD 操作
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class CategoryServiceImpl 
        extends BaseServiceImpl<Category, CategoryResponse, CategoryCreateRequest, CategoryUpdateRequest, CategoryQueryRequest>
        implements CategoryService {
    
    private final CategoryMapper categoryMapper;
    private final ToolMapper toolMapper;
    private final CategoryConverter categoryConverter;
    private final UserContext userContext;
    
    // ==================== BaseServiceImpl 必需方法 ====================
    
    @Override
    protected BaseMapper<Category> getMapper() {
        return categoryMapper;
    }
    
    @Override
    protected BaseConverter<Category, CategoryResponse, CategoryCreateRequest, CategoryUpdateRequest> getConverter() {
        return categoryConverter;
    }
    
    @Override
    protected String getResourceName() {
        return "分类";
    }
    
    // ==================== 覆盖 list 方法支持查询已删除数据 ====================
    
    @Override
    @Transactional(rollbackFor = Exception.class)
    @org.springframework.cache.annotation.CacheEvict(value = "categories:list", allEntries = true)
    public CategoryResponse create(CategoryCreateRequest request) {
        // 调用父类的create方法，并在成功后清除缓存
        return super.create(request);
    }
    
    @Override
    public PageResult<CategoryResponse> list(CategoryQueryRequest query) {
        log.info("========== 查询分类列表开始 ==========");
        log.info("请求参数: query={}", query);
        log.info("includeDeleted 原始值: {}", query.getIncludeDeleted());
        
        Page<Category> page = new Page<>(query.getPage(), query.getSize());
        
        // 根据 includeDeleted 参数决定查询哪些数据
        boolean includeDeleted = Boolean.TRUE.equals(query.getIncludeDeleted());
        log.info("includeDeleted 布尔值: {}", includeDeleted);
        log.info("将执行 SQL 查询: includeDeleted={} (true=查询已删除, false=查询正常数据)", includeDeleted);
        
        IPage<Category> categoryPage = categoryMapper.selectCategoriesIncludeDeleted(
            page,
            query.getKeyword(),
            query.getStatus(),
            includeDeleted  // true=查询已删除, false=查询正常数据
        );
        
        log.info("SQL 查询完成: 返回 {} 条记录", categoryPage.getRecords().size());
        
        // 打印每条记录的 deleted 状态
        categoryPage.getRecords().forEach(category -> {
            log.info("分类: id={}, name={}, deleted={}, status={}", 
                category.getId(), category.getName(), category.getDeleted(), category.getStatus());
        });
        
        List<CategoryResponse> responses = categoryPage.getRecords().stream()
            .map(this::convertToResponse)
            .collect(Collectors.toList());
        
        PageResult<CategoryResponse> result = new PageResult<>();
        result.setList(responses);
        result.setTotal(categoryPage.getTotal());
        result.setPages(categoryPage.getPages());
        result.setPageNum((int) categoryPage.getCurrent());
        result.setPageSize((int) categoryPage.getSize());
        
        log.info("查询分类列表成功: includeDeleted={}, total={}", includeDeleted, categoryPage.getTotal());
        log.info("========== 查询分类列表结束 ==========");
        return result;
    }
    
    @Override
    public CategoryResponse getById(Long id) {
        // 尝试先查普通数据，如果不存在再查已删除的
        try {
            return super.getById(id);
        } catch (BusinessException e) {
            // 尝试查询已删除的数据
            Category category = categoryMapper.selectByIdIncludeDeleted(id);
            if (category != null) {
                return convertToResponse(category);
            }
            throw e;
        }
    }
    
    // ==================== 覆盖 update 方法支持更新已删除数据 ====================
    
    @Override
    @Transactional(rollbackFor = Exception.class)
    @org.springframework.cache.annotation.CacheEvict(value = "categories:list", allEntries = true)
    public CategoryResponse update(Long id, CategoryUpdateRequest request) {
        log.info("更新分类开始: id={}, request={}", id, request);
        
        try {
            // 查询分类（包含已删除的数据）
            Category entity = categoryMapper.selectByIdIncludeDeleted(id);
            if (entity == null) {
                log.warn("更新分类失败，分类不存在: id={}", id);
                throw new BusinessException(ErrorCode.CATEGORY_NOT_FOUND);
            }
            
            // 记录旧值（用于日志）
            Category oldEntity = cloneEntity(entity);
            
            // 执行更新前验证（子类可以覆盖）
            validateUpdate(entity, request);
            
            // 执行更新前处理（子类可以覆盖）
            beforeUpdate(entity, request);
            
            // 更新实体
            getConverter().updateEntity(entity, request);
            entity.setUpdatedAt(java.time.LocalDateTime.now());
            
            // 使用自定义更新方法（不受逻辑删除限制）
            categoryMapper.updateByIdIncludeDeleted(
                entity.getId(),
                entity.getName(),
                entity.getNameZh(),
                entity.getIcon(),
                entity.getAccentColor(),
                entity.getDescription(),
                entity.getSortOrder(),
                entity.getStatus(),
                entity.getUpdatedAt()
            );
            
            // 执行更新后处理（子类可以覆盖）
            afterUpdate(entity, request);
            
            log.info("更新分类成功: id={}, oldEntity={}, newEntity={}", id, oldEntity, entity);
            
            return convertToResponse(entity);
        } catch (BusinessException e) {
            log.warn("更新分类失败: id={}, request={}, error={}", id, request, e.getMessage());
            throw e;
        } catch (Exception e) {
            log.error("更新分类异常: id={}, request={}, error={}", id, request, e.getMessage(), e);
            throw e;
        }
    }
    
    // ==================== 覆盖 delete 方法支持删除已删除数据检查 ====================
    
    @Override
    @Transactional(rollbackFor = Exception.class)
    @org.springframework.cache.annotation.CacheEvict(value = "categories:list", allEntries = true)
    public void delete(Long id) {
        log.info("删除分类开始: id={}", id);
        
        try {
            // 查询分类（包含已删除的数据）
            Category entity = categoryMapper.selectByIdIncludeDeleted(id);
            if (entity == null) {
                log.warn("删除分类失败，分类不存在: id={}", id);
                throw new BusinessException(ErrorCode.CATEGORY_NOT_FOUND);
            }
            
            // 检查是否已删除
            if (entity.getDeleted() == 1) {
                log.warn("删除分类失败，分类已被删除: id={}", id);
                throw new BusinessException(ErrorCode.INVALID_PARAMETER, "分类已被删除");
            }
            
            // 执行删除前验证（子类可以覆盖）
            validateDelete(entity);
            
            // 执行删除前处理（子类可以覆盖）
            beforeDelete(entity);
            
            // 软删除
            categoryMapper.deleteById(id);
            
            // 执行删除后处理（子类可以覆盖）
            afterDelete(entity);
            
            log.info("删除分类成功: id={}", id);
        } catch (BusinessException e) {
            log.warn("删除分类失败: id={}, error={}", id, e.getMessage());
            throw e;
        } catch (Exception e) {
            log.error("删除分类异常: id={}, error={}", id, e.getMessage(), e);
            throw e;
        }
    }
    
    // ==================== 构建查询条件 ====================
    
    @Override
    protected LambdaQueryWrapper<Category> buildQueryWrapper(CategoryQueryRequest query) {
        LambdaQueryWrapper<Category> queryWrapper = new LambdaQueryWrapper<>();
        
        // 显式过滤：只查询未删除的数据（deleted=0）
        // 注意：虽然配置了 @TableLogic，但显式添加条件更可靠
        queryWrapper.eq(Category::getDeleted, 0);
        
        // 状态过滤
        if (query.getStatus() != null) {
            queryWrapper.eq(Category::getStatus, query.getStatus());
        }
        
        // 关键词搜索（搜索名称）
        if (query.getKeyword() != null && !query.getKeyword().trim().isEmpty()) {
            String keyword = query.getKeyword().trim();
            queryWrapper.and(wrapper -> wrapper
                .like(Category::getName, keyword)
                .or()
                .like(Category::getNameZh, keyword));
        }
        
        // 排序：按 sortOrder 升序，然后按创建时间降序
        queryWrapper.orderByAsc(Category::getSortOrder);
        queryWrapper.orderByDesc(Category::getCreatedAt);
        
        return queryWrapper;
    }
    
    // ==================== 转换为响应 DTO ====================
    
    @Override
    protected CategoryResponse convertToResponse(Category category) {
        CategoryResponse response = categoryConverter.toResponse(category);
        
        // 查询该分类下的工具数量
        Long toolCount = toolMapper.selectCount(
            new LambdaQueryWrapper<Tool>()
                .eq(Tool::getCategoryId, category.getId())
                .eq(Tool::getStatus, 1)
        );
        
        response.setToolCount(toolCount.intValue());
        
        return response;
    }
    
    // ==================== 钩子方法：验证和处理 ====================
    
    @Override
    protected void validateCreate(CategoryCreateRequest request) {
        Long adminId = userContext.getCurrentUserId();
        log.info("管理员创建分类，验证开始: adminId={}, categoryName={}", adminId, request.getName());
        
        // 验证名称唯一性
        Long count = categoryMapper.selectCount(
            new LambdaQueryWrapper<Category>()
                .eq(Category::getName, request.getName())
        );
        
        if (count > 0) {
            log.warn("管理员创建分类失败，分类名称已存在: adminId={}, categoryName={}", adminId, request.getName());
            throw new BusinessException(ErrorCode.INVALID_PARAMETER, "分类名称已存在");
        }
    }
    
    @Override
    protected void beforeCreate(Category entity, CategoryCreateRequest request) {
        Long adminId = userContext.getCurrentUserId();
        log.info("管理员创建分类，设置默认值: adminId={}, categoryName={}", adminId, request.getName());
        
        // 设置默认值
        if (entity.getSortOrder() == null) {
            entity.setSortOrder(0);
        }
        if (entity.getStatus() == null) {
            entity.setStatus(1);
        }
    }
    
    @Override
    protected void validateUpdate(Category entity, CategoryUpdateRequest request) {
        Long adminId = userContext.getCurrentUserId();
        log.info("管理员更新分类，验证开始: adminId={}, categoryId={}, newName={}", 
                 adminId, entity.getId(), request.getName());
        
        // 如果更新名称，验证名称唯一性
        if (request.getName() != null && !request.getName().equals(entity.getName())) {
            Long count = categoryMapper.selectCount(
                new LambdaQueryWrapper<Category>()
                    .eq(Category::getName, request.getName())
            );
            
            if (count > 0) {
                log.warn("管理员更新分类失败，分类名称已存在: adminId={}, categoryId={}, newName={}", 
                         adminId, entity.getId(), request.getName());
                throw new BusinessException(ErrorCode.INVALID_PARAMETER, "分类名称已存在");
            }
        }
    }
    
    @Override
    protected void validateDelete(Category entity) {
        Long adminId = userContext.getCurrentUserId();
        log.info("管理员删除分类，验证开始: adminId={}, categoryId={}, categoryName={}", 
                 adminId, entity.getId(), entity.getName());
        
        // 检查是否有关联工具
        Long toolCount = toolMapper.selectCount(
            new LambdaQueryWrapper<Tool>()
                .eq(Tool::getCategoryId, entity.getId())
        );
        
        if (toolCount > 0) {
            log.warn("管理员删除分类失败，该分类下还有工具: adminId={}, categoryId={}, toolCount={}", 
                     adminId, entity.getId(), toolCount);
            throw new BusinessException(ErrorCode.INVALID_PARAMETER, "该分类下还有工具，无法删除");
        }
    }
    
    // ==================== 扩展方法实现 ====================
    
    @Override
    @Cacheable(value = "categories:list", unless = "#result == null || #result.isEmpty()")
    public List<CategoryResponse> listCategories() {
        log.info("获取分类列表开始");
        
        try {
            // 使用自定义查询获取分类及工具数量
            List<Category> categories = categoryMapper.listCategoriesWithToolCount();
            
            List<CategoryResponse> result = categories.stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
            
            log.info("获取分类列表成功: count={}", result.size());
            
            return result;
        } catch (Exception e) {
            log.error("获取分类列表失败: error={}", e.getMessage(), e);
            throw e;
        }
    }
    
    @Override
    @Transactional(rollbackFor = Exception.class)
    @org.springframework.cache.annotation.CacheEvict(value = "categories:list", allEntries = true)
    public void restoreCategory(Long id) {
        Long adminId = userContext.getCurrentUserId();
        log.info("管理员恢复分类开始: categoryId={}, adminId={}", id, adminId);
        
        try {
            // 查询分类（包含已删除）
            Category category = categoryMapper.selectByIdIncludeDeleted(id);
            if (category == null) {
                log.warn("管理员恢复分类失败，分类不存在: categoryId={}, adminId={}", id, adminId);
                throw new BusinessException(ErrorCode.CATEGORY_NOT_FOUND);
            }
            
            // 检查是否已删除
            if (category.getDeleted() != 1) {
                log.warn("管理员恢复分类失败，分类未被删除: categoryId={}, deleted={}, adminId={}", 
                         id, category.getDeleted(), adminId);
                throw new BusinessException(ErrorCode.INVALID_PARAMETER, "只能恢复已删除的分类");
            }
            
            // 验证恢复后的数据是否符合约束
            // 检查名称唯一性（排除已删除的记录）
            Long count = categoryMapper.selectCount(
                new LambdaQueryWrapper<Category>()
                    .eq(Category::getName, category.getName())
                    .eq(Category::getDeleted, 0)
            );
            
            if (count > 0) {
                log.warn("管理员恢复分类失败，分类名称已存在: categoryId={}, categoryName={}, adminId={}", 
                         id, category.getName(), adminId);
                throw new BusinessException(ErrorCode.CATEGORY_NAME_EXISTS);
            }
            
            // 恢复分类（设置 deleted=0）
            int rows = categoryMapper.restoreById(id);
            if (rows == 0) {
                log.error("管理员恢复分类失败，数据库更新失败: categoryId={}, adminId={}", id, adminId);
                throw new BusinessException(ErrorCode.INTERNAL_ERROR, "恢复分类失败");
            }
            
            log.info("管理员恢复分类成功: categoryId={}, categoryName={}, adminId={}", 
                     id, category.getName(), adminId);
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            log.error("管理员恢复分类异常: categoryId={}, adminId={}, error={}", id, adminId, e.getMessage(), e);
            throw e;
        }
    }
    
    @Override
    @Transactional(rollbackFor = Exception.class)
    @org.springframework.cache.annotation.CacheEvict(value = "categories:list", allEntries = true)
    public void hardDeleteCategory(Long id) {
        Long adminId = userContext.getCurrentUserId();
        log.info("管理员永久删除分类开始: categoryId={}, adminId={}", id, adminId);
        
        try {
            // 查询分类（包含已删除）
            Category category = categoryMapper.selectByIdIncludeDeleted(id);
            if (category == null) {
                log.warn("管理员永久删除分类失败，分类不存在: categoryId={}, adminId={}", id, adminId);
                throw new BusinessException(ErrorCode.CATEGORY_NOT_FOUND);
            }
            
            // 检查是否已软删除
            if (category.getDeleted() != 1) {
                log.warn("管理员永久删除分类失败，只能永久删除已软删除的记录: categoryId={}, deleted={}, adminId={}", 
                         id, category.getDeleted(), adminId);
                throw new BusinessException(ErrorCode.INVALID_PARAMETER, "只能永久删除已软删除的记录");
            }
            
            // 检查是否有关联工具（包括已删除的工具）
            Long toolCount = toolMapper.selectCount(
                new LambdaQueryWrapper<Tool>()
                    .eq(Tool::getCategoryId, id)
            );
            
            if (toolCount > 0) {
                log.warn("管理员永久删除分类失败，该分类下还有工具: categoryId={}, toolCount={}, adminId={}", 
                         id, toolCount, adminId);
                throw new BusinessException(ErrorCode.CATEGORY_HAS_TOOLS, "该分类下还有工具，无法永久删除");
            }
            
            // 记录被永久删除的分类信息
            log.info("管理员永久删除分类，记录删除数据: categoryId={}, categoryName={}, status={}, adminId={}",
                     id, category.getName(), category.getStatus(), adminId);
            
            // 物理删除
            int rows = categoryMapper.hardDeleteById(id);
            if (rows == 0) {
                log.error("管理员永久删除分类失败，数据库删除失败: categoryId={}, adminId={}", id, adminId);
                throw new BusinessException(ErrorCode.INTERNAL_ERROR, "永久删除分类失败");
            }
            
            log.info("管理员永久删除分类成功: categoryId={}, adminId={}", id, adminId);
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            log.error("管理员永久删除分类异常: categoryId={}, adminId={}, error={}", id, adminId, e.getMessage(), e);
            throw e;
        }
    }
    
    @Override
    @Transactional(rollbackFor = Exception.class)
    @org.springframework.cache.annotation.CacheEvict(value = "categories:list", allEntries = true)
    public void reorderCategories(CategoryReorderRequest request) {
        Long adminId = userContext.getCurrentUserId();
        log.info("管理员批量更新分类排序开始: adminId={}, itemCount={}", adminId, request.getItems().size());
        
        try {
            java.time.LocalDateTime now = java.time.LocalDateTime.now();
            
            for (CategoryReorderRequest.ReorderItem item : request.getItems()) {
                // 检查分类是否存在
                Category category = categoryMapper.selectByIdIncludeDeleted(item.getId());
                if (category == null) {
                    log.warn("批量更新排序失败，分类不存在: categoryId={}", item.getId());
                    throw new BusinessException(ErrorCode.CATEGORY_NOT_FOUND, "分类不存在: " + item.getId());
                }
                
                // 更新排序值
                categoryMapper.updateSortOrderById(item.getId(), item.getSortOrder(), now);
                log.debug("更新分类排序: categoryId={}, newSortOrder={}", item.getId(), item.getSortOrder());
            }
            
            log.info("管理员批量更新分类排序成功: adminId={}, itemCount={}", adminId, request.getItems().size());
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            log.error("管理员批量更新分类排序异常: adminId={}, error={}", adminId, e.getMessage(), e);
            throw e;
        }
    }
}
