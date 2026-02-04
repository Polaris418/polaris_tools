package com.polaris.service.impl;

import com.polaris.entity.EmailPriority;
import com.polaris.entity.VerificationPurpose;
import com.polaris.service.AsyncVerificationEmailService;
import com.polaris.service.EmailQueueService;
import com.polaris.service.TemplateService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

/**
 * 异步验证码邮件服务实现类
 * 使用邮件队列异步发送验证码邮件
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AsyncVerificationEmailServiceImpl implements AsyncVerificationEmailService {
    
    private final EmailQueueService emailQueueService;
    private final TemplateService templateService;
    
    // 验证码邮件模板代码映射
    private static final Map<VerificationPurpose, String> TEMPLATE_CODE_MAP = new HashMap<>();
    
    static {
        TEMPLATE_CODE_MAP.put(VerificationPurpose.REGISTER, "VERIFICATION_CODE_REGISTER");
        TEMPLATE_CODE_MAP.put(VerificationPurpose.LOGIN, "VERIFICATION_CODE_LOGIN");
        TEMPLATE_CODE_MAP.put(VerificationPurpose.RESET, "VERIFICATION_CODE_RESET");
        TEMPLATE_CODE_MAP.put(VerificationPurpose.VERIFY, "EMAIL_VERIFICATION");
        TEMPLATE_CODE_MAP.put(VerificationPurpose.CHANGE, "VERIFICATION_CODE_CHANGE");
    }
    
    @Override
    @Async("emailTaskExecutor")
    public CompletableFuture<Boolean> sendVerificationCodeAsync(
            String email, 
            String code, 
            VerificationPurpose purpose, 
            String language) {
        
        log.info("异步发送验证码邮件: email={}, purpose={}, language={}", email, purpose, language);
        
        try {
            // 获取模板代码
            String templateCode = TEMPLATE_CODE_MAP.get(purpose);
            if (templateCode == null) {
                log.error("未找到验证码用途对应的模板: purpose={}", purpose);
                return CompletableFuture.completedFuture(false);
            }
            
            // 准备模板变量
            Map<String, Object> variables = new HashMap<>();
            variables.put("code", code);
            variables.put("expiryMinutes", 10);
            variables.put("purpose", getPurposeDisplayName(purpose, language));
            
            // 渲染邮件模板
            TemplateService.RenderedTemplate rendered = templateService.renderTemplate(templateCode, language, variables);
            String subject = rendered.getSubject() != null ? rendered.getSubject() : getEmailSubject(purpose, language);
            String htmlContent = rendered.getHtmlContent();
            String textContent = rendered.getTextContent() != null ? rendered.getTextContent() 
                    : String.format("您的验证码是: %s，有效期10分钟。", code);
            
            // 加入邮件队列（高优先级）
            Long queueId = emailQueueService.enqueue(
                    email,
                    subject,
                    htmlContent,
                    textContent,
                    "VERIFICATION_CODE",
                    EmailPriority.HIGH
            );
            
            log.info("验证码邮件已加入队列: email={}, purpose={}, queueId={}", email, purpose, queueId);
            return CompletableFuture.completedFuture(queueId != null);
            
        } catch (Exception e) {
            log.error("异步发送验证码邮件失败: email={}, purpose={}, error={}", 
                    email, purpose, e.getMessage(), e);
            return CompletableFuture.completedFuture(false);
        }
    }
    
    @Override
    @Async("emailTaskExecutor")
    public CompletableFuture<Boolean> sendEmailChangeNotificationAsync(
            String oldEmail, 
            String newEmail, 
            String language) {
        
        log.info("异步发送邮箱修改通知: oldEmail={}, newEmail={}, language={}", oldEmail, newEmail, language);
        
        try {
            // 准备模板变量
            Map<String, Object> variables = new HashMap<>();
            variables.put("oldEmail", oldEmail);
            variables.put("newEmail", newEmail);
            
            // 渲染邮件模板
            String templateCode = "EMAIL_CHANGE_NOTIFICATION";
            TemplateService.RenderedTemplate rendered = templateService.renderTemplate(templateCode, language, variables);
            String subject = rendered.getSubject() != null ? rendered.getSubject() 
                    : (language.equals("zh-CN") ? "邮箱修改通知" : "Email Change Notification");
            String htmlContent = rendered.getHtmlContent();
            String textContent = rendered.getTextContent() != null ? rendered.getTextContent() 
                    : String.format("您的邮箱已从 %s 修改为 %s", oldEmail, newEmail);
            
            // 加入邮件队列（普通优先级）
            Long queueId = emailQueueService.enqueue(
                    oldEmail,
                    subject,
                    htmlContent,
                    textContent,
                    "EMAIL_CHANGE_NOTIFICATION",
                    EmailPriority.MEDIUM
            );
            
            log.info("邮箱修改通知已加入队列: oldEmail={}, queueId={}", oldEmail, queueId);
            return CompletableFuture.completedFuture(queueId != null);
            
        } catch (Exception e) {
            log.error("异步发送邮箱修改通知失败: oldEmail={}, error={}", 
                    oldEmail, e.getMessage(), e);
            return CompletableFuture.completedFuture(false);
        }
    }
    
    @Override
    public long getQueueLength() {
        return emailQueueService.getQueueLength();
    }
    
    @Override
    public double getSuccessRate() {
        return 1.0 - emailQueueService.getFailureRate();
    }
    
    /**
     * 获取验证码用途的显示名称
     * 
     * @param purpose 验证码用途
     * @param language 语言代码
     * @return 显示名称
     */
    private String getPurposeDisplayName(VerificationPurpose purpose, String language) {
        if (language.equals("zh-CN")) {
            switch (purpose) {
                case REGISTER: return "注册";
                case LOGIN: return "登录";
                case RESET: return "密码重置";
                case VERIFY: return "邮箱验证";
                case CHANGE: return "邮箱修改";
                default: return "验证";
            }
        } else {
            switch (purpose) {
                case REGISTER: return "Registration";
                case LOGIN: return "Login";
                case RESET: return "Password Reset";
                case VERIFY: return "Email Verification";
                case CHANGE: return "Email Change";
                default: return "Verification";
            }
        }
    }
    
    /**
     * 获取邮件主题
     * 
     * @param purpose 验证码用途
     * @param language 语言代码
     * @return 邮件主题
     */
    private String getEmailSubject(VerificationPurpose purpose, String language) {
        if (language.equals("zh-CN")) {
            switch (purpose) {
                case REGISTER: return "【Polaris Tools】注册验证码";
                case LOGIN: return "【Polaris Tools】登录验证码";
                case RESET: return "【Polaris Tools】密码重置验证码";
                case VERIFY: return "【Polaris Tools】邮箱验证码";
                case CHANGE: return "【Polaris Tools】邮箱修改验证码";
                default: return "【Polaris Tools】验证码";
            }
        } else {
            switch (purpose) {
                case REGISTER: return "[Polaris Tools] Registration Verification Code";
                case LOGIN: return "[Polaris Tools] Login Verification Code";
                case RESET: return "[Polaris Tools] Password Reset Code";
                case VERIFY: return "[Polaris Tools] Email Verification Code";
                case CHANGE: return "[Polaris Tools] Email Change Code";
                default: return "[Polaris Tools] Verification Code";
            }
        }
    }
}
