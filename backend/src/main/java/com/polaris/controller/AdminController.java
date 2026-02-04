package com.polaris.controller;

import com.polaris.common.result.PageResult;
import com.polaris.common.result.Result;
import com.polaris.dto.*;
import com.polaris.security.RequireAdmin;
import com.polaris.service.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 管理员控制器
 * 提供管理员专用的系统管理功能
 * 所有接口都需要管理员权限（planType = 2）
 */
@RestController
@RequestMapping("/api/v1/admin")
@RequireAdmin
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Admin Management", description = "管理员接口 - 提供系统管理功能，需要管理员权限（planType=2）")
@SecurityRequirement(name = "bearer-jwt")
public class AdminController {
    
    private final AdminService adminService;
    private final AdminUserService adminUserService;
    private final AdminStatisticsService adminStatisticsService;
    private final ToolService toolService;
    private final CategoryService categoryService;
    private final EmailAuditLogService emailAuditLogService;
    private final EmailRateLimiter emailRateLimiter;
    
    // ==================== Dashboard Statistics ====================
    
    /**
     * 获取仪表盘统计数据
     * GET /api/v1/admin/stats
     */
    @GetMapping("/stats")
    @Operation(
        summary = "获取仪表盘统计数据",
        description = "返回系统概览统计信息，包括用户数、工具数、使用量等关键指标"
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "成功获取统计数据",
            content = @Content(schema = @Schema(implementation = DashboardStatsResponse.class))
        ),
        @ApiResponse(
            responseCode = "401",
            description = "未认证 - 需要登录",
            content = @Content(schema = @Schema(implementation = Result.class))
        ),
        @ApiResponse(
            responseCode = "403",
            description = "无权限 - 需要管理员权限",
            content = @Content(schema = @Schema(implementation = Result.class))
        )
    })
    public Result<DashboardStatsResponse> getDashboardStats() {
        log.info("管理员请求仪表盘统计数据");
        DashboardStatsResponse stats = adminService.getDashboardStats();
        return Result.success(stats);
    }
    
    // ==================== User Management ====================
    
    /**
     * 分页查询用户列表
     * GET /api/v1/admin/users
     */
    @GetMapping("/users")
    @Operation(
        summary = "查询用户列表",
        description = "支持分页、关键词搜索（用户名/邮箱）、状态过滤、套餐类型过滤"
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "成功获取用户列表",
            content = @Content(schema = @Schema(implementation = PageResult.class))
        ),
        @ApiResponse(
            responseCode = "400",
            description = "请求参数错误",
            content = @Content(schema = @Schema(implementation = Result.class))
        ),
        @ApiResponse(
            responseCode = "401",
            description = "未认证",
            content = @Content(schema = @Schema(implementation = Result.class))
        ),
        @ApiResponse(
            responseCode = "403",
            description = "无权限",
            content = @Content(schema = @Schema(implementation = Result.class))
        )
    })
    public Result<PageResult<AdminUserResponse>> listUsers(
            @Parameter(description = "用户查询请求参数") @Valid AdminUserQueryRequest request) {
        log.info("管理员查询用户列表: {}", request);
        PageResult<AdminUserResponse> result = adminUserService.listUsers(request);
        return Result.success(result);
    }
    
    /**
     * 获取用户详情
     * GET /api/v1/admin/users/{id}
     */
    @GetMapping("/users/{id}")
    @Operation(
        summary = "获取用户详情",
        description = "根据用户ID获取详细信息，包括登录记录等"
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "成功获取用户详情",
            content = @Content(schema = @Schema(implementation = AdminUserResponse.class))
        ),
        @ApiResponse(
            responseCode = "404",
            description = "用户不存在",
            content = @Content(schema = @Schema(implementation = Result.class))
        )
    })
    public Result<AdminUserResponse> getUser(
            @Parameter(description = "用户ID", required = true) @PathVariable Long id) {
        log.info("管理员查询用户详情: userId={}", id);
        AdminUserResponse user = adminUserService.getUser(id);
        return Result.success(user);
    }
    
    /**
     * 创建用户
     * POST /api/v1/admin/users
     */
    @PostMapping("/users")
    @Operation(
        summary = "创建用户",
        description = "管理员创建新用户账号"
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "成功创建用户",
            content = @Content(schema = @Schema(implementation = AdminUserResponse.class))
        ),
        @ApiResponse(
            responseCode = "400",
            description = "请求参数错误或用户名/邮箱已存在",
            content = @Content(schema = @Schema(implementation = Result.class))
        )
    })
    public Result<AdminUserResponse> createUser(
            @Parameter(description = "用户创建请求", required = true) @Valid @RequestBody AdminUserCreateRequest request) {
        log.info("管理员创建用户: username={}, email={}", request.getUsername(), request.getEmail());
        AdminUserResponse user = adminUserService.createUser(request);
        return Result.success(user);
    }
    
    /**
     * 更新用户信息
     * PUT /api/v1/admin/users/{id}
     */
    @PutMapping("/users/{id}")
    @Operation(
        summary = "更新用户信息",
        description = "更新用户的昵称、邮箱、套餐类型、套餐过期时间、状态等信息"
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "成功更新用户信息",
            content = @Content(schema = @Schema(implementation = AdminUserResponse.class))
        ),
        @ApiResponse(
            responseCode = "400",
            description = "请求参数错误或邮箱已存在",
            content = @Content(schema = @Schema(implementation = Result.class))
        ),
        @ApiResponse(
            responseCode = "404",
            description = "用户不存在",
            content = @Content(schema = @Schema(implementation = Result.class))
        )
    })
    public Result<AdminUserResponse> updateUser(
            @Parameter(description = "用户ID", required = true) @PathVariable Long id,
            @Parameter(description = "用户更新请求", required = true) @Valid @RequestBody AdminUserUpdateRequest request) {
        log.info("管理员更新用户信息: userId={}, request={}", id, request);
        AdminUserResponse user = adminUserService.updateUser(id, request);
        return Result.success(user);
    }
    
    /**
     * 删除用户
     * DELETE /api/v1/admin/users/{id}
     */
    @DeleteMapping("/users/{id}")
    @Operation(
        summary = "删除用户",
        description = "软删除或永久删除用户账户，不能删除自己的账户。permanent=true时为永久删除"
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "成功删除用户"
        ),
        @ApiResponse(
            responseCode = "400",
            description = "不能删除自己的账户或只能永久删除已软删除的记录",
            content = @Content(schema = @Schema(implementation = Result.class))
        ),
        @ApiResponse(
            responseCode = "404",
            description = "用户不存在",
            content = @Content(schema = @Schema(implementation = Result.class))
        )
    })
    public Result<Void> deleteUser(
            @Parameter(description = "用户ID", required = true) @PathVariable Long id,
            @Parameter(description = "是否永久删除", example = "false") @RequestParam(required = false, defaultValue = "false") Boolean permanent) {
        log.info("管理员删除用户: userId={}, permanent={}", id, permanent);
        if (Boolean.TRUE.equals(permanent)) {
            adminUserService.hardDeleteUser(id);
        } else {
            adminUserService.deleteUser(id);
        }
        return Result.success();
    }
    
    /**
     * 恢复用户
     * PUT /api/v1/admin/users/{id}/restore
     */
    @PutMapping("/users/{id}/restore")
    @Operation(
        summary = "恢复用户",
        description = "恢复已软删除的用户账户"
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "成功恢复用户"
        ),
        @ApiResponse(
            responseCode = "400",
            description = "用户名或邮箱冲突",
            content = @Content(schema = @Schema(implementation = Result.class))
        ),
        @ApiResponse(
            responseCode = "404",
            description = "用户不存在",
            content = @Content(schema = @Schema(implementation = Result.class))
        )
    })
    public Result<Void> restoreUser(
            @Parameter(description = "用户ID", required = true) @PathVariable Long id) {
        log.info("管理员恢复用户: userId={}", id);
        adminUserService.restoreUser(id);
        return Result.success();
    }
    
    /**
     * 切换用户状态
     * PUT /api/v1/admin/users/{id}/status
     */
    @PutMapping("/users/{id}/status")
    @Operation(
        summary = "切换用户状态",
        description = "启用或禁用用户账户（0=禁用，1=启用）"
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "成功切换用户状态"
        ),
        @ApiResponse(
            responseCode = "400",
            description = "请求参数错误",
            content = @Content(schema = @Schema(implementation = Result.class))
        ),
        @ApiResponse(
            responseCode = "404",
            description = "用户不存在",
            content = @Content(schema = @Schema(implementation = Result.class))
        )
    })
    public Result<Void> toggleUserStatus(
            @Parameter(description = "用户ID", required = true) @PathVariable Long id,
            @Parameter(description = "状态请求", required = true) @Valid @RequestBody UserStatusRequest request) {
        log.info("管理员切换用户状态: userId={}, status={}", id, request.getStatus());
        adminUserService.toggleUserStatus(id, request.getStatus());
        return Result.success();
    }

    
    // ==================== Tool Management ====================
    
    /**
     * 分页查询工具列表
     * GET /api/v1/admin/tools
     */
    @GetMapping("/tools")
    @Operation(summary = "查询工具列表", description = "支持分页、搜索和过滤")
    public Result<PageResult<ToolResponse>> listTools(@Valid ToolQueryRequest request) {
        log.info("管理员查询工具列表: {}", request);
        PageResult<ToolResponse> result = toolService.list(request);
        return Result.success(result);
    }
    
    /**
     * 获取工具详情
     * GET /api/v1/admin/tools/{id}
     */
    @GetMapping("/tools/{id}")
    @Operation(summary = "获取工具详情", description = "根据工具ID获取详细信息")
    public Result<ToolResponse> getTool(@PathVariable Long id) {
        log.info("管理员查询工具详情: toolId={}", id);
        ToolResponse tool = toolService.getById(id);
        return Result.success(tool);
    }
    
    /**
     * 创建工具
     * POST /api/v1/admin/tools
     */
    @PostMapping("/tools")
    @Operation(summary = "创建工具", description = "添加新工具到系统")
    public Result<ToolResponse> createTool(@Valid @RequestBody ToolCreateRequest request) {
        log.info("管理员创建工具: {}", request);
        ToolResponse tool = toolService.create(request);
        return Result.success(tool);
    }
    
    /**
     * 更新工具信息
     * PUT /api/v1/admin/tools/{id}
     */
    @PutMapping("/tools/{id}")
    @Operation(summary = "更新工具信息", description = "修改工具的名称、描述、分类等信息")
    public Result<ToolResponse> updateTool(
            @PathVariable Long id,
            @Valid @RequestBody ToolUpdateRequest request) {
        log.info("管理员更新工具信息: toolId={}, request={}", id, request);
        ToolResponse tool = toolService.update(id, request);
        return Result.success(tool);
    }
    
    /**
     * 删除工具
     * DELETE /api/v1/admin/tools/{id}
     */
    @DeleteMapping("/tools/{id}")
    @Operation(summary = "删除工具", description = "软删除或永久删除工具（保留使用历史）。permanent=true时为永久删除")
    public Result<Void> deleteTool(
            @PathVariable Long id,
            @Parameter(description = "是否永久删除", example = "false") @RequestParam(required = false, defaultValue = "false") Boolean permanent) {
        log.info("管理员删除工具: toolId={}, permanent={}", id, permanent);
        if (Boolean.TRUE.equals(permanent)) {
            toolService.hardDeleteTool(id);
        } else {
            toolService.delete(id);
        }
        return Result.success();
    }
    
    /**
     * 恢复工具
     * PUT /api/v1/admin/tools/{id}/restore
     */
    @PutMapping("/tools/{id}/restore")
    @Operation(summary = "恢复工具", description = "恢复已软删除的工具")
    public Result<Void> restoreTool(@PathVariable Long id) {
        log.info("管理员恢复工具: toolId={}", id);
        toolService.restoreTool(id);
        return Result.success();
    }
    
    // ==================== Category Management ====================
    
    /**
     * 查询分类列表
     * GET /api/v1/admin/categories
     */
    @GetMapping("/categories")
    @Operation(summary = "查询分类列表", description = "获取所有分类，支持状态过滤和已删除过滤")
    public Result<List<CategoryResponse>> listCategories(
            @RequestParam(required = false) Integer status,
            @RequestParam(required = false) Boolean includeDeleted) {
        log.info("管理员查询分类列表: status={}, includeDeleted={}", status, includeDeleted);
        
        // 统一使用查询接口，确保使用自定义 SQL
        CategoryQueryRequest request = new CategoryQueryRequest();
        request.setStatus(status);
        request.setIncludeDeleted(includeDeleted);
        
        PageResult<CategoryResponse> result = categoryService.list(request);
        return Result.success(result.getList());
    }
    
    /**
     * 获取分类详情
     * GET /api/v1/admin/categories/{id}
     */
    @GetMapping("/categories/{id}")
    @Operation(summary = "获取分类详情", description = "根据分类ID获取详细信息")
    public Result<CategoryResponse> getCategory(@PathVariable Long id) {
        log.info("管理员查询分类详情: categoryId={}", id);
        CategoryResponse category = categoryService.getById(id);
        return Result.success(category);
    }
    
    /**
     * 创建分类
     * POST /api/v1/admin/categories
     */
    @PostMapping("/categories")
    @Operation(summary = "创建分类", description = "添加新分类到系统")
    public Result<CategoryResponse> createCategory(@Valid @RequestBody CategoryCreateRequest request) {
        log.info("管理员创建分类: {}", request);
        CategoryResponse category = categoryService.create(request);
        return Result.success(category);
    }
    
    /**
     * 更新分类信息
     * PUT /api/v1/admin/categories/{id}
     */
    @PutMapping("/categories/{id}")
    @Operation(summary = "更新分类信息", description = "修改分类的名称、排序等信息")
    public Result<CategoryResponse> updateCategory(
            @PathVariable Long id,
            @Valid @RequestBody CategoryUpdateRequest request) {
        log.info("管理员更新分类信息: categoryId={}, request={}", id, request);
        CategoryResponse category = categoryService.update(id, request);
        return Result.success(category);
    }
    
    /**
     * 删除分类
     * DELETE /api/v1/admin/categories/{id}
     */
    @DeleteMapping("/categories/{id}")
    @Operation(summary = "删除分类", description = "软删除或永久删除分类（需确保分类下无工具）。permanent=true时为永久删除")
    public Result<Void> deleteCategory(
            @PathVariable Long id,
            @Parameter(description = "是否永久删除", example = "false") @RequestParam(required = false, defaultValue = "false") Boolean permanent) {
        log.info("管理员删除分类: categoryId={}, permanent={}", id, permanent);
        if (Boolean.TRUE.equals(permanent)) {
            categoryService.hardDeleteCategory(id);
        } else {
            categoryService.delete(id);
        }
        return Result.success();
    }
    
    /**
     * 恢复分类
     * PUT /api/v1/admin/categories/{id}/restore
     */
    @PutMapping("/categories/{id}/restore")
    @Operation(summary = "恢复分类", description = "恢复已软删除的分类")
    public Result<Void> restoreCategory(@PathVariable Long id) {
        log.info("管理员恢复分类: categoryId={}", id);
        categoryService.restoreCategory(id);
        return Result.success();
    }
    
    /**
     * 批量更新分类排序
     * PUT /api/v1/admin/categories/reorder
     */
    @PutMapping("/categories/reorder")
    @Operation(summary = "批量更新分类排序", description = "拖拽排序后批量更新分类的排序顺序")
    public Result<Void> reorderCategories(@Valid @RequestBody CategoryReorderRequest request) {
        log.info("管理员批量更新分类排序: itemCount={}", request.getItems().size());
        categoryService.reorderCategories(request);
        return Result.success();
    }
    
    // ==================== Statistics ====================
    
    /**
     * 获取使用趋势数据
     * GET /api/v1/admin/statistics/usage-trend
     */
    @GetMapping("/statistics/usage-trend")
    @Operation(
        summary = "获取使用趋势",
        description = "返回指定天数内的工具使用趋势数据，按日期聚合"
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "成功获取使用趋势数据"
        )
    })
    public Result<List<TrendDataPoint>> getUsageTrend(
            @Parameter(description = "统计天数", example = "30") @RequestParam(defaultValue = "30") Integer days) {
        log.info("管理员查询使用趋势: days={}", days);
        List<TrendDataPoint> trend = adminStatisticsService.getUsageTrend(days);
        return Result.success(trend);
    }
    
    /**
     * 获取用户增长趋势
     * GET /api/v1/admin/statistics/user-trend
     */
    @GetMapping("/statistics/user-trend")
    @Operation(
        summary = "获取用户增长趋势",
        description = "返回指定天数内的用户注册趋势数据，按日期聚合"
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "成功获取用户增长趋势数据"
        )
    })
    public Result<List<TrendDataPoint>> getUserTrend(
            @Parameter(description = "统计天数", example = "30") @RequestParam(defaultValue = "30") Integer days) {
        log.info("管理员查询用户增长趋势: days={}", days);
        List<TrendDataPoint> trend = adminStatisticsService.getUserTrend(days);
        return Result.success(trend);
    }
    
    /**
     * 获取热门工具
     * GET /api/v1/admin/statistics/popular-tools
     */
    @GetMapping("/statistics/popular-tools")
    @Operation(
        summary = "获取热门工具",
        description = "返回使用次数最多的工具列表，按使用次数降序排列"
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "成功获取热门工具数据"
        )
    })
    public Result<List<PopularToolData>> getPopularTools(
            @Parameter(description = "返回数量限制", example = "10") @RequestParam(defaultValue = "10") Integer limit) {
        log.info("管理员查询热门工具: limit={}", limit);
        List<PopularToolData> popularTools = adminStatisticsService.getPopularTools(limit);
        return Result.success(popularTools);
    }
    
    // ==================== Email Management ====================
    
    /**
     * 分页查询邮件审计日志
     * GET /api/v1/admin/emails/logs
     */
    @GetMapping("/emails/logs")
    @Operation(
        summary = "查询邮件审计日志",
        description = "支持分页、收件人搜索、邮件类型过滤、状态过滤、时间范围过滤"
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "成功获取邮件日志列表",
            content = @Content(schema = @Schema(implementation = PageResult.class))
        ),
        @ApiResponse(
            responseCode = "401",
            description = "未认证",
            content = @Content(schema = @Schema(implementation = Result.class))
        ),
        @ApiResponse(
            responseCode = "403",
            description = "无权限",
            content = @Content(schema = @Schema(implementation = Result.class))
        )
    })
    public Result<PageResult<com.polaris.dto.email.EmailAuditLogResponse>> listEmailLogs(
            @Parameter(description = "邮件日志查询请求参数") @Valid com.polaris.dto.email.EmailAuditLogQueryRequest request) {
        log.info("管理员查询邮件审计日志: {}", request);
        PageResult<com.polaris.dto.email.EmailAuditLogResponse> result = emailAuditLogService.list(request);
        return Result.success(result);
    }
    
    /**
     * 获取邮件审计日志详情
     * GET /api/v1/admin/emails/logs/{id}
     */
    @GetMapping("/emails/logs/{id}")
    @Operation(
        summary = "获取邮件日志详情",
        description = "根据日志ID获取详细信息"
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "成功获取邮件日志详情",
            content = @Content(schema = @Schema(implementation = com.polaris.dto.email.EmailAuditLogResponse.class))
        ),
        @ApiResponse(
            responseCode = "404",
            description = "邮件日志不存在",
            content = @Content(schema = @Schema(implementation = Result.class))
        )
    })
    public Result<com.polaris.dto.email.EmailAuditLogResponse> getEmailLog(
            @Parameter(description = "日志ID", required = true) @PathVariable Long id) {
        log.info("管理员查询邮件日志详情: logId={}", id);
        com.polaris.dto.email.EmailAuditLogResponse emailLog = emailAuditLogService.getById(id);
        return Result.success(emailLog);
    }
    
    /**
     * 获取邮件统计信息
     * GET /api/v1/admin/emails/statistics
     */
    @GetMapping("/emails/statistics")
    @Operation(
        summary = "获取邮件统计信息",
        description = "返回邮件发送的统计数据，包括总数、成功率、各类型分布等"
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "成功获取邮件统计信息",
            content = @Content(schema = @Schema(implementation = com.polaris.dto.email.EmailStatisticsResponse.class))
        )
    })
    public Result<com.polaris.dto.email.EmailStatisticsResponse> getEmailStatistics() {
        log.info("管理员查询邮件统计信息");
        com.polaris.dto.email.EmailStatisticsResponse statistics = emailAuditLogService.getEmailStatistics();
        return Result.success(statistics);
    }
    
    /**
     * 清理旧邮件日志
     * DELETE /api/v1/admin/emails/logs/cleanup
     */
    @DeleteMapping("/emails/logs/cleanup")
    @Operation(
        summary = "清理旧邮件日志",
        description = "删除指定天数之前的邮件日志记录，用于定期清理历史数据"
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "成功清理邮件日志"
        )
    })
    public Result<Map<String, Object>> cleanupOldEmailLogs(
            @Parameter(description = "保留天数", example = "90") @RequestParam(defaultValue = "90") Integer days) {
        log.info("管理员清理邮件日志: days={}", days);
        int deletedCount = emailAuditLogService.cleanupOldLogs(days);
        
        Map<String, Object> response = new HashMap<>();
        response.put("deletedCount", deletedCount);
        response.put("message", String.format("已清理 %d 天前的邮件日志，共删除 %d 条记录", days, deletedCount));
        
        return Result.success(response);
    }
    
    // ==================== Rate Limit Management ====================
    
    /**
     * 查询邮箱级限流状态
     * GET /api/v1/admin/rate-limits/email/{email}
     */
    @GetMapping("/rate-limits/email/{email}")
    @Operation(
        summary = "查询邮箱级限流状态",
        description = "查询指定邮箱地址的限流状态和剩余冷却时间"
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "成功获取限流状态",
            content = @Content(schema = @Schema(implementation = com.polaris.dto.email.RateLimitStatsResponse.class))
        )
    })
    public Result<com.polaris.dto.email.RateLimitStatsResponse> getEmailRateLimitStats(
            @Parameter(description = "邮箱地址", required = true) @PathVariable String email) {
        log.info("管理员查询邮箱级限流状态: email={}", email);
        
        long remainingSeconds = emailRateLimiter.getEmailRateLimitRemaining(email);
        boolean limited = remainingSeconds > 0;
        
        com.polaris.dto.email.RateLimitStatsResponse stats = com.polaris.dto.email.RateLimitStatsResponse.builder()
                .email(email)
                .limitType("email")
                .limited(limited)
                .remainingSeconds(remainingSeconds)
                .maxLimit(1)
                .usageCount(limited ? 1 : 0)
                .build();
        
        return Result.success(stats);
    }
    
    /**
     * 查询用户级每日限流状态
     * GET /api/v1/admin/rate-limits/user/{userId}
     */
    @GetMapping("/rate-limits/user/{userId}")
    @Operation(
        summary = "查询用户级每日限流状态",
        description = "查询指定用户的每日限流使用情况"
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "成功获取限流状态",
            content = @Content(schema = @Schema(implementation = com.polaris.dto.email.RateLimitStatsResponse.class))
        )
    })
    public Result<com.polaris.dto.email.RateLimitStatsResponse> getUserRateLimitStats(
            @Parameter(description = "用户ID", required = true) @PathVariable Long userId) {
        log.info("管理员查询用户级限流状态: userId={}", userId);
        
        int usageCount = emailRateLimiter.getUserDailyLimitUsage(userId);
        int maxLimit = 5; // From config
        boolean limited = usageCount >= maxLimit;
        
        com.polaris.dto.email.RateLimitStatsResponse stats = com.polaris.dto.email.RateLimitStatsResponse.builder()
                .userId(userId)
                .limitType("user")
                .limited(limited)
                .usageCount(usageCount)
                .maxLimit(maxLimit)
                .build();
        
        return Result.success(stats);
    }
    
    /**
     * 查询 IP 级限流状态
     * GET /api/v1/admin/rate-limits/ip/{ipAddress}
     */
    @GetMapping("/rate-limits/ip/{ipAddress}")
    @Operation(
        summary = "查询 IP 级限流状态",
        description = "查询指定 IP 地址的限流使用情况"
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "成功获取限流状态",
            content = @Content(schema = @Schema(implementation = com.polaris.dto.email.RateLimitStatsResponse.class))
        )
    })
    public Result<com.polaris.dto.email.RateLimitStatsResponse> getIpRateLimitStats(
            @Parameter(description = "IP 地址", required = true) @PathVariable String ipAddress) {
        log.info("管理员查询 IP 级限流状态: ip={}", ipAddress);
        
        int usageCount = emailRateLimiter.getIpRateLimitUsage(ipAddress);
        int maxLimit = 3; // From config
        boolean limited = usageCount >= maxLimit;
        
        com.polaris.dto.email.RateLimitStatsResponse stats = com.polaris.dto.email.RateLimitStatsResponse.builder()
                .ipAddress(ipAddress)
                .limitType("ip")
                .limited(limited)
                .usageCount(usageCount)
                .maxLimit(maxLimit)
                .build();
        
        return Result.success(stats);
    }
    
    /**
     * 重置限流计数器
     * POST /api/v1/admin/rate-limits/reset
     */
    @PostMapping("/rate-limits/reset")
    @Operation(
        summary = "重置限流计数器",
        description = "手动重置指定的限流计数器，支持邮箱级、用户级和 IP 级限流"
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "成功重置限流计数器"
        ),
        @ApiResponse(
            responseCode = "400",
            description = "请求参数错误",
            content = @Content(schema = @Schema(implementation = Result.class))
        )
    })
    public Result<Map<String, Object>> resetRateLimit(
            @Parameter(description = "重置限流请求", required = true) 
            @Valid @RequestBody com.polaris.dto.email.ResetRateLimitRequest request) {
        log.info("管理员重置限流计数器: {}", request);
        
        String message;
        switch (request.getLimitType().toLowerCase()) {
            case "email":
                if (request.getEmail() == null || request.getEmail().isEmpty()) {
                    return Result.error(400, "邮箱地址不能为空");
                }
                emailRateLimiter.resetEmailRateLimit(request.getEmail());
                message = String.format("已重置邮箱 %s 的限流计数器", request.getEmail());
                break;
                
            case "user":
                if (request.getUserId() == null) {
                    return Result.error(400, "用户 ID 不能为空");
                }
                emailRateLimiter.resetUserDailyLimit(request.getUserId());
                message = String.format("已重置用户 %d 的限流计数器", request.getUserId());
                break;
                
            case "ip":
                if (request.getIpAddress() == null || request.getIpAddress().isEmpty()) {
                    return Result.error(400, "IP 地址不能为空");
                }
                emailRateLimiter.resetIpRateLimit(request.getIpAddress());
                message = String.format("已重置 IP %s 的限流计数器", request.getIpAddress());
                break;
                
            default:
                return Result.error(400, "不支持的限流类型: " + request.getLimitType());
        }
        
        Map<String, Object> response = new HashMap<>();
        response.put("message", message);
        response.put("limitType", request.getLimitType());
        
        return Result.success(response);
    }
}
