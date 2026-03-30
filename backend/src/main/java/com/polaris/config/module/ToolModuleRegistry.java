package com.polaris.config.module;

import com.polaris.controller.CategoryController;
import com.polaris.controller.ToolController;
import com.polaris.dto.category.CategoryCreateRequest;
import com.polaris.dto.category.CategoryQueryRequest;
import com.polaris.dto.category.CategoryResponse;
import com.polaris.dto.category.CategoryUpdateRequest;
import com.polaris.dto.document.DocumentCreateRequest;
import com.polaris.dto.document.DocumentQueryRequest;
import com.polaris.dto.document.DocumentResponse;
import com.polaris.dto.document.DocumentUpdateRequest;
import com.polaris.dto.tool.ToolCreateRequest;
import com.polaris.dto.tool.ToolQueryRequest;
import com.polaris.dto.tool.ToolResponse;
import com.polaris.dto.tool.ToolUpdateRequest;
import com.polaris.entity.Category;
import com.polaris.entity.Tool;
import com.polaris.entity.UserDocument;
import com.polaris.service.CategoryService;
import com.polaris.service.DocumentService;
import com.polaris.service.ToolService;
import com.polaris.service.impl.CategoryServiceImpl;
import com.polaris.service.impl.DocumentServiceImpl;
import com.polaris.service.impl.ToolServiceImpl;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.HashMap;
import java.util.Map;

/**
 * 工具模块注册表
 * 集中管理所有工具模块的配置
 */
@Slf4j
@Component
public class ToolModuleRegistry {
    
    /**
     * 模块配置存储
     * Key: moduleId
     * Value: ToolModuleConfig
     */
    private final Map<String, ToolModuleConfig> modules = new HashMap<>();
    
    /**
     * 注册模块
     * 
     * @param config 模块配置
     */
    public void register(ToolModuleConfig config) {
        if (config == null || config.getModuleId() == null) {
            throw new IllegalArgumentException("模块配置或模块 ID 不能为空");
        }
        
        if (modules.containsKey(config.getModuleId())) {
            log.warn("模块已存在，将被覆盖: {}", config.getModuleId());
        }
        
        modules.put(config.getModuleId(), config);
        log.info("注册模块: {} ({})", config.getModuleId(), config.getModuleNameZh());
    }
    
    /**
     * 获取模块配置
     * 
     * @param moduleId 模块 ID
     * @return 模块配置，如果不存在则返回 null
     */
    public ToolModuleConfig getModule(String moduleId) {
        return modules.get(moduleId);
    }
    
    /**
     * 获取所有模块配置
     * 
     * @return 所有模块配置
     */
    public Collection<ToolModuleConfig> getAllModules() {
        return modules.values();
    }
    
    /**
     * 检查模块是否存在
     * 
     * @param moduleId 模块 ID
     * @return 是否存在
     */
    public boolean hasModule(String moduleId) {
        return modules.containsKey(moduleId);
    }
    
    /**
     * 获取模块数量
     * 
     * @return 模块数量
     */
    public int getModuleCount() {
        return modules.size();
    }
    
    /**
     * 应用启动时初始化并注册所有模块
     */
    @PostConstruct
    public void init() {
        log.info("开始注册工具模块...");
        
        // 注册 Tool 模块
        registerToolModule();
        
        // 注册 Category 模块
        registerCategoryModule();
        
        // 注册 Document 模块
        registerDocumentModule();
        
        log.info("工具模块注册完成，共注册 {} 个模块", modules.size());
    }
    
    /**
     * 注册 Tool 模块
     */
    private void registerToolModule() {
        ToolModuleConfig config = ToolModuleConfig.builder()
                .moduleId("tool")
                .moduleName("Tool")
                .moduleNameZh("工具")
                .description("工具管理模块，提供工具的 CRUD 操作")
                .apiPrefix("/api/v1/tools")
                .entityClass(Tool.class)
                .responseClass(ToolResponse.class)
                .createRequestClass(ToolCreateRequest.class)
                .updateRequestClass(ToolUpdateRequest.class)
                .queryRequestClass(ToolQueryRequest.class)
                .serviceClass(ToolService.class)
                .serviceImplClass(ToolServiceImpl.class)
                .controllerClass(ToolController.class)
                .enableCRUD(true)
                .enableBatchDelete(true)
                .enableSoftDelete(true)
                .enableVersioning(false)
                .enableExport(false)
                .requireAuth(false)
                .build();
        
        register(config);
    }
    
    /**
     * 注册 Category 模块
     */
    private void registerCategoryModule() {
        ToolModuleConfig config = ToolModuleConfig.builder()
                .moduleId("category")
                .moduleName("Category")
                .moduleNameZh("分类")
                .description("分类管理模块，提供分类的 CRUD 操作")
                .apiPrefix("/api/v1/categories")
                .entityClass(Category.class)
                .responseClass(CategoryResponse.class)
                .createRequestClass(CategoryCreateRequest.class)
                .updateRequestClass(CategoryUpdateRequest.class)
                .queryRequestClass(CategoryQueryRequest.class)
                .serviceClass(CategoryService.class)
                .serviceImplClass(CategoryServiceImpl.class)
                .controllerClass(CategoryController.class)
                .enableCRUD(true)
                .enableBatchDelete(true)
                .enableSoftDelete(true)
                .enableVersioning(false)
                .enableExport(false)
                .requireAuth(true)
                .requiredRoles(new String[]{"ADMIN"})
                .build();
        
        register(config);
    }
    
    /**
     * 注册 Document 模块
     */
    private void registerDocumentModule() {
        ToolModuleConfig config = ToolModuleConfig.builder()
                .moduleId("document")
                .moduleName("Document")
                .moduleNameZh("文档")
                .description("文档管理模块，提供文档的 CRUD 操作和版本控制")
                .apiPrefix("/api/v1/documents")
                .entityClass(UserDocument.class)
                .responseClass(DocumentResponse.class)
                .createRequestClass(DocumentCreateRequest.class)
                .updateRequestClass(DocumentUpdateRequest.class)
                .queryRequestClass(DocumentQueryRequest.class)
                .serviceClass(DocumentService.class)
                .serviceImplClass(DocumentServiceImpl.class)
                .controllerClass(null) // DocumentController 尚未重构
                .enableCRUD(true)
                .enableBatchDelete(true)
                .enableSoftDelete(true)
                .enableVersioning(true)
                .enableExport(true)
                .requireAuth(true)
                .build();
        
        register(config);
    }
}
