package com.polaris.email.controller;

import com.polaris.common.result.Result;
import com.polaris.entity.User;
import com.polaris.mapper.UserMapper;
import com.polaris.auth.service.TokenService;
import com.polaris.email.service.EmailService;
import com.polaris.email.service.EmailRateLimiter;
import com.polaris.email.dto.SendEmailResponse;
import com.polaris.email.dto.RateLimitResult;
import com.polaris.auth.security.UserContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;

/**
 * 邮件验证控制器
 * 处理邮箱验证和密码重置的 Token 验证
 */
@Slf4j
@RestController
@RequestMapping("/api/email")
@RequiredArgsConstructor
public class EmailVerificationController {
    
    private final TokenService tokenService;
    private final UserMapper userMapper;
    private final EmailService emailService;
    private final EmailRateLimiter rateLimiter;
    private final UserContext userContext;
    private final PasswordEncoder passwordEncoder;
    
    /**
     * 验证邮箱 Token
     * 
     * @param token Token 明文
     * @return 验证结果
     */
    @PostMapping("/verify")
    public Result<Long> verifyEmail(@RequestParam String token) {
        log.info("验证邮箱 Token");
        
        try {
            Long userId = tokenService.validateAndUseToken(token, "verify");
            
            if (userId == null) {
                return Result.error(400, "Token 无效或已过期");
            }
            
            // 更新用户的邮箱验证状态
            User user = userMapper.selectById(userId);
            if (user == null || user.getDeleted() == 1) {
                return Result.error(404, "用户不存在");
            }
            
            // 设置邮箱验证状态
            user.setEmailVerified(true);
            user.setEmailVerifiedAt(LocalDateTime.now());
            user.setUpdatedAt(LocalDateTime.now());
            userMapper.updateById(user);
            
            log.info("邮箱验证成功: userId={}, email={}", userId, user.getEmail());
            
            // 发送验证成功邮件
            try {
                emailService.sendEmailWithTemplate(
                        user.getEmail(),
                        "验证成功",
                        "zh-CN",
                        java.util.Map.of(
                                "username", user.getUsername(),
                                "email", user.getEmail()
                        )
                );
                log.info("验证成功邮件已发送: userId={}", userId);
            } catch (Exception emailEx) {
                log.error("发送验证成功邮件失败: userId={}", userId, emailEx);
                // 不影响验证流程，继续返回成功
            }
            
            return Result.success("邮箱验证成功", userId);
            
        } catch (Exception e) {
            log.error("邮箱验证失败", e);
            return Result.error(500, "邮箱验证失败: " + e.getMessage());
        }
    }
    
    /**
     * 验证密码重置 Token
     * 
     * @param token Token 明文
     * @return 验证结果（返回用户 ID 用于后续密码重置）
     */
    @PostMapping("/verify-reset-token")
    public Result<Long> verifyResetToken(@RequestParam String token) {
        log.info("验证密码重置 Token");
        
        try {
            // 仅验证 Token，不标记为已使用（在实际重置密码时才标记）
            var emailToken = tokenService.validateToken(token, "reset");
            
            if (emailToken == null) {
                return Result.error(400, "Token 无效或已过期");
            }
            
            log.info("密码重置 Token 验证成功: userId={}", emailToken.getUserId());
            return Result.success("Token 验证成功", emailToken.getUserId());
            
        } catch (Exception e) {
            log.error("密码重置 Token 验证失败", e);
            return Result.error(500, "Token 验证失败: " + e.getMessage());
        }
    }
    
    /**
     * 重置密码（使用 Token）
     * 
     * @param token Token 明文
     * @param newPassword 新密码
     * @return 重置结果
     */
    @PostMapping("/reset-password")
    public Result<Void> resetPassword(@RequestParam String token, 
                                       @RequestParam String newPassword) {
        log.info("使用 Token 重置密码");
        
        try {
            // 验证并使用 Token
            Long userId = tokenService.validateAndUseToken(token, "reset");
            
            if (userId == null) {
                return Result.error(400, "Token 无效或已过期");
            }
            
            User user = userMapper.selectById(userId);
            if (user == null || user.getDeleted() == 1) {
                return Result.error(404, "用户不存在");
            }
            if (user.getStatus() != null && user.getStatus() == 0) {
                return Result.error(403, "账户已被禁用");
            }
            user.setPassword(passwordEncoder.encode(newPassword));
            user.setPasswordUpdatedAt(LocalDateTime.now());
            user.setUpdatedAt(LocalDateTime.now());
            userMapper.updateById(user);
            tokenService.invalidateUserTokens(userId, "reset");
            
            log.info("密码重置成功: userId={}", userId);
            return Result.success("密码重置成功", null);
            
        } catch (Exception e) {
            log.error("密码重置失败", e);
            return Result.error(500, "密码重置失败: " + e.getMessage());
        }
    }
    
    /**
     * 重新发送验证邮件
     * 
     * @return 发送结果
     */
    @PostMapping("/resend-verification")
    public Result<Void> resendVerification() {
        // 获取当前登录用户
        Long userId = userContext.getCurrentUserId();
        if (userId == null) {
            return Result.error(401, "请先登录");
        }
        
        log.info("重新发送验证邮件: userId={}", userId);
        
        try {
            // 获取用户信息
            User user = userMapper.selectById(userId);
            if (user == null || user.getDeleted() == 1) {
                return Result.error(404, "用户不存在");
            }
            
            // 检查邮箱是否已验证
            if (Boolean.TRUE.equals(user.getEmailVerified())) {
                return Result.error(400, "邮箱已验证，无需重复验证");
            }
            
            // 检查邮箱级限流（60 秒冷却时间）
            RateLimitResult emailRateLimit = rateLimiter.checkEmailRateLimit(user.getEmail());
            if (!emailRateLimit.isAllowed()) {
                return Result.error(429, emailRateLimit.getMessage());
            }
            
            // 检查用户级每日限流（每日最多 5 次）
            RateLimitResult userRateLimit = rateLimiter.checkUserDailyLimit(userId);
            if (!userRateLimit.isAllowed()) {
                return Result.error(429, userRateLimit.getMessage());
            }
            
            // 发送验证邮件（使用 Token）
            SendEmailResponse emailResponse = emailService.sendEmailVerificationWithToken(
                    userId, user.getEmail(), user.getUsername());
            
            if (!emailResponse.isSuccess()) {
                log.error("发送验证邮件失败: userId={}, error={}", userId, emailResponse.getMessage());
                return Result.error(500, "发送验证邮件失败: " + emailResponse.getMessage());
            }
            
            log.info("验证邮件发送成功: userId={}, email={}", userId, user.getEmail());
            return Result.success("验证邮件已发送，请查收", null);
            
        } catch (Exception e) {
            log.error("重新发送验证邮件失败: userId={}", userId, e);
            return Result.error(500, "发送失败: " + e.getMessage());
        }
    }
    
    /**
     * 获取邮箱验证状态
     * 
     * @return 验证状态信息
     */
    @GetMapping("/verification-status")
    public Result<EmailVerificationStatus> getVerificationStatus() {
        Long userId = userContext.getCurrentUserId();
        if (userId == null) {
            return Result.error(401, "请先登录");
        }
        
        try {
            User user = userMapper.selectById(userId);
            if (user == null || user.getDeleted() == 1) {
                return Result.error(404, "用户不存在");
            }
            
            EmailVerificationStatus status = new EmailVerificationStatus();
            status.setEmail(user.getEmail());
            status.setVerified(Boolean.TRUE.equals(user.getEmailVerified()));
            status.setVerifiedAt(user.getEmailVerifiedAt());
            
            // 获取重新发送冷却时间
            long cooldownSeconds = rateLimiter.getEmailRateLimitRemaining(user.getEmail());
            status.setCooldownSeconds(cooldownSeconds);
            
            // 获取今日已使用次数
            int usageCount = rateLimiter.getUserDailyLimitUsage(userId);
            status.setDailyUsageCount(usageCount);
            
            return Result.success(status);
            
        } catch (Exception e) {
            log.error("获取邮箱验证状态失败: userId={}", userId, e);
            return Result.error(500, "获取状态失败: " + e.getMessage());
        }
    }
    
    /**
     * 邮箱验证状态响应类
     */
    public static class EmailVerificationStatus {
        private String email;
        private boolean verified;
        private LocalDateTime verifiedAt;
        private long cooldownSeconds;
        private int dailyUsageCount;
        
        // Getters and Setters
        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }
        
        public boolean isVerified() { return verified; }
        public void setVerified(boolean verified) { this.verified = verified; }
        
        public LocalDateTime getVerifiedAt() { return verifiedAt; }
        public void setVerifiedAt(LocalDateTime verifiedAt) { this.verifiedAt = verifiedAt; }
        
        public long getCooldownSeconds() { return cooldownSeconds; }
        public void setCooldownSeconds(long cooldownSeconds) { this.cooldownSeconds = cooldownSeconds; }
        
        public int getDailyUsageCount() { return dailyUsageCount; }
        public void setDailyUsageCount(int dailyUsageCount) { this.dailyUsageCount = dailyUsageCount; }
    }
    
}
