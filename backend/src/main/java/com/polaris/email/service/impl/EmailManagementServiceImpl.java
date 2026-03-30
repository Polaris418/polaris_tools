package com.polaris.email.service.impl;

import com.polaris.common.exception.BusinessException;
import com.polaris.common.exception.ErrorCode;
import com.polaris.dto.verification.ChangeEmailRequest;
import com.polaris.dto.verification.SendVerificationCodeResponse;
import com.polaris.dto.verification.VerifyEmailChangeRequest;
import com.polaris.email.entity.EmailVerificationLog;
import com.polaris.entity.User;
import com.polaris.entity.VerificationPurpose;
import com.polaris.email.mapper.EmailVerificationLogMapper;
import com.polaris.mapper.UserMapper;
import com.polaris.auth.security.UserContext;
import com.polaris.email.service.EmailManagementService;
import com.polaris.email.service.EmailService;
import com.polaris.auth.service.RateLimiterService;
import com.polaris.service.VerificationCodeService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.time.LocalDateTime;

/**
 * 邮箱管理服务实现类
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class EmailManagementServiceImpl implements EmailManagementService {
    
    private final UserMapper userMapper;
    private final PasswordEncoder passwordEncoder;
    private final UserContext userContext;
    private final VerificationCodeService verificationCodeService;
    private final RateLimiterService rateLimiterService;
    private final EmailVerificationLogMapper verificationLogMapper;
    private final EmailService emailService;
    
    @Override
    @Transactional(rollbackFor = Exception.class)
    public SendVerificationCodeResponse sendChangeEmailCode(ChangeEmailRequest request) {
        String newEmail = request.getNewEmail();
        String password = request.getPassword();
        VerificationPurpose purpose = VerificationPurpose.CHANGE;
        
        // 1. 获取当前用户
        Long userId = userContext.getCurrentUserId();
        if (userId == null) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED);
        }
        
        log.info("发送邮箱修改验证码: userId={}, newEmail={}", userId, newEmail);
        
        // 2. 查找用户
        User user = userMapper.selectById(userId);
        if (user == null || user.getDeleted() == 1) {
            throw new BusinessException(ErrorCode.USER_NOT_FOUND, "用户不存在");
        }
        
        // 3. 验证当前密码
        if (!passwordEncoder.matches(password, user.getPassword())) {
            log.warn("密码验证失败: userId={}", userId);
            throw new BusinessException(ErrorCode.INVALID_CREDENTIALS, "密码错误");
        }
        
        // 4. 检查新邮箱是否与当前邮箱相同
        if (newEmail.equals(user.getEmail())) {
            throw new BusinessException(ErrorCode.INVALID_PARAMETER, "新邮箱不能与当前邮箱相同");
        }
        
        // 5. 检查新邮箱唯一性
        User existingUser = userMapper.findByEmail(newEmail);
        if (existingUser != null) {
            log.warn("新邮箱已被使用: newEmail={}", newEmail);
            throw new BusinessException(ErrorCode.EMAIL_EXISTS, "该邮箱已被使用");
        }
        
        // 6. 获取IP地址
        String ipAddress = getClientIpAddress();
        
        // 7. 检查限流
        // 检查邮箱级限流
        if (!rateLimiterService.checkEmailRateLimit(newEmail, purpose)) {
            long cooldownSeconds = rateLimiterService.getEmailCooldownSeconds(newEmail, purpose);
            log.warn("邮箱级限流触发: email={}, cooldownSeconds={}", newEmail, cooldownSeconds);
            recordVerificationLog(newEmail, purpose, "send", ipAddress, false, "邮箱级限流");
            throw new BusinessException(ErrorCode.RATE_LIMIT_EMAIL, 
                String.format("发送过于频繁，请%d秒后再试", cooldownSeconds));
        }
        
        // 检查IP级限流
        if (!rateLimiterService.checkIpRateLimit(ipAddress)) {
            long cooldownSeconds = rateLimiterService.getIpCooldownSeconds(ipAddress);
            log.warn("IP级限流触发: ip={}, cooldownSeconds={}", ipAddress, cooldownSeconds);
            recordVerificationLog(newEmail, purpose, "send", ipAddress, false, "IP级限流");
            throw new BusinessException(ErrorCode.RATE_LIMIT_IP, "请求过于频繁，请稍后再试");
        }
        
        // 检查邮箱是否被封禁
        if (rateLimiterService.isEmailBlocked(newEmail, purpose)) {
            log.warn("邮箱已被封禁: email={}", newEmail);
            recordVerificationLog(newEmail, purpose, "send", ipAddress, false, "邮箱已被封禁");
            throw new BusinessException(ErrorCode.EMAIL_BLOCKED, "该邮箱已被临时封禁");
        }
        
        // 8. 生成并发送验证码到新邮箱（默认语言为中文）
        SendVerificationCodeResponse response = verificationCodeService.generateAndSendCode(
            newEmail, 
            purpose, 
            "zh-CN"
        );
        
        // 9. 记录发送尝试
        rateLimiterService.recordAttempt(newEmail, purpose, ipAddress);
        
        // 10. 记录发送日志
        recordVerificationLog(newEmail, purpose, "send", ipAddress, true, null);
        
        log.info("邮箱修改验证码发送成功: userId={}, newEmail={}", userId, newEmail);
        
        return response;
    }
    
    @Override
    @Transactional(rollbackFor = Exception.class)
    public void verifyEmailChange(VerifyEmailChangeRequest request) {
        String newEmail = request.getNewEmail();
        String code = request.getCode();
        VerificationPurpose purpose = VerificationPurpose.CHANGE;
        
        // 1. 获取当前用户
        Long userId = userContext.getCurrentUserId();
        if (userId == null) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED);
        }
        
        log.info("验证邮箱修改: userId={}, newEmail={}", userId, newEmail);
        
        // 2. 获取IP地址
        String ipAddress = getClientIpAddress();
        
        // 3. 验证验证码
        boolean isValid = verificationCodeService.verifyCode(newEmail, code, purpose);
        if (!isValid) {
            log.warn("验证码验证失败: userId={}, newEmail={}, code={}", userId, newEmail, code);
            recordVerificationLog(newEmail, purpose, "verify", ipAddress, false, "验证码无效");
            throw new BusinessException(ErrorCode.CODE_INVALID, "验证码无效或已过期");
        }
        
        // 4. 查找用户
        User user = userMapper.selectById(userId);
        if (user == null || user.getDeleted() == 1) {
            log.warn("用户不存在: userId={}", userId);
            recordVerificationLog(newEmail, purpose, "verify", ipAddress, false, "用户不存在");
            throw new BusinessException(ErrorCode.USER_NOT_FOUND, "用户不存在");
        }
        
        // 5. 再次检查新邮箱唯一性（防止并发修改）
        User existingUser = userMapper.findByEmail(newEmail);
        if (existingUser != null) {
            log.warn("新邮箱已被使用: newEmail={}", newEmail);
            recordVerificationLog(newEmail, purpose, "verify", ipAddress, false, "邮箱已被使用");
            throw new BusinessException(ErrorCode.EMAIL_EXISTS, "该邮箱已被使用");
        }
        
        // 6. 保存旧邮箱用于发送通知
        String oldEmail = user.getEmail();
        
        // 7. 更新用户邮箱
        user.setEmail(newEmail);
        user.setEmailVerified(true); // 标记新邮箱为已验证
        user.setEmailVerifiedAt(LocalDateTime.now());
        user.setUpdatedAt(LocalDateTime.now());
        userMapper.updateById(user);
        
        // 8. 使验证码失效
        verificationCodeService.invalidateCode(newEmail, purpose);
        
        // 9. 记录验证日志
        recordVerificationLog(newEmail, purpose, "verify", ipAddress, true, null);
        
        // 10. 发送通知邮件到旧邮箱（异步）
        sendEmailChangeNotification(oldEmail, newEmail, user.getUsername());
        
        log.info("邮箱修改成功: userId={}, oldEmail={}, newEmail={}", userId, oldEmail, newEmail);
    }
    
    /**
     * 获取客户端IP地址
     */
    private String getClientIpAddress() {
        try {
            ServletRequestAttributes attributes = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            if (attributes != null) {
                HttpServletRequest request = attributes.getRequest();
                String ip = request.getHeader("X-Forwarded-For");
                if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
                    ip = request.getHeader("X-Real-IP");
                }
                if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
                    ip = request.getRemoteAddr();
                }
                // 如果是多级代理，取第一个IP
                if (ip != null && ip.contains(",")) {
                    ip = ip.split(",")[0].trim();
                }
                return ip;
            }
        } catch (Exception e) {
            log.warn("获取客户端IP地址失败", e);
        }
        return "unknown";
    }
    
    /**
     * 异步记录验证日志
     */
    @Async
    private void recordVerificationLog(String email, VerificationPurpose purpose, String action, 
                                      String ipAddress, boolean success, String errorMessage) {
        try {
            EmailVerificationLog logEntry = new EmailVerificationLog();
            logEntry.setEmail(email);
            logEntry.setPurpose(purpose.name());
            logEntry.setAction(action);
            logEntry.setIpAddress(ipAddress);
            logEntry.setSuccess(success ? 1 : 0);
            logEntry.setErrorMessage(errorMessage);
            
            // 获取 User-Agent
            try {
                ServletRequestAttributes attributes = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
                if (attributes != null) {
                    HttpServletRequest request = attributes.getRequest();
                    logEntry.setUserAgent(request.getHeader("User-Agent"));
                }
            } catch (Exception e) {
                // 忽略异常
            }
            
            verificationLogMapper.insert(logEntry);
        } catch (Exception e) {
            // 记录日志失败不应影响主流程
            log.error("记录验证日志失败: email={}, purpose={}, action={}", email, purpose, action, e);
        }
    }
    
    /**
     * 异步发送邮箱修改通知到旧邮箱
     */
    @Async
    private void sendEmailChangeNotification(String oldEmail, String newEmail, String username) {
        try {
            log.info("发送邮箱修改通知: oldEmail={}, newEmail={}", oldEmail, newEmail);
            
            // 构建邮件内容
            String subject = "邮箱修改通知 - Polaris Tools";
            String content = buildEmailChangeNotificationContent(username, oldEmail, newEmail);
            
            // 发送邮件
            emailService.sendSimpleEmail(oldEmail, subject, content);
            
            log.info("邮箱修改通知发送成功: oldEmail={}", oldEmail);
        } catch (Exception e) {
            // 发送通知失败不应影响主流程
            log.error("发送邮箱修改通知失败: oldEmail={}, newEmail={}", oldEmail, newEmail, e);
        }
    }
    
    /**
     * 构建邮箱修改通知邮件内容
     */
    private String buildEmailChangeNotificationContent(String username, String oldEmail, String newEmail) {
        return String.format(
            "<!DOCTYPE html>" +
            "<html>" +
            "<head>" +
            "    <meta charset=\"UTF-8\">" +
            "    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">" +
            "    <title>邮箱修改通知 - Polaris Tools</title>" +
            "</head>" +
            "<body style=\"margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;\">" +
            "    <table width=\"100%%\" cellpadding=\"0\" cellspacing=\"0\" style=\"background-color: #f5f5f5; padding: 20px;\">" +
            "        <tr>" +
            "            <td align=\"center\">" +
            "                <table width=\"600\" cellpadding=\"0\" cellspacing=\"0\" style=\"background-color: #ffffff; border-radius: 8px; overflow: hidden;\">" +
            "                    <!-- Header -->" +
            "                    <tr>" +
            "                        <td style=\"background-color: #4F46E5; padding: 30px; text-align: center;\">" +
            "                            <h1 style=\"color: #ffffff; margin: 0; font-size: 24px;\">Polaris Tools</h1>" +
            "                        </td>" +
            "                    </tr>" +
            "                    " +
            "                    <!-- Content -->" +
            "                    <tr>" +
            "                        <td style=\"padding: 40px 30px;\">" +
            "                            <h2 style=\"color: #1F2937; margin: 0 0 20px 0; font-size: 20px;\">邮箱修改通知</h2>" +
            "                            <p style=\"color: #6B7280; line-height: 1.6; margin: 0 0 20px 0;\">" +
            "                                尊敬的 %s，" +
            "                            </p>" +
            "                            <p style=\"color: #6B7280; line-height: 1.6; margin: 0 0 20px 0;\">" +
            "                                您的 Polaris Tools 账户邮箱已成功修改。" +
            "                            </p>" +
            "                            " +
            "                            <!-- Email Change Info -->" +
            "                            <div style=\"background-color: #F3F4F6; border-radius: 8px; padding: 20px; margin: 0 0 20px 0;\">" +
            "                                <p style=\"color: #374151; margin: 0 0 10px 0; font-size: 14px;\">" +
            "                                    <strong>原邮箱：</strong> %s" +
            "                                </p>" +
            "                                <p style=\"color: #374151; margin: 0; font-size: 14px;\">" +
            "                                    <strong>新邮箱：</strong> %s" +
            "                                </p>" +
            "                            </div>" +
            "                            " +
            "                            <!-- Security Notice -->" +
            "                            <div style=\"background-color: #FEF3C7; border-left: 4px solid #F59E0B; padding: 15px; margin: 0 0 20px 0;\">" +
            "                                <p style=\"color: #92400E; margin: 0; font-size: 14px;\">" +
            "                                    <strong>安全提示：</strong>如果这不是您的操作，请立即联系我们的客服团队。" +
            "                                </p>" +
            "                            </div>" +
            "                        </td>" +
            "                    </tr>" +
            "                    " +
            "                    <!-- Footer -->" +
            "                    <tr>" +
            "                        <td style=\"background-color: #F9FAFB; padding: 20px 30px; text-align: center; border-top: 1px solid #E5E7EB;\">" +
            "                            <p style=\"color: #9CA3AF; margin: 0; font-size: 12px;\">" +
            "                                此邮件由 Polaris Tools 自动发送，请勿回复。<br>" +
            "                                如有问题，请联系 <a href=\"mailto:support@polaristools.online\" style=\"color: #4F46E5;\">support@polaristools.online</a>" +
            "                            </p>" +
            "                            <p style=\"color: #9CA3AF; margin: 10px 0 0 0; font-size: 12px;\">" +
            "                                &copy; 2024 Polaris Tools. All rights reserved." +
            "                            </p>" +
            "                        </td>" +
            "                    </tr>" +
            "                </table>" +
            "            </td>" +
            "        </tr>" +
            "    </table>" +
            "</body>" +
            "</html>",
            username, oldEmail, newEmail
        );
    }
}
