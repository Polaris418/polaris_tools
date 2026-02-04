package com.polaris.controller;

import com.polaris.common.result.PageResult;
import com.polaris.common.result.Result;
import com.polaris.dto.NotificationCreateRequest;
import com.polaris.dto.NotificationQueryRequest;
import com.polaris.dto.NotificationResponse;
import com.polaris.dto.NotificationUpdateRequest;
import com.polaris.security.RequireAdmin;
import com.polaris.service.NotificationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

/**
 * 通知控制器
 * 提供用户通知管理功能
 * 用户端接口需要登录认证（通过JWT Filter自动处理）
 * 管理员接口需要管理员权限
 * 
 * 注意：此控制器不继承 BaseController，因为其 API 契约与 BaseController 提供的标准 CRUD 端点不同。
 * 通知功能的特殊性在于：
 * 1. GET / 返回当前用户的通知列表，而不是所有通知的分页结果
 * 2. 有多个特殊端点（/unread-count、/{id}/read、/read-all、/send、/admin/all、/{id}/restore、/{id}/resend）
 * 3. 用户端点和管理员端点混合在同一个控制器中，权限控制复杂
 * 4. PUT /{id} 仅用于管理员更新，用户端使用 PUT /{id}/read 标记为已读
 * 
 * 如果强制继承 BaseController，会导致 Spring 检测到重复的路径映射而启动失败。
 * 这是一个合理的设计决策，符合"不强制所有文件都继承基类"的原则。
 * 
 * 详见：.kiro/specs/backend-architecture-completion/NOTIFICATIONCONTROLLER_REFACTORING_DECISION.md
 */
@RestController
@RequestMapping("/api/v1/notifications")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Notification Management", description = "通知管理 API")
@SecurityRequirement(name = "bearer-jwt")
public class NotificationController {
    
    private final NotificationService notificationService;
    
    /**
     * 获取当前用户的通知列表
     * GET /api/v1/notifications
     */
    @GetMapping
    @Operation(summary = "获取通知列表", description = "获取当前用户的通知列表，支持分页和筛选")
    public Result<PageResult<NotificationResponse>> listNotifications(
        @Parameter(description = "页码", example = "1") @RequestParam(defaultValue = "1") Integer page,
        @Parameter(description = "每页大小", example = "20") @RequestParam(defaultValue = "20") Integer size,
        @Parameter(description = "通知类型") @RequestParam(required = false) String type,
        @Parameter(description = "是否已读（0-未读，1-已读）") @RequestParam(required = false) Integer isRead
    ) {
        NotificationQueryRequest query = new NotificationQueryRequest();
        query.setPage(page);
        query.setSize(size);
        query.setType(type);
        query.setIsRead(isRead);
        
        PageResult<NotificationResponse> result = notificationService.listUserNotifications(query);
        return Result.success(result);
    }
    
    /**
     * 获取未读通知数量
     * GET /api/v1/notifications/unread-count
     */
    @GetMapping("/unread-count")
    @Operation(summary = "获取未读通知数量", description = "获取当前用户的未读通知数量")
    public Result<Long> getUnreadCount() {
        Long count = notificationService.getUnreadCount();
        return Result.success(count);
    }
    
    /**
     * 标记通知为已读
     * PUT /api/v1/notifications/{id}/read
     */
    @PutMapping("/{id}/read")
    @Operation(summary = "标记通知为已读", description = "将指定通知标记为已读状态")
    public Result<Void> markAsRead(
        @Parameter(description = "通知ID") @PathVariable Long id
    ) {
        notificationService.markAsRead(id);
        return Result.success();
    }
    
    /**
     * 标记所有通知为已读
     * PUT /api/v1/notifications/read-all
     */
    @PutMapping("/read-all")
    @Operation(summary = "标记所有通知为已读", description = "将当前用户的所有通知标记为已读")
    public Result<Void> markAllAsRead() {
        notificationService.markAllAsRead();
        return Result.success();
    }
    
    /**
     * 删除通知
     * DELETE /api/v1/notifications/{id}
     */
    @DeleteMapping("/{id}")
    @Operation(summary = "删除通知", description = "删除指定通知（软删除）")
    public Result<Void> deleteNotification(
        @Parameter(description = "通知ID") @PathVariable Long id
    ) {
        notificationService.deleteNotification(id);
        return Result.success();
    }
    
    // ==================== 管理员端点 ====================
    
    /**
     * 发送通知（管理员）
     * POST /api/v1/notifications/send
     */
    @PostMapping("/send")
    @RequireAdmin
    @Operation(summary = "发送通知（管理员）", description = "发送个人通知或全站通知，仅管理员可用")
    public Result<Long> sendNotification(
        @Valid @RequestBody NotificationCreateRequest request
    ) {
        Long count = notificationService.sendNotification(request);
        return Result.success(count);
    }
    
    /**
     * 获取所有通知列表（管理员）
     * GET /api/v1/notifications/admin/all
     */
    @GetMapping("/admin/all")
    @RequireAdmin
    @Operation(summary = "获取所有通知（管理员）", description = "获取系统所有通知记录，仅管理员可用")
    public Result<PageResult<NotificationResponse>> listAllNotifications(
        @Parameter(description = "页码", example = "1") @RequestParam(defaultValue = "1") Integer page,
        @Parameter(description = "每页大小", example = "20") @RequestParam(defaultValue = "20") Integer size,
        @Parameter(description = "通知类型") @RequestParam(required = false) String type,
        @Parameter(description = "是否包含已删除") @RequestParam(required = false) Boolean includeDeleted
    ) {
        NotificationQueryRequest query = new NotificationQueryRequest();
        query.setPage(page);
        query.setSize(size);
        query.setType(type);
        query.setIncludeDeleted(includeDeleted);
        
        PageResult<NotificationResponse> result = notificationService.listAllNotifications(query);
        return Result.success(result);
    }
    
    /**
     * 更新通知（管理员）
     * PUT /api/v1/notifications/{id}
     */
    @PutMapping("/{id}")
    @RequireAdmin
    @Operation(summary = "更新通知（管理员）", description = "更新通知内容，支持单独更新或批量更新全站通知，支持编辑已删除的通知，仅管理员可用")
    public Result<Integer> updateNotification(
        @Parameter(description = "通知ID") @PathVariable Long id,
        @RequestBody NotificationUpdateRequest request
    ) {
        Integer count = notificationService.updateNotification(id, request);
        return Result.success(count);
    }
    
    /**
     * 恢复已删除的通知（管理员）
     * POST /api/v1/notifications/{id}/restore
     */
    @PostMapping("/{id}/restore")
    @RequireAdmin
    @Operation(summary = "恢复通知（管理员）", description = "恢复已删除的通知，仅管理员可用")
    public Result<Void> restoreNotification(
        @Parameter(description = "通知ID") @PathVariable Long id
    ) {
        notificationService.restoreNotification(id);
        return Result.success();
    }
    
    /**
     * 重新发送已删除的通知（管理员）
     * POST /api/v1/notifications/{id}/resend
     */
    @PostMapping("/{id}/resend")
    @RequireAdmin
    @Operation(summary = "重新发送通知（管理员）", description = "重新发送已删除的通知，仅管理员可用")
    public Result<Integer> resendNotification(
        @Parameter(description = "通知ID") @PathVariable Long id
    ) {
        Integer count = notificationService.resendNotification(id);
        return Result.success(count);
    }
}
