package com.polaris.controller;

import com.polaris.common.result.Result;
import com.polaris.converter.EmailTemplateConverter;
import com.polaris.dto.email.EmailTemplatePreviewRequest;
import com.polaris.dto.email.EmailTemplateRequest;
import com.polaris.dto.email.EmailTemplateResponse;
import com.polaris.dto.email.EmailTemplateTestRequest;
import com.polaris.dto.email.SendEmailResponse;
import com.polaris.entity.EmailTemplate;
import com.polaris.security.RequireAdmin;
import com.polaris.service.EmailService;
import com.polaris.service.TemplateService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * 邮件模板管理控制器
 */
@Slf4j
@RestController
@RequestMapping({"/api/v1/admin/email/templates", "/api/email/templates"})
@RequiredArgsConstructor
@Tag(name = "邮件模板管理", description = "邮件模板管理相关接口")
public class EmailTemplateController {
    
    private final TemplateService templateService;
    private final EmailTemplateConverter templateConverter;
    private final EmailService emailService;
    
    /**
     * 查询所有模板（支持筛选）
     */
    @GetMapping
    @RequireAdmin
    @Operation(summary = "查询所有模板（支持筛选）")
    public Result<List<EmailTemplateResponse>> getAllTemplates(
            @RequestParam(required = false) String language,
            @RequestParam(required = false) String code,
            @RequestParam(required = false) Boolean enabled) {
        log.info("查询邮件模板: language={}, code={}, enabled={}", language, code, enabled);
        
        List<EmailTemplate> templates = templateService.getTemplatesWithFilters(language, code, enabled);
        List<EmailTemplateResponse> responses = templates.stream()
                .map(templateConverter::toResponse)
                .collect(Collectors.toList());
        
        return Result.success(responses);
    }
    
    /**
     * 根据代码查询模板
     */
    @GetMapping("/code/{code}")
    @RequireAdmin
    @Operation(summary = "根据代码查询模板")
    public Result<List<EmailTemplateResponse>> getTemplatesByCode(@PathVariable String code) {
        log.info("根据代码查询邮件模板: code={}", code);
        
        List<EmailTemplate> templates = templateService.getTemplatesByCode(code);
        List<EmailTemplateResponse> responses = templates.stream()
                .map(templateConverter::toResponse)
                .collect(Collectors.toList());
        
        return Result.success(responses);
    }
    
    /**
     * 根据代码和语言查询模板
     */
    @GetMapping("/{code}/{language}")
    @RequireAdmin
    @Operation(summary = "根据代码和语言查询模板")
    public Result<EmailTemplateResponse> getTemplate(
            @PathVariable String code,
            @PathVariable String language) {
        log.info("根据代码和语言查询邮件模板: code={}, language={}", code, language);
        
        // 管理后台查看模板详情时，应该能看到禁用的模板
        EmailTemplate template = templateService.getTemplateIncludeDisabled(code, language);
        if (template == null) {
            return Result.error(404, "找不到指定的邮件模板");
        }
        
        return Result.success(templateConverter.toResponse(template));
    }
    
    /**
     * 创建或更新模板
     */
    @PostMapping
    @RequireAdmin
    @Operation(summary = "创建或更新模板")
    public Result<EmailTemplateResponse> saveTemplate(@Valid @RequestBody EmailTemplateRequest request) {
        log.info("保存邮件模板: code={}, language={}", request.getCode(), request.getLanguage());
        
        EmailTemplate template = templateConverter.toEntity(request);
        EmailTemplate savedTemplate = templateService.saveTemplate(template);
        
        return Result.success(templateConverter.toResponse(savedTemplate));
    }
    
    /**
     * 删除模板
     */
    @DeleteMapping("/{id}")
    @RequireAdmin
    @Operation(summary = "删除模板")
    public Result<Void> deleteTemplate(@PathVariable Long id) {
        log.info("删除邮件模板: id={}", id);
        
        templateService.deleteTemplate(id);
        
        return Result.success();
    }
    
    /**
     * 预览模板
     */
    @PostMapping("/preview")
    @RequireAdmin
    @Operation(summary = "预览模板")
    public Result<TemplateService.RenderedTemplate> previewTemplate(
            @Valid @RequestBody EmailTemplatePreviewRequest request) {
        log.info("预览邮件模板: code={}, language={}", request.getCode(), request.getLanguage());
        
        try {
            TemplateService.RenderedTemplate rendered = templateService.renderTemplate(
                    request.getCode(),
                    request.getLanguage(),
                    request.getVariables()
            );
            
            return Result.success(rendered);
        } catch (Exception e) {
            log.error("预览邮件模板失败: code={}, language={}, error={}",
                    request.getCode(), request.getLanguage(), e.getMessage(), e);
            return Result.error(500, "预览模板失败: " + e.getMessage());
        }
    }
    
    /**
     * 清除模板缓存
     */
    @PostMapping("/cache/clear")
    @RequireAdmin
    @Operation(summary = "清除模板缓存")
    public Result<Void> clearCache() {
        log.info("清除邮件模板缓存");
        
        templateService.clearCache();
        
        return Result.success();
    }
    
    /**
     * 发送测试邮件
     * POST /api/v1/admin/email/templates/test
     */
    @PostMapping("/test")
    @RequireAdmin
    @Operation(summary = "发送测试邮件", description = "使用指定模板发送测试邮件")
    public Result<Map<String, Object>> sendTestEmail(@Valid @RequestBody EmailTemplateTestRequest request) {
        log.info("发送测试邮件: templateId={}, email={}", request.getTemplateId(), request.getEmail());
        
        try {
            // 获取模板
            EmailTemplate template = templateService.getTemplateById(request.getTemplateId());
            if (template == null) {
                return Result.error(404, "找不到指定的邮件模板");
            }
            
            // 准备变量，如果没有提供则使用示例数据
            Map<String, Object> variables = new HashMap<>();
            if (request.getVariables() != null && !request.getVariables().isEmpty()) {
                variables.putAll(request.getVariables());
            } else {
                // 使用示例数据
                variables.put("username", "测试用户");
                variables.put("email", request.getEmail());
                variables.put("verificationCode", "123456");
                variables.put("verificationLink", "https://polaristools.online/verify?token=test123");
                variables.put("resetLink", "https://polaristools.online/reset-password?token=test789");
                variables.put("loginTime", java.time.LocalDateTime.now().toString());
                variables.put("ipAddress", "192.168.1.1");
                variables.put("device", "Chrome on Windows");
            }
            
            // 渲染模板
            TemplateService.RenderedTemplate rendered = templateService.renderTemplate(
                    template.getCode(),
                    template.getLanguage(),
                    variables
            );
            
            // 发送邮件
            SendEmailResponse emailResponse = emailService.sendSimpleEmail(
                    request.getEmail(),
                    rendered.getSubject(),
                    rendered.getHtmlContent()
            );
            
            Map<String, Object> result = new HashMap<>();
            result.put("success", emailResponse.isSuccess());
            result.put("message", emailResponse.getMessage());
            result.put("messageId", emailResponse.getId());
            
            if (emailResponse.isSuccess()) {
                return Result.success(result);
            } else {
                return Result.error(500, emailResponse.getMessage());
            }
            
        } catch (Exception e) {
            log.error("发送测试邮件失败: templateId={}, email={}, error={}",
                    request.getTemplateId(), request.getEmail(), e.getMessage(), e);
            return Result.error(500, "发送测试邮件失败: " + e.getMessage());
        }
    }
}
