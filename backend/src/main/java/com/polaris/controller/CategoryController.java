package com.polaris.controller;

import com.polaris.common.base.BaseController;
import com.polaris.common.base.BaseService;
import com.polaris.common.result.Result;
import com.polaris.dto.category.CategoryCreateRequest;
import com.polaris.dto.category.CategoryQueryRequest;
import com.polaris.dto.category.CategoryResponse;
import com.polaris.dto.category.CategoryUpdateRequest;
import com.polaris.entity.Category;
import com.polaris.service.CategoryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 分类管理控制器
 * 继承 BaseController 获得标准 REST API 端点
 */
@RestController
@RequestMapping("/api/v1/categories")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Category Management", description = "分类管理 API")
public class CategoryController extends BaseController<Category, CategoryResponse, CategoryCreateRequest, CategoryUpdateRequest, CategoryQueryRequest> {
    
    private final CategoryService categoryService;
    
    // ==================== BaseController 必需方法 ====================
    
    @Override
    protected BaseService<Category, CategoryResponse, CategoryCreateRequest, CategoryUpdateRequest, CategoryQueryRequest> getService() {
        return categoryService;
    }
    
    @Override
    protected String getResourceName() {
        return "分类";
    }
    
    // ==================== 自定义端点 ====================
    
    /**
     * 获取所有分类列表（不分页）
     */
    @GetMapping("/all")
    @Operation(summary = "获取所有分类", description = "获取所有分类列表，按 sortOrder 排序，不分页")
    public Result<List<CategoryResponse>> listAllCategories() {
        log.info("获取所有分类列表");
        List<CategoryResponse> categories = categoryService.listCategories();
        return Result.success(categories);
    }
}
