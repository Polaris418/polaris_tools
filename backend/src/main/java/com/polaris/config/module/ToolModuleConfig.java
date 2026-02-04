package com.polaris.config.module;

import lombok.Builder;
import lombok.Data;

/**
 * 工具模块配置
 * 用于描述一个工具模块的元数据和配置
 */
@Data
@Builder
public class ToolModuleConfig {
    
    // ==================== 基本信息 ====================
    
    /**
     * 模块 ID（唯一标识符）
     */
    private String moduleId;
    
    /**
     * 模块名称（英文）
     */
    private String moduleName;
    
    /**
     * 模块名称（中文）
     */
    private String moduleNameZh;
    
    /**
     * 模块描述
     */
    private String description;
    
    /**
     * API 前缀（例如：/api/v1/tools）
     */
    private String apiPrefix;
    
    // ==================== 类型信息 ====================
    
    /**
     * 实体类
     */
    private Class<?> entityClass;
    
    /**
     * 响应 DTO 类
     */
    private Class<?> responseClass;
    
    /**
     * 创建请求 DTO 类
     */
    private Class<?> createRequestClass;
    
    /**
     * 更新请求 DTO 类
     */
    private Class<?> updateRequestClass;
    
    /**
     * 查询请求 DTO 类
     */
    private Class<?> queryRequestClass;
    
    /**
     * Service 接口类
     */
    private Class<?> serviceClass;
    
    /**
     * Service 实现类
     */
    private Class<?> serviceImplClass;
    
    /**
     * Controller 类
     */
    private Class<?> controllerClass;
    
    // ==================== 功能开关 ====================
    
    /**
     * 是否启用 CRUD 操作（默认：true）
     */
    @Builder.Default
    private boolean enableCRUD = true;
    
    /**
     * 是否启用批量删除（默认：true）
     */
    @Builder.Default
    private boolean enableBatchDelete = true;
    
    /**
     * 是否启用软删除（默认：true）
     */
    @Builder.Default
    private boolean enableSoftDelete = true;
    
    /**
     * 是否启用版本控制（默认：false）
     */
    @Builder.Default
    private boolean enableVersioning = false;
    
    /**
     * 是否启用导出功能（默认：false）
     */
    @Builder.Default
    private boolean enableExport = false;
    
    // ==================== 权限配置 ====================
    
    /**
     * 所需角色（为空表示不限制）
     */
    private String[] requiredRoles;
    
    /**
     * 是否需要认证（默认：true）
     */
    @Builder.Default
    private boolean requireAuth = true;
}
