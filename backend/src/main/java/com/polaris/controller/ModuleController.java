package com.polaris.controller;

import com.polaris.common.result.Result;
import com.polaris.config.module.ToolModuleConfig;
import com.polaris.config.module.ToolModuleRegistry;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

import java.util.Collection;
import java.util.HashMap;
import java.util.Map;

/**
 * 模块管理控制器
 * 提供模块查询 API
 */
@RestController
@RequestMapping("/api/v1/modules")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Module Management", description = "模块管理 API")
public class ModuleController {
    
    private final ToolModuleRegistry moduleRegistry;
    
    /**
     * 获取所有模块列表
     */
    @GetMapping
    @Operation(summary = "获取所有模块列表", description = "返回系统中注册的所有工具模块")
    public Result<Collection<ToolModuleConfig>> getAllModules() {
        log.info("获取所有模块列表");
        
        Collection<ToolModuleConfig> modules = moduleRegistry.getAllModules();
        
        return Result.success(modules);
    }
    
    /**
     * 获取模块详情
     */
    @GetMapping("/{moduleId}")
    @Operation(summary = "获取模块详情", description = "根据模块 ID 获取模块配置详情")
    public Result<ToolModuleConfig> getModule(@PathVariable String moduleId) {
        log.info("获取模块详情: moduleId={}", moduleId);
        
        ToolModuleConfig module = moduleRegistry.getModule(moduleId);
        
        if (module == null) {
            return Result.error(404, "模块不存在: " + moduleId);
        }
        
        return Result.success(module);
    }
    
    /**
     * 获取模块统计信息
     */
    @GetMapping("/stats")
    @Operation(summary = "获取模块统计信息", description = "返回模块数量等统计信息")
    public Result<Map<String, Object>> getModuleStats() {
        log.info("获取模块统计信息");
        
        Map<String, Object> stats = new HashMap<>();
        stats.put("totalModules", moduleRegistry.getModuleCount());
        stats.put("modules", moduleRegistry.getAllModules().stream()
                .map(config -> Map.of(
                        "moduleId", config.getModuleId(),
                        "moduleName", config.getModuleName(),
                        "moduleNameZh", config.getModuleNameZh(),
                        "apiPrefix", config.getApiPrefix()
                ))
                .toList());
        
        return Result.success(stats);
    }
}
