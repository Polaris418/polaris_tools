package com.polaris.service.impl;

import com.polaris.email.dto.SendEmailResponse;
import com.polaris.dto.verification.SendVerificationCodeResponse;
import com.polaris.email.entity.EmailVerificationCode;
import com.polaris.entity.VerificationPurpose;
import com.polaris.email.mapper.EmailVerificationCodeMapper;
import com.polaris.email.service.EmailService;
import com.polaris.service.VerificationCodeService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Primary;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.concurrent.TimeUnit;

/**
 * 验证码服务实现类（带 Redis 缓存优化）
 * 负责验证码的生成、验证和管理
 * 使用 Redis 缓存减少数据库查询
 */
@Slf4j
@Service("verificationCodeServiceWithCache")
@Primary
@RequiredArgsConstructor
public class VerificationCodeServiceImplWithCache implements VerificationCodeService {
    
    private final EmailVerificationCodeMapper verificationCodeMapper;
    private final EmailService emailService;
    private final RedisTemplate<String, Object> redisTemplate;
    
    private static final int CODE_LENGTH = 6;
    private static final int CODE_EXPIRY_MINUTES = 10;
    private static final int MAX_FAIL_COUNT = 5;
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();
    
    // Redis key 前缀
    private static final String CACHE_KEY_PREFIX = "verification:code:";
    private static final String CACHE_KEY_PATTERN = CACHE_KEY_PREFIX + "%s:%s"; // email:purpose
    
    @Override
    @Transactional
    public SendVerificationCodeResponse generateAndSendCode(String email, VerificationPurpose purpose, String language) {
        log.info("生成并发送验证码: email={}, purpose={}, language={}", email, purpose, language);
        
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
            
            // 缓存验证码到 Redis（提高验证性能）
            cacheVerificationCode(email, purpose, verificationCode);
            
            // 发送验证码邮件
            SendEmailResponse emailResponse = sendVerificationEmail(email, code, purpose, language);
            if (!emailResponse.isSuccess()) {
                String message = emailResponse.getMessage() == null || emailResponse.getMessage().isBlank()
                        ? "验证码发送失败，请稍后重试"
                        : emailResponse.getMessage();
                log.warn("验证码邮件发送失败: email={}, purpose={}, message={}", email, purpose, message);
                return SendVerificationCodeResponse.builder()
                        .success(false)
                        .message(message)
                        .build();
            }

            log.info("验证码邮件已发送: email={}, purpose={}, language={}", email, purpose, language);
            return SendVerificationCodeResponse.builder()
                    .success(true)
                    .message("验证码已发送")
                    .cooldownSeconds(60)
                    .expiresIn(CODE_EXPIRY_MINUTES * 60)
                    .build();
            
        } catch (Exception e) {
            log.error("生成并发送验证码失败: email={}, purpose={}, error={}", 
                    email, purpose, e.getMessage(), e);
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
        
        // 验证码格式检查（6位数字）
        if (code == null || !code.matches("\\d{6}")) {
            log.warn("验证码格式无效: email={}, code={}", email, code);
            return false;
        }
        
        // 先从 Redis 缓存获取验证码
        EmailVerificationCode verificationCode = getCachedVerificationCode(email, purpose);
        
        // 如果缓存未命中，从数据库查询
        if (verificationCode == null) {
            log.debug("Redis 缓存未命中，从数据库查询: email={}, purpose={}", email, purpose);
            verificationCode = verificationCodeMapper.findValidByEmailAndPurpose(
                    email, 
                    purpose.name(), 
                    LocalDateTime.now(), 
                    MAX_FAIL_COUNT
            );
            
            if (verificationCode == null) {
                log.warn("未找到有效的验证码: email={}, purpose={}", email, purpose);
                return false;
            }
            
            // 将查询结果缓存到 Redis
            cacheVerificationCode(email, purpose, verificationCode);
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
            
            // 从缓存中删除
            removeCachedVerificationCode(email, purpose);
            
            log.info("验证码验证成功: email={}, purpose={}", email, purpose);
            return true;
        } else {
            // 验证失败，增加失败次数
            verificationCode.setFailCount(verificationCode.getFailCount() + 1);
            verificationCodeMapper.updateById(verificationCode);
            
            // 更新缓存
            if (verificationCode.getFailCount() < MAX_FAIL_COUNT) {
                cacheVerificationCode(email, purpose, verificationCode);
            } else {
                // 失败次数达到上限，从缓存中删除
                removeCachedVerificationCode(email, purpose);
            }
            
            log.warn("验证码验证失败: email={}, purpose={}, failCount={}", 
                    email, purpose, verificationCode.getFailCount());
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
        
        // 从缓存中删除
        removeCachedVerificationCode(email, purpose);
    }
    
    /**
     * 缓存验证码到 Redis
     * 
     * @param email 邮箱地址
     * @param purpose 验证码用途
     * @param verificationCode 验证码实体
     */
    private void cacheVerificationCode(String email, VerificationPurpose purpose, EmailVerificationCode verificationCode) {
        try {
            String cacheKey = getCacheKey(email, purpose);
            
            // 计算剩余有效时间
            Duration ttl = Duration.between(LocalDateTime.now(), verificationCode.getExpiresAt());
            if (ttl.isNegative() || ttl.isZero()) {
                log.warn("验证码已过期，不缓存: email={}, purpose={}", email, purpose);
                return;
            }
            
            // 缓存到 Redis，设置过期时间
            redisTemplate.opsForValue().set(cacheKey, verificationCode, ttl.getSeconds(), TimeUnit.SECONDS);
            log.debug("验证码已缓存到 Redis: key={}, ttl={}秒", cacheKey, ttl.getSeconds());
        } catch (Exception e) {
            log.error("缓存验证码到 Redis 失败: email={}, purpose={}, error={}", 
                    email, purpose, e.getMessage(), e);
            // 缓存失败不影响主流程，继续执行
        }
    }
    
    /**
     * 从 Redis 缓存获取验证码
     * 
     * @param email 邮箱地址
     * @param purpose 验证码用途
     * @return 验证码实体，如果不存在返回 null
     */
    private EmailVerificationCode getCachedVerificationCode(String email, VerificationPurpose purpose) {
        try {
            String cacheKey = getCacheKey(email, purpose);
            Object cached = redisTemplate.opsForValue().get(cacheKey);
            
            if (cached instanceof EmailVerificationCode) {
                log.debug("从 Redis 缓存获取验证码: key={}", cacheKey);
                return (EmailVerificationCode) cached;
            }
            
            return null;
        } catch (Exception e) {
            log.error("从 Redis 缓存获取验证码失败: email={}, purpose={}, error={}", 
                    email, purpose, e.getMessage(), e);
            // 缓存失败不影响主流程，返回 null 从数据库查询
            return null;
        }
    }
    
    /**
     * 从 Redis 缓存删除验证码
     * 
     * @param email 邮箱地址
     * @param purpose 验证码用途
     */
    private void removeCachedVerificationCode(String email, VerificationPurpose purpose) {
        try {
            String cacheKey = getCacheKey(email, purpose);
            redisTemplate.delete(cacheKey);
            log.debug("从 Redis 缓存删除验证码: key={}", cacheKey);
        } catch (Exception e) {
            log.error("从 Redis 缓存删除验证码失败: email={}, purpose={}, error={}", 
                    email, purpose, e.getMessage(), e);
            // 缓存删除失败不影响主流程
        }
    }
    
    /**
     * 生成缓存 key
     * 
     * @param email 邮箱地址
     * @param purpose 验证码用途
     * @return 缓存 key
     */
    private String getCacheKey(String email, VerificationPurpose purpose) {
        return String.format(CACHE_KEY_PATTERN, email, purpose.name());
    }

    /**
     * 根据验证码用途发送相应的验证码邮件
     */
    private SendEmailResponse sendVerificationEmail(String email, String code, VerificationPurpose purpose, String language) {
        String username = email.substring(0, email.indexOf('@'));
        String resolvedLanguage = (language == null || language.isBlank()) ? "zh-CN" : language;

        try {
            return switch (purpose) {
                case CHANGE -> emailService.sendPasswordChangeCode(email, username, code, resolvedLanguage);
                case LOGIN -> emailService.sendLoginCode(email, username, code, resolvedLanguage);
                case RESET -> emailService.sendPasswordResetCode(email, username, code, resolvedLanguage);
                case REGISTER, VERIFY -> emailService.sendEmailVerification(email, username, code);
            };
        } catch (Exception e) {
            log.error("发送验证码邮件异常: email={}, purpose={}, error={}", email, purpose, e.getMessage(), e);
            return SendEmailResponse.builder()
                    .success(false)
                    .message("发送验证码邮件异常: " + e.getMessage())
                    .build();
        }
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
}
