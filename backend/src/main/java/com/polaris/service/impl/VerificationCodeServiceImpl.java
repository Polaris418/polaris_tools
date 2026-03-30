package com.polaris.service.impl;

import com.polaris.email.dto.SendEmailResponse;
import com.polaris.dto.verification.SendVerificationCodeResponse;
import com.polaris.email.entity.EmailVerificationCode;
import com.polaris.entity.VerificationPurpose;
import com.polaris.email.mapper.EmailVerificationCodeMapper;
import com.polaris.email.service.EmailService;
import com.polaris.service.VerificationCodeService;
import com.polaris.service.VerificationLogService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.HexFormat;

/**
 * 验证码服务实现类
 * 负责验证码的生成、验证和管理
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class VerificationCodeServiceImpl implements VerificationCodeService {
    
    private final EmailVerificationCodeMapper verificationCodeMapper;
    private final EmailService emailService;
    private final VerificationLogService verificationLogService;
    
    private static final int CODE_LENGTH = 6;
    private static final int CODE_EXPIRY_MINUTES = 10;
    private static final int MAX_FAIL_COUNT = 5;
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();
    
    @Override
    @Transactional
    public SendVerificationCodeResponse generateAndSendCode(String email, VerificationPurpose purpose, String language) {
        log.info("生成并发送验证码: email={}, purpose={}, language={}", email, purpose, language);
        
        // 获取请求信息
        String ipAddress = getClientIpAddress();
        String userAgent = getUserAgent();
        
        try {
            // 生成6位随机数字验证码
            String code = generateCode();
            log.debug("生成验证码: email={}, code={}", email, code);
            
            // 计算验证码哈希值
            String codeHash = hashCode(code);
            
            // 使旧验证码失效（同邮箱同用途）
            invalidateCode(email, purpose);
            
            // 保存新验证码到数据库
            EmailVerificationCode verificationCode = new EmailVerificationCode();
            verificationCode.setCodeHash(codeHash);
            verificationCode.setEmail(email);
            verificationCode.setPurpose(purpose.name());
            verificationCode.setExpiresAt(LocalDateTime.now().plusMinutes(CODE_EXPIRY_MINUTES));
            verificationCode.setUsed(0);
            verificationCode.setFailCount(0);
            
            verificationCodeMapper.insert(verificationCode);
            log.info("验证码已保存到数据库: email={}, purpose={}, expiresAt={}", 
                    email, purpose, verificationCode.getExpiresAt());
            
            // 发送验证码邮件
            SendEmailResponse emailResponse = sendVerificationEmail(email, code, purpose, language);
            
            // 记录发送日志
            boolean sendSuccess = emailResponse.isSuccess();
            String errorMessage = sendSuccess ? null : emailResponse.getMessage();
            verificationLogService.logSend(email, purpose, ipAddress, userAgent, sendSuccess, errorMessage);
            
            if (!sendSuccess) {
                log.warn("验证码邮件发送失败: email={}, purpose={}, error={}", 
                        email, purpose, errorMessage);
                return SendVerificationCodeResponse.builder()
                        .success(false)
                        .message(errorMessage != null ? errorMessage : "验证码发送失败，请稍后重试")
                        .build();
            }
            
            // 返回响应
            return SendVerificationCodeResponse.builder()
                    .success(true)
                    .message("验证码已发送")
                    .cooldownSeconds(60)
                    .expiresIn(CODE_EXPIRY_MINUTES * 60)
                    .build();
            
        } catch (Exception e) {
            log.error("生成并发送验证码失败: email={}, purpose={}, error={}", 
                    email, purpose, e.getMessage(), e);
            
            // 记录失败日志
            verificationLogService.logFail(email, purpose, ipAddress, userAgent, e.getMessage());
            
            return SendVerificationCodeResponse.builder()
                    .success(false)
                    .message("验证码发送失败: " + e.getMessage())
                    .build();
        }
    }
    
    @Override
    @Transactional
    public boolean verifyCode(String email, String code, VerificationPurpose purpose) {
        log.info("验证验证码: email={}, purpose={}", email, purpose);
        
        // 获取请求信息
        String ipAddress = getClientIpAddress();
        String userAgent = getUserAgent();
        
        // 验证码格式检查（6位数字）
        if (code == null || !code.matches("\\d{6}")) {
            log.warn("验证码格式无效: email={}, code={}", email, code);
            verificationLogService.logVerify(email, purpose, ipAddress, userAgent, false, "验证码格式无效");
            return false;
        }
        
        // 查询有效的验证码
        EmailVerificationCode verificationCode = verificationCodeMapper.findValidByEmailAndPurpose(
                email, 
                purpose.name(), 
                LocalDateTime.now(), 
                MAX_FAIL_COUNT
        );
        
        if (verificationCode == null) {
            log.warn("未找到有效的验证码: email={}, purpose={}", email, purpose);
            verificationLogService.logVerify(email, purpose, ipAddress, userAgent, false, "验证码不存在或已过期");
            return false;
        }
        
        // 计算提交验证码的哈希值
        String codeHash = hashCode(code);
        
        // 使用常量时间比较防止时序攻击
        boolean isValid = constantTimeEquals(verificationCode.getCodeHash(), codeHash);
        
        if (isValid) {
            // 验证成功，标记为已使用
            verificationCode.setUsed(1);
            verificationCode.setUsedAt(LocalDateTime.now());
            verificationCodeMapper.updateById(verificationCode);
            log.info("验证码验证成功: email={}, purpose={}", email, purpose);
            
            // 记录验证成功日志
            verificationLogService.logVerify(email, purpose, ipAddress, userAgent, true, null);
            return true;
        } else {
            // 验证失败，增加失败次数
            verificationCode.setFailCount(verificationCode.getFailCount() + 1);
            verificationCodeMapper.updateById(verificationCode);
            log.warn("验证码验证失败: email={}, purpose={}, failCount={}", 
                    email, purpose, verificationCode.getFailCount());
            
            // 记录验证失败日志
            verificationLogService.logVerify(email, purpose, ipAddress, userAgent, false, "验证码错误");
            return false;
        }
    }
    
    @Override
    @Transactional
    public void invalidateCode(String email, VerificationPurpose purpose) {
        log.info("使验证码失效: email={}, purpose={}", email, purpose);
        
        // 查询所有未使用的验证码
        EmailVerificationCode latestCode = verificationCodeMapper.findLatestByEmailAndPurpose(
                email, 
                purpose.name()
        );
        
        if (latestCode != null && latestCode.getUsed() == 0) {
            // 标记为已使用（软删除）
            latestCode.setUsed(1);
            latestCode.setUsedAt(LocalDateTime.now());
            verificationCodeMapper.updateById(latestCode);
            log.info("验证码已失效: email={}, purpose={}", email, purpose);
        }
    }
    
    /**
     * 根据验证码用途发送相应的验证码邮件
     * 
     * @param email 收件人邮箱
     * @param code 验证码
     * @param purpose 验证码用途
     * @param language 语言代码
     * @return 发送结果
     */
    private SendEmailResponse sendVerificationEmail(String email, String code, VerificationPurpose purpose, String language) {
        // 如果没有指定语言，使用默认中文
        if (language == null || language.isEmpty()) {
            language = "zh-CN";
        }
        
        // 用户名使用邮箱前缀（如果需要可以从数据库查询）
        String username = email.split("@")[0];
        
        // 根据不同的用途调用不同的邮件发送方法
        return switch (purpose) {
            case LOGIN -> {
                log.info("发送登录验证码邮件: email={}, language={}", email, language);
                yield emailService.sendLoginCode(email, username, code, language);
            }
            case RESET -> {
                log.info("发送密码重置验证码邮件: email={}, language={}", email, language);
                yield emailService.sendPasswordResetCode(email, username, code, language);
            }
            case CHANGE -> {
                log.info("发送密码修改验证码邮件: email={}, language={}", email, language);
                yield emailService.sendPasswordChangeCode(email, username, code, language);
            }
            case REGISTER -> {
                log.info("发送注册验证码邮件: email={}, language={}", email, language);
                // 注册使用通用的邮箱验证方法
                yield emailService.sendEmailVerification(email, username, code);
            }
            case VERIFY -> {
                log.info("发送邮箱验证码邮件: email={}, language={}", email, language);
                // 邮箱验证使用通用的邮箱验证方法
                yield emailService.sendEmailVerification(email, username, code);
            }
        };
    }
    
    /**
     * 生成6位随机数字验证码
     * 使用 SecureRandom 确保随机性
     * 
     * @return 6位数字验证码
     */
    private String generateCode() {
        int code = SECURE_RANDOM.nextInt(1000000);
        return String.format("%06d", code);
    }
    
    /**
     * 计算验证码的 SHA-256 哈希值
     * 使用盐值增强安全性
     * 
     * @param code 验证码
     * @return 哈希值（十六进制字符串）
     */
    private String hashCode(String code) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            
            // 添加盐值（可以从配置文件读取）
            String salt = "polaris_verification_salt";
            String saltedCode = code + salt;
            
            byte[] hash = digest.digest(saltedCode.getBytes());
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            log.error("SHA-256 算法不可用", e);
            throw new RuntimeException("哈希算法不可用", e);
        }
    }
    
    /**
     * 常量时间字符串比较
     * 防止时序攻击
     * 
     * @param a 字符串 a
     * @param b 字符串 b
     * @return 是否相等
     */
    private boolean constantTimeEquals(String a, String b) {
        if (a == null || b == null) {
            return a == b;
        }
        
        if (a.length() != b.length()) {
            return false;
        }
        
        int result = 0;
        for (int i = 0; i < a.length(); i++) {
            result |= a.charAt(i) ^ b.charAt(i);
        }
        
        return result == 0;
    }
    
    /**
     * 获取客户端IP地址
     * 
     * @return IP地址
     */
    private String getClientIpAddress() {
        try {
            ServletRequestAttributes attributes = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            if (attributes != null) {
                var request = attributes.getRequest();
                
                // 尝试从代理头获取真实IP
                String ip = request.getHeader("X-Forwarded-For");
                if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
                    ip = request.getHeader("X-Real-IP");
                }
                if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
                    ip = request.getRemoteAddr();
                }
                
                // X-Forwarded-For可能包含多个IP，取第一个
                if (ip != null && ip.contains(",")) {
                    ip = ip.split(",")[0].trim();
                }
                
                return ip != null ? ip : "unknown";
            }
        } catch (Exception e) {
            log.warn("获取客户端IP失败", e);
        }
        return "unknown";
    }
    
    /**
     * 获取User-Agent
     * 
     * @return User-Agent字符串
     */
    private String getUserAgent() {
        try {
            ServletRequestAttributes attributes = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            if (attributes != null) {
                String userAgent = attributes.getRequest().getHeader("User-Agent");
                return userAgent != null ? userAgent : "unknown";
            }
        } catch (Exception e) {
            log.warn("获取User-Agent失败", e);
        }
        return "unknown";
    }
}
