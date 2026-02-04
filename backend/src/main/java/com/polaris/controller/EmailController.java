package com.polaris.controller;

import com.polaris.common.result.PageResult;
import com.polaris.common.result.Result;
import com.polaris.dto.email.AdminSendEmailRequest;
import com.polaris.dto.email.EmailQueueStatsResponse;
import com.polaris.dto.email.SendEmailRequest;
import com.polaris.dto.email.SendEmailResponse;
import com.polaris.entity.EmailPriority;
import com.polaris.entity.EmailQueue;
import com.polaris.security.RequireAdmin;
import com.polaris.service.EmailQueueService;
import com.polaris.service.EmailService;
import io.swagger.v3.oas.annotations.Operation;
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
import java.util.Map;

/**
 * 邮件管理控制器
 * 提供管理员邮件发送功能
 */
@RestController
@RequestMapping("/api/v1/admin/email")
@RequireAdmin
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Email Management", description = "邮件管理接口 - 提供邮件发送功能，需要管理员权限")
@SecurityRequirement(name = "bearer-jwt")
public class EmailController {
    
    private final EmailService emailService;
    private final EmailQueueService emailQueueService;
    
    /**
     * 发送自定义邮件
     * POST /api/v1/admin/email/send
     */
    @PostMapping("/send")
    @Operation(
        summary = "发送自定义邮件",
        description = "管理员发送自定义邮件给指定用户"
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "邮件发送成功",
            content = @Content(schema = @Schema(implementation = SendEmailResponse.class))
        ),
        @ApiResponse(
            responseCode = "400",
            description = "请求参数错误"
        ),
        @ApiResponse(
            responseCode = "403",
            description = "权限不足"
        ),
        @ApiResponse(
            responseCode = "500",
            description = "邮件发送失败"
        )
    })
    public Result<SendEmailResponse> sendEmail(@Valid @RequestBody AdminSendEmailRequest request) {
        log.info("管理员发送邮件: to={}, subject={}", request.getTo(), request.getSubject());
        
        SendEmailRequest emailRequest = SendEmailRequest.builder()
                .to(request.getTo())
                .subject(request.getSubject())
                .html(request.getHtml())
                .cc(request.getCc())
                .bcc(request.getBcc())
                .build();
        
        SendEmailResponse response = emailService.sendEmail(emailRequest);
        
        if (response.isSuccess()) {
            return Result.success(response);
        } else {
            return Result.error(500, response.getMessage());
        }
    }
    
    /**
     * 发送测试邮件
     * POST /api/v1/admin/email/test
     */
    @PostMapping("/test")
    @Operation(
        summary = "发送测试邮件",
        description = "发送一封测试邮件来验证邮件服务配置"
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "测试邮件发送成功"
        ),
        @ApiResponse(
            responseCode = "400",
            description = "请求参数错误"
        ),
        @ApiResponse(
            responseCode = "500",
            description = "邮件发送失败"
        )
    })
    public Result<SendEmailResponse> sendTestEmail(@RequestParam String to) {
        log.info("发送测试邮件: to={}", to);
        
        String testHtml = """
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                    .success { color: #28a745; font-size: 48px; }
                    .footer { text-align: center; margin-top: 20px; color: #888; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🧪 测试邮件</h1>
                    </div>
                    <div class="content">
                        <p style="text-align: center;" class="success">✅</p>
                        <h2 style="text-align: center;">邮件服务配置成功！</h2>
                        <p style="text-align: center;">如果您能看到这封邮件，说明 AWS SES 邮件服务已正确配置。</p>
                        <p style="text-align: center; color: #888;">此邮件由 Polaris Tools 管理后台发送</p>
                    </div>
                    <div class="footer">
                        <p>© 2024 Polaris Tools. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
            """;
        
        SendEmailResponse response = emailService.sendSimpleEmail(
                to, 
                "Polaris Tools - 邮件服务测试", 
                testHtml
        );
        
        if (response.isSuccess()) {
            return Result.success(response);
        } else {
            return Result.error(500, response.getMessage());
        }
    }
    
    /**
     * 获取队列统计信息
     * GET /api/v1/admin/email/queue/stats
     */
    @GetMapping("/queue/stats")
    @Operation(
        summary = "获取队列统计信息",
        description = "获取邮件队列的统计信息，包括队列长度、处理速度、失败率等"
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "获取成功",
            content = @Content(schema = @Schema(implementation = EmailQueueStatsResponse.class))
        ),
        @ApiResponse(
            responseCode = "403",
            description = "权限不足"
        )
    })
    public Result<EmailQueueStatsResponse> getQueueStats() {
        log.info("获取邮件队列统计信息");
        
        EmailQueueStatsResponse stats = new EmailQueueStatsResponse();
        stats.setQueueLength(emailQueueService.getQueueLength());
        stats.setProcessingSpeed(emailQueueService.getProcessingSpeed());
        stats.setFailureRate(emailQueueService.getFailureRate());
        
        return Result.success(stats);
    }
    
    /**
     * 手动重试失败的邮件
     * POST /api/v1/admin/email/queue/retry/{queueId}
     */
    @PostMapping("/queue/retry/{queueId}")
    @Operation(
        summary = "手动重试失败的邮件",
        description = "手动重试指定的失败邮件"
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "重试成功"
        ),
        @ApiResponse(
            responseCode = "400",
            description = "请求参数错误"
        ),
        @ApiResponse(
            responseCode = "403",
            description = "权限不足"
        ),
        @ApiResponse(
            responseCode = "404",
            description = "队列项不存在"
        )
    })
    public Result<SendEmailResponse> retryFailedEmail(@PathVariable Long queueId) {
        log.info("手动重试失败邮件: queueId={}", queueId);
        
        SendEmailResponse response = emailQueueService.retryFailedEmail(queueId);
        
        if (response.isSuccess()) {
            return Result.success(response);
        } else {
            return Result.error(400, response.getMessage());
        }
    }
    
    /**
     * 获取邮件队列列表
     * GET /api/v1/admin/email/queue
     */
    @GetMapping("/queue")
    @Operation(
        summary = "获取邮件队列列表",
        description = "分页获取邮件队列项列表"
    )
    public Result<PageResult<EmailQueue>> getQueueList(
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "20") Integer size,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String priority,
            @RequestParam(defaultValue = "scheduledAt") String sortBy,
            @RequestParam(defaultValue = "asc") String sortOrder) {
        log.info("获取邮件队列列表: page={}, size={}, status={}, priority={}", page, size, status, priority);
        
        PageResult<EmailQueue> result = emailQueueService.getQueueList(page, size, status, priority, sortBy, sortOrder);
        return Result.success(result);
    }
    
    /**
     * 获取邮件队列配置
     * GET /api/v1/admin/email/queue/config
     */
    @GetMapping("/queue/config")
    @Operation(
        summary = "获取邮件队列配置",
        description = "获取邮件队列的配置信息"
    )
    public Result<Map<String, Object>> getQueueConfig() {
        log.info("获取邮件队列配置");
        
        Map<String, Object> config = new HashMap<>();
        config.put("enabled", emailQueueService.isQueueEnabled());
        config.put("workerThreads", emailQueueService.getWorkerThreads());
        config.put("batchSize", emailQueueService.getBatchSize());
        config.put("maxRetries", 3);
        config.put("retryDelay", 300);
        config.put("retryDelaySeconds", 60);
        
        return Result.success(config);
    }
    
    /**
     * 取消待发送邮件
     * POST /api/v1/admin/email/queue/cancel/{queueId}
     */
    @PostMapping("/queue/cancel/{queueId}")
    @RequireAdmin
    @Operation(summary = "取消待发送邮件", description = "取消队列中待发送的邮件")
    public Result<Map<String, Object>> cancelEmail(@PathVariable Long queueId) {
        log.info("取消邮件: queueId={}", queueId);
        
        try {
            boolean success = emailQueueService.cancelEmail(queueId);
            Map<String, Object> result = new HashMap<>();
            result.put("success", success);
            result.put("message", success ? "邮件已取消" : "取消失败");
            return Result.success(result);
        } catch (Exception e) {
            log.error("取消邮件失败: queueId={}, error={}", queueId, e.getMessage(), e);
            Map<String, Object> result = new HashMap<>();
            result.put("success", false);
            result.put("message", e.getMessage());
            return Result.error(500, e.getMessage());
        }
    }
    
    /**
     * 修改邮件优先级
     * PUT /api/v1/admin/email/queue/{queueId}/priority
     */
    @PutMapping("/queue/{queueId}/priority")
    @RequireAdmin
    @Operation(summary = "修改邮件优先级", description = "修改队列中邮件的优先级")
    public Result<Map<String, Object>> updatePriority(
            @PathVariable Long queueId,
            @RequestBody Map<String, String> request) {
        log.info("修改邮件优先级: queueId={}, priority={}", queueId, request.get("priority"));
        
        try {
            String priorityStr = request.get("priority");
            EmailPriority priority = EmailPriority.valueOf(priorityStr);
            boolean success = emailQueueService.updatePriority(queueId, priority);
            
            Map<String, Object> result = new HashMap<>();
            result.put("success", success);
            result.put("message", success ? "优先级已更新" : "更新失败");
            return Result.success(result);
        } catch (Exception e) {
            log.error("修改优先级失败: queueId={}, error={}", queueId, e.getMessage(), e);
            Map<String, Object> result = new HashMap<>();
            result.put("success", false);
            result.put("message", e.getMessage());
            return Result.error(500, e.getMessage());
        }
    }
    
    /**
     * 暂停队列处理
     * POST /api/v1/admin/email/queue/pause
     */
    @PostMapping("/queue/pause")
    @RequireAdmin
    @Operation(summary = "暂停队列处理", description = "暂停邮件队列的处理")
    public Result<Map<String, Object>> pauseQueue() {
        log.info("暂停邮件队列");
        
        try {
            emailQueueService.pauseQueue();
            Map<String, Object> result = new HashMap<>();
            result.put("success", true);
            result.put("message", "队列已暂停");
            return Result.success(result);
        } catch (Exception e) {
            log.error("暂停队列失败: error={}", e.getMessage(), e);
            Map<String, Object> result = new HashMap<>();
            result.put("success", false);
            result.put("message", e.getMessage());
            return Result.error(500, e.getMessage());
        }
    }
    
    /**
     * 恢复队列处理
     * POST /api/v1/admin/email/queue/resume
     */
    @PostMapping("/queue/resume")
    @RequireAdmin
    @Operation(summary = "恢复队列处理", description = "恢复邮件队列的处理")
    public Result<Map<String, Object>> resumeQueue() {
        log.info("恢复邮件队列");
        
        try {
            emailQueueService.resumeQueue();
            Map<String, Object> result = new HashMap<>();
            result.put("success", true);
            result.put("message", "队列已恢复");
            return Result.success(result);
        } catch (Exception e) {
            log.error("恢复队列失败: error={}", e.getMessage(), e);
            Map<String, Object> result = new HashMap<>();
            result.put("success", false);
            result.put("message", e.getMessage());
            return Result.error(500, e.getMessage());
        }
    }
    
    /**
     * 更新队列配置
     * PUT /api/v1/admin/email/queue/config
     */
    @PutMapping("/queue/config")
    @RequireAdmin
    @Operation(summary = "更新队列配置", description = "更新邮件队列的配置")
    public Result<Map<String, Object>> updateQueueConfig(@RequestBody Map<String, Object> config) {
        log.info("更新邮件队列配置: {}", config);
        
        try {
            if (config.containsKey("workerThreads")) {
                emailQueueService.setWorkerThreads((Integer) config.get("workerThreads"));
            }
            if (config.containsKey("batchSize")) {
                emailQueueService.setBatchSize((Integer) config.get("batchSize"));
            }
            
            Map<String, Object> result = new HashMap<>();
            result.put("enabled", emailQueueService.isQueueEnabled());
            result.put("workerThreads", emailQueueService.getWorkerThreads());
            result.put("batchSize", emailQueueService.getBatchSize());
            result.put("maxRetries", 3);
            result.put("retryDelay", 300);
            result.put("retryDelaySeconds", 60);
            
            return Result.success(result);
        } catch (Exception e) {
            log.error("更新队列配置失败: error={}", e.getMessage(), e);
            return Result.error(500, e.getMessage());
        }
    }
}
