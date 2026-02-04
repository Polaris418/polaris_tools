package com.polaris.service;

import com.polaris.common.base.BaseService;
import com.polaris.dto.CategoryCreateRequest;
import com.polaris.dto.CategoryQueryRequest;
import com.polaris.dto.CategoryReorderRequest;
import com.polaris.dto.CategoryResponse;
import com.polaris.dto.CategoryUpdateRequest;
import com.polaris.entity.Category;

import java.util.List;

/**
 * 分类服务接口
 * 继承 BaseService 获得标准 CRUD 操作
 */
public interface CategoryService extends BaseService<Category, CategoryResponse, CategoryCreateRequest, CategoryUpdateRequest, CategoryQueryRequest> {
    
    // ==================== 扩展方法（Category 特有功能） ====================
    
    /**
     * 获取分类列表（按 sortOrder 排序）
     * 
     * @return 分类列表
     */
    List<CategoryResponse> listCategories();
    
    /**
     * 恢复分类
     * 
     * @param id 分类 ID
     */
    void restoreCategory(Long id);
    
    /**
     * 永久删除分类
     * 
     * @param id 分类 ID
     */
    void hardDeleteCategory(Long id);
    
    /**
     * 批量更新分类排序
     * 
     * @param request 排序请求，包含分类ID和新的排序值
     */
    void reorderCategories(CategoryReorderRequest request);
}
