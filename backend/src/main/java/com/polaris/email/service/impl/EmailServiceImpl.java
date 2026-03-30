package com.polaris.email.service.impl;

import com.polaris.auth.service.TokenService;
import com.polaris.email.dto.SendEmailRequest;
import com.polaris.email.dto.SendEmailResponse;
import com.polaris.email.dto.SendEmailResult;
import com.polaris.email.entity.EmailAuditLog;
import com.polaris.email.entity.EmailPriority;
import com.polaris.email.entity.EmailStatus;
import com.polaris.email.entity.EmailType;
import com.polaris.email.service.EmailAuditService;
import com.polaris.email.service.EmailProvider;
import com.polaris.email.service.EmailProviderManager;
import com.polaris.email.service.EmailQueueService;
import com.polaris.email.service.EmailRateLimiter;
import com.polaris.email.service.EmailService;
import com.polaris.email.service.SuppressionService;
import com.polaris.email.service.TemplateService;
import com.polaris.mapper.UserMapper;
import com.polaris.entity.User;
import com.polaris.service.SubscriptionService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 邮件服务实现 - 支持多邮件服务提供商
 */
@Slf4j
@Service
public class EmailServiceImpl implements EmailService {
    
    private final EmailProviderManager providerManager;
    private final EmailAuditService auditLogger;
    private final EmailRateLimiter rateLimiter;
    private final TokenService tokenService;
    private final SuppressionService suppressionService;
    private final TemplateService templateService;
    private final EmailQueueService emailQueueService;
    private final SubscriptionService subscriptionService;
    private final UserMapper userMapper;
    
    @Value("${email.queue.enabled:true}")
    private boolean queueEnabled;
    
    // 使用构造函数注入，UserMapper使用@Lazy避免循环依赖
    public EmailServiceImpl(
            EmailProviderManager providerManager,
            EmailAuditService auditLogger,
            EmailRateLimiter rateLimiter,
            TokenService tokenService,
            SuppressionService suppressionService,
            TemplateService templateService,
            @Lazy EmailQueueService emailQueueService,
            SubscriptionService subscriptionService,
            @Lazy UserMapper userMapper) {
        this.providerManager = providerManager;
        this.auditLogger = auditLogger;
        this.rateLimiter = rateLimiter;
        this.tokenService = tokenService;
        this.suppressionService = suppressionService;
        this.templateService = templateService;
        this.emailQueueService = emailQueueService;
        this.subscriptionService = subscriptionService;
        this.userMapper = userMapper;
    }
    
    @Override
    public SendEmailResponse sendEmail(SendEmailRequest request) {
        // 检查邮件服务是否启用
        EmailProvider provider = providerManager.getCurrentProvider();
        if (provider == null || !provider.isAvailable()) {
            log.warn("邮件服务不可用，跳过发送: subject={}", request.getSubject());
            return SendEmailResponse.builder()
                    .success(false)
                    .message("邮件服务不可用")
                    .build();
        }
        
        // 检查收件人是否在抑制列表中
        for (String recipient : request.getTo()) {
            if (suppressionService.isSuppressed(recipient)) {
                log.warn("收件人在抑制列表中，拒绝发送: email={}", recipient);
                
                // 创建审计日志记录拒绝原因
                EmailAuditLog auditLog = createAuditLog(request);
                auditLog.setStatus(EmailStatus.FAILED);
                auditLog.setErrorCode("SUPPRESSED");
                auditLog.setErrorMessage("收件人在抑制列表中");
                auditLogger.logEmailSent(auditLog);
                
                return SendEmailResponse.builder()
                        .success(false)
                        .message("收件人在抑制列表中，无法发送邮件")
                        .build();
            }
        }
        
        // 判断邮件类型和优先级
        String emailType = determineEmailType(request.getSubject());
        EmailPriority priority = determinePriority(emailType);
        
        // 检查用户订阅偏好（仅对通知性邮件）
        if (request.getUserId() != null) {
            EmailType emailTypeEnum = mapToEmailType(emailType);
            
            // 如果是通知性邮件且用户已退订，则拒绝发送
            if (!emailTypeEnum.isTransactional() && 
                !subscriptionService.isSubscribed(request.getUserId(), emailTypeEnum)) {
                
                log.warn("用户已退订此类邮件，拒绝发送: userId={}, emailType={}", 
                        request.getUserId(), emailType);
                
                // 创建审计日志记录拒绝原因
                EmailAuditLog auditLog = createAuditLog(request);
                auditLog.setStatus(EmailStatus.FAILED);
                auditLog.setErrorCode("UNSUBSCRIBED");
                auditLog.setErrorMessage("用户已退订此类邮件");
                auditLogger.logEmailSent(auditLog);
                
                return SendEmailResponse.builder()
                        .success(false)
                        .message("用户已退订此类邮件")
                        .build();
            }
        }
        
        // 如果启用队列且不是高优先级邮件，则加入队列
        if (queueEnabled && priority != EmailPriority.HIGH) {
            return enqueueEmail(request, emailType, priority);
        }
        
        // 高优先级邮件或队列未启用时，立即发送
        return sendEmailImmediately(request);
    }
    
    /**
     * 立即发送邮件（同步）
     */
    private SendEmailResponse sendEmailImmediately(SendEmailRequest request) {
        // 限流控制
        rateLimiter.acquirePermit();
        
        // 创建审计日志
        EmailAuditLog auditLog = createAuditLog(request);
        
        try {
            // 获取当前邮件服务提供商
            EmailProvider provider = providerManager.getCurrentProvider();
            String providerName = provider.getProviderName();
            
            log.info("使用邮件服务提供商 [{}] 发送邮件: to={}, subject={}", 
                    providerName, request.getTo(), request.getSubject());
            
            // 使用提供商发送邮件
            String recipient = String.join(",", request.getTo());
            SendEmailResult result = provider.sendEmail(
                    recipient,
                    request.getSubject(),
                    request.getHtml(),
                    request.getText()
            );
            
            // 更新审计日志
            if (result.isSuccess()) {
                auditLog.setStatus(EmailStatus.SENT);
                auditLog.setMessageId(result.getMessageId());
                auditLog.setSentAt(LocalDateTime.now());
            } else {
                auditLog.setStatus(EmailStatus.FAILED);
                auditLog.setErrorCode(result.getErrorCode());
                auditLog.setErrorMessage(result.getErrorMessage());
            }
            
            // 记录审计日志
            auditLogger.logEmailSent(auditLog);
            
            // 返回响应
            if (result.isSuccess()) {
                return SendEmailResponse.builder()
                        .id(result.getMessageId())
                        .success(true)
                        .message("邮件发送成功 (提供商: " + providerName + ")")
                        .build();
            } else {
                return SendEmailResponse.builder()
                        .success(false)
                        .message("邮件发送失败: " + result.getErrorMessage())
                        .build();
            }
            
        } catch (Exception e) {
            log.error("邮件发送异常: to={}, subject={}, error={}",
                    request.getTo(), request.getSubject(), e.getMessage(), e);
            
            auditLog.setStatus(EmailStatus.FAILED);
            auditLog.setErrorMessage(e.getMessage());
            auditLogger.logEmailSent(auditLog);
            
            return SendEmailResponse.builder()
                    .success(false)
                    .message("邮件发送异常: " + e.getMessage())
                    .build();
        }
    }
    
    /**
     * 将邮件加入队列（异步）
     */
    private SendEmailResponse enqueueEmail(SendEmailRequest request, String emailType, EmailPriority priority) {
        try {
            String recipient = String.join(",", request.getTo());
            Long queueId = emailQueueService.enqueue(
                    recipient,
                    request.getSubject(),
                    request.getHtml(),
                    request.getText(),
                    emailType,
                    priority
            );
            
            log.info("邮件已加入队列: queueId={}, recipient={}, subject={}, priority={}",
                    queueId, recipient, request.getSubject(), priority);
            
            return SendEmailResponse.builder()
                    .id(String.valueOf(queueId))
                    .success(true)
                    .message("邮件已加入发送队列")
                    .build();
        } catch (Exception e) {
            log.error("邮件加入队列失败: to={}, subject={}, error={}",
                    request.getTo(), request.getSubject(), e.getMessage(), e);
            
            return SendEmailResponse.builder()
                    .success(false)
                    .message("邮件加入队列失败: " + e.getMessage())
                    .build();
        }
    }
    
    /**
     * 判断邮件优先级
     */
    private EmailPriority determinePriority(String emailType) {
        // 高优先级：验证码、密码重置
        if ("EMAIL_VERIFICATION".equals(emailType) || "PASSWORD_RESET".equals(emailType)) {
            return EmailPriority.HIGH;
        }
        
        // 中优先级：登录通知、欢迎邮件
        if ("LOGIN_NOTIFICATION".equals(emailType) || "WELCOME".equals(emailType)) {
            return EmailPriority.MEDIUM;
        }
        
        // 低优先级：其他邮件
        return EmailPriority.LOW;
    }
    
    @Override
    public SendEmailResponse sendSimpleEmail(String to, String subject, String htmlContent) {
        SendEmailRequest request = SendEmailRequest.builder()
                .to(List.of(to))
                .subject(subject)
                .html(htmlContent)
                .build();
        return sendEmail(request);
    }
    

    
    @Override
    public SendEmailResponse sendWelcomeEmail(String to, String username) {
        log.info("发送欢迎邮件: to={}", to);
        
        try {
            // 使用邮件模板渲染内容
            Map<String, Object> variables = new HashMap<>();
            variables.put("username", username);
            variables.put("email", to);
            
            // 获取用户语言偏好
            String language = getUserLanguagePreference(to);
            
            TemplateService.RenderedTemplate rendered = templateService.renderTemplate(
                    "WELCOME_EMAIL", language, variables);
            
            return sendSimpleEmail(to, rendered.getSubject(), rendered.getHtmlContent());
        } catch (Exception e) {
            log.error("发送欢迎邮件失败: to={}, error={}", to, e.getMessage(), e);
            return SendEmailResponse.builder()
                    .success(false)
                    .message("发送欢迎邮件失败: " + e.getMessage())
                    .build();
        }
    }
    
    @Override
    public SendEmailResponse sendPasswordResetEmail(String to, String username, String resetLink) {
        log.info("发送密码重置邮件: to={}", to);
        
        try {
            // 使用邮件模板渲染内容
            Map<String, Object> variables = new HashMap<>();
            variables.put("username", username);
            variables.put("resetLink", resetLink);
            variables.put("email", to);
            
            // 获取用户语言偏好
            String language = getUserLanguagePreference(to);
            
            TemplateService.RenderedTemplate rendered = templateService.renderTemplate(
                    "PASSWORD_RESET", language, variables);
            
            return sendSimpleEmail(to, rendered.getSubject(), rendered.getHtmlContent());
        } catch (Exception e) {
            log.error("发送密码重置邮件失败: to={}, error={}", to, e.getMessage(), e);
            return SendEmailResponse.builder()
                    .success(false)
                    .message("发送密码重置邮件失败: " + e.getMessage())
                    .build();
        }
    }
    
    @Override
    public SendEmailResponse sendEmailVerification(String to, String username, String verificationCode) {
        log.info("发送邮箱验证码: to={}", to);
        
        try {
            // 使用邮件模板渲染内容
            Map<String, Object> variables = new HashMap<>();
            variables.put("username", username);
            variables.put("code", verificationCode);
            variables.put("email", to);
            
            // 获取用户语言偏好
            String language = getUserLanguagePreference(to);
            
            TemplateService.RenderedTemplate rendered = templateService.renderTemplate(
                    "VERIFICATION_CODE_REGISTER", language, variables);
            
            return sendSimpleEmail(to, rendered.getSubject(), rendered.getHtmlContent());
        } catch (Exception e) {
            log.error("发送邮箱验证码失败: to={}, error={}", to, e.getMessage(), e);
            return SendEmailResponse.builder()
                    .success(false)
                    .message("发送邮箱验证码失败: " + e.getMessage())
                    .build();
        }
    }
    
    @Override
    public SendEmailResponse sendPasswordChangeCode(String to, String username, String verificationCode, String language) {
        log.info("发送密码修改验证码: to={}, language={}", to, language);
        
        try {
            // 使用邮件模板渲染内容
            Map<String, Object> variables = new HashMap<>();
            variables.put("username", username);
            variables.put("code", verificationCode);
            variables.put("email", to);
            
            // 如果没有指定语言，使用默认中文
            if (language == null || language.isEmpty()) {
                language = "zh-CN";
            }
            
            TemplateService.RenderedTemplate rendered = templateService.renderTemplate(
                    "VERIFICATION_CODE_CHANGE", language, variables);
            
            return sendSimpleEmail(to, rendered.getSubject(), rendered.getHtmlContent());
        } catch (Exception e) {
            log.error("发送密码修改验证码失败: to={}, error={}", to, e.getMessage(), e);
            return SendEmailResponse.builder()
                    .success(false)
                    .message("发送密码修改验证码失败: " + e.getMessage())
                    .build();
        }
    }
    
    @Override
    public SendEmailResponse sendLoginCode(String to, String username, String verificationCode, String language) {
        log.info("发送登录验证码: to={}, language={}, code={}", to, language, verificationCode);
        
        try {
            // 使用邮件模板渲染内容
            Map<String, Object> variables = new HashMap<>();
            variables.put("username", username);
            variables.put("code", verificationCode);
            variables.put("email", to);
            
            log.info("登录验证码变量: {}", variables);
            
            // 如果没有指定语言，使用默认中文
            if (language == null || language.isEmpty()) {
                language = "zh-CN";
            }
            
            TemplateService.RenderedTemplate rendered = templateService.renderTemplate(
                    "VERIFICATION_CODE_LOGIN", language, variables);
            
            log.info("登录验证码模板渲染完成，主题: {}", rendered.getSubject());
            
            return sendSimpleEmail(to, rendered.getSubject(), rendered.getHtmlContent());
        } catch (Exception e) {
            log.error("发送登录验证码失败: to={}, error={}", to, e.getMessage(), e);
            return SendEmailResponse.builder()
                    .success(false)
                    .message("发送登录验证码失败: " + e.getMessage())
                    .build();
        }
    }
    
    @Override
    public SendEmailResponse sendPasswordResetCode(String to, String username, String verificationCode, String language) {
        log.info("发送密码重置验证码: to={}, language={}, code={}", to, language, verificationCode);
        
        try {
            // 使用邮件模板渲染内容
            Map<String, Object> variables = new HashMap<>();
            variables.put("username", username);
            variables.put("code", verificationCode);
            variables.put("email", to);
            
            log.info("密码重置验证码变量: {}", variables);
            
            // 如果没有指定语言，使用默认中文
            if (language == null || language.isEmpty()) {
                language = "zh-CN";
            }
            
            TemplateService.RenderedTemplate rendered = templateService.renderTemplate(
                    "VERIFICATION_CODE_RESET", language, variables);
            
            log.info("密码重置验证码模板渲染完成，主题: {}", rendered.getSubject());
            
            return sendSimpleEmail(to, rendered.getSubject(), rendered.getHtmlContent());
        } catch (Exception e) {
            log.error("发送密码重置验证码失败: to={}, error={}", to, e.getMessage(), e);
            return SendEmailResponse.builder()
                    .success(false)
                    .message("发送密码重置验证码失败: " + e.getMessage())
                    .build();
        }
    }
    
    @Override
    public SendEmailResponse sendLoginNotification(String to, String username, String loginTime, 
                                                    String ipAddress, String device) {
        log.info("发送登录通知: to={}", to);
        
        try {
            // 使用邮件模板渲染内容
            Map<String, Object> variables = new HashMap<>();
            variables.put("username", username);
            variables.put("loginTime", loginTime);
            variables.put("ipAddress", ipAddress);
            variables.put("device", device);
            variables.put("email", to);
            
            // 获取用户语言偏好
            String language = getUserLanguagePreference(to);
            
            TemplateService.RenderedTemplate rendered = templateService.renderTemplate(
                    "LOGIN_NOTIFICATION", language, variables);
            
            return sendSimpleEmail(to, rendered.getSubject(), rendered.getHtmlContent());
        } catch (Exception e) {
            log.error("发送登录通知失败: to={}, error={}", to, e.getMessage(), e);
            return SendEmailResponse.builder()
                    .success(false)
                    .message("发送登录通知失败: " + e.getMessage())
                    .build();
        }
    }
    
    // ============== 私有方法：生成邮件内容 ==============
    
    /**
     * 创建审计日志对象
     */
    private EmailAuditLog createAuditLog(SendEmailRequest request) {
        EmailAuditLog auditLog = new EmailAuditLog();
        auditLog.setRecipient(String.join(",", request.getTo()));
        auditLog.setSubject(request.getSubject());
        auditLog.setEmailType(determineEmailType(request.getSubject()));
        auditLog.setStatus(EmailStatus.PENDING);
        auditLog.setCreatedAt(LocalDateTime.now());
        return auditLog;
    }
    
    /**
     * 判断邮件类型
     */
    private String determineEmailType(String subject) {
        if (subject.contains("欢迎")) return "WELCOME";
        if (subject.contains("密码")) return "PASSWORD_RESET";
        if (subject.contains("验证")) return "EMAIL_VERIFICATION";
        if (subject.contains("登录")) return "LOGIN_NOTIFICATION";
        return "GENERAL";
    }
    
    /**
     * 将邮件类型字符串映射到 EmailType 枚举
     */
    private EmailType mapToEmailType(String emailType) {
        return switch (emailType) {
            case "EMAIL_VERIFICATION", "PASSWORD_RESET" -> EmailType.TRANSACTIONAL;
            case "LOGIN_NOTIFICATION", "WELCOME" -> EmailType.SYSTEM_NOTIFICATION;
            case "MARKETING" -> EmailType.MARKETING;
            case "PRODUCT_UPDATE" -> EmailType.PRODUCT_UPDATE;
            default -> EmailType.SYSTEM_NOTIFICATION;
        };
    }
    
    /**
     * 为通知邮件添加退订链接
     */
    private String addUnsubscribeLink(String htmlContent, Long userId, EmailType emailType) {
        if (userId == null || emailType.isTransactional()) {
            return htmlContent;
        }
        
        // 生成退订令牌
        String unsubscribeToken = subscriptionService.generateUnsubscribeToken(userId, emailType);
        String unsubscribeLink = String.format("https://polaristools.online/api/subscription/unsubscribe?token=%s", 
                unsubscribeToken);
        
        // 在邮件底部添加退订链接
        String unsubscribeFooter = String.format("""
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #888; font-size: 12px;">
                <p>如果您不想再收到此类邮件，可以 <a href="%s" style="color: #667eea;">点击这里退订</a></p>
            </div>
            """, unsubscribeLink);
        
        // 在 </body> 标签前插入退订链接
        return htmlContent.replace("</body>", unsubscribeFooter + "</body>");
    }
    

    
    @Override
    public SendEmailResponse sendEmailVerificationWithToken(Long userId, String to, String username) {
        log.info("发送邮箱验证邮件（使用 Token）: userId={}, to={}", userId, to);
        
        try {
            // 生成验证 Token（有效期 24 小时）
            String token = tokenService.generateToken(userId, "verify", 24);
            
            // 构建验证链接（这里使用前端的验证页面 URL）
            String verificationLink = String.format("https://polaristools.online/verify-email?token=%s", token);
            
            // 使用邮件模板渲染内容
            Map<String, Object> variables = new HashMap<>();
            variables.put("username", username);
            variables.put("verificationLink", verificationLink);
            variables.put("email", to);
            
            // 获取用户语言偏好
            String language = getUserLanguagePreference(to);
            
            TemplateService.RenderedTemplate rendered = templateService.renderTemplate(
                    "EMAIL_VERIFICATION", language, variables);
            
            // 发送邮件
            return sendSimpleEmail(to, rendered.getSubject(), rendered.getHtmlContent());
        } catch (Exception e) {
            log.error("发送邮箱验证邮件失败: userId={}, to={}, error={}", userId, to, e.getMessage(), e);
            return SendEmailResponse.builder()
                    .success(false)
                    .message("发送邮箱验证邮件失败: " + e.getMessage())
                    .build();
        }
    }
    
    @Override
    public SendEmailResponse sendPasswordResetWithToken(Long userId, String to, String username) {
        log.info("发送密码重置邮件（使用 Token）: userId={}, to={}", userId, to);
        
        try {
            // 生成重置 Token（有效期 1 小时）
            String token = tokenService.generateToken(userId, "reset", 1);
            
            // 构建重置链接（这里使用前端的重置页面 URL）
            String resetLink = String.format("https://polaristools.online/reset-password?token=%s", token);
            
            // 使用邮件模板渲染内容
            Map<String, Object> variables = new HashMap<>();
            variables.put("username", username);
            variables.put("resetLink", resetLink);
            variables.put("email", to);
            
            // 获取用户语言偏好
            String language = getUserLanguagePreference(to);
            
            TemplateService.RenderedTemplate rendered = templateService.renderTemplate(
                    "PASSWORD_RESET", language, variables);
            
            // 发送邮件
            return sendSimpleEmail(to, rendered.getSubject(), rendered.getHtmlContent());
        } catch (Exception e) {
            log.error("发送密码重置邮件失败: userId={}, to={}, error={}", userId, to, e.getMessage(), e);
            return SendEmailResponse.builder()
                    .success(false)
                    .message("发送密码重置邮件失败: " + e.getMessage())
                    .build();
        }
    }
    

    
    @Override
    public SendEmailResponse sendEmailWithTemplate(String to, String templateCode, String language, Map<String, Object> variables) {
        log.info("使用模板系统发送邮件: to={}, templateCode={}, language={}", to, templateCode, language);
        
        try {
            // 渲染模板
            TemplateService.RenderedTemplate rendered = templateService.renderTemplate(templateCode, language, variables);
            
            // 发送邮件
            return sendSimpleEmail(to, rendered.getSubject(), rendered.getHtmlContent());
        } catch (Exception e) {
            log.error("使用模板系统发送邮件失败: to={}, templateCode={}, language={}, error={}",
                    to, templateCode, language, e.getMessage(), e);
            return SendEmailResponse.builder()
                    .success(false)
                    .message("发送邮件失败: " + e.getMessage())
                    .build();
        }
    }
    
    /**
     * 获取用户语言偏好
     * 根据邮箱地址查询用户的语言设置，如果未找到或未设置则返回默认语言
     * 
     * @param email 用户邮箱
     * @return 语言代码（zh-CN 或 en-US）
     */
    private String getUserLanguagePreference(String email) {
        try {
            // 根据邮箱查询用户
            User user = userMapper.findByEmail(email);
            
            if (user != null && user.getLanguage() != null && !user.getLanguage().isEmpty()) {
                log.debug("获取用户语言偏好: email={}, language={}", email, user.getLanguage());
                return user.getLanguage();
            }
            
            // 如果用户不存在或未设置语言，返回默认中文
            log.debug("用户未设置语言偏好，使用默认语言: email={}, defaultLanguage=zh-CN", email);
            return "zh-CN";
        } catch (Exception e) {
            log.warn("获取用户语言偏好失败，使用默认语言: email={}, error={}", email, e.getMessage());
            return "zh-CN";
        }
    }
}
