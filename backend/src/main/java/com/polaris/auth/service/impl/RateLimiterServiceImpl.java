package com.polaris.auth.service.impl;

import com.polaris.entity.VerificationPurpose;
import com.polaris.auth.service.RateLimiterService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.concurrent.TimeUnit;

/**
 * 限流服务实现类
 * 使用Redis实现分布式限流
 */
@Slf4j
@Service
public class RateLimiterServiceImpl implements RateLimiterService {
    
    private final RedisTemplate<String, Object> redisTemplate;
    
    // 限流配置常量
    private static final int EMAIL_COOLDOWN_SECONDS = 60; // 邮箱冷却时间：60秒
    private static final int EMAIL_DAILY_LIMIT = 10; // 邮箱每日限制：10次
    private static final int IP_COOLDOWN_SECONDS = 60; // IP冷却时间：60秒
    private static final int IP_DAILY_LIMIT = 20; // IP每日限制：20次
    private static final int BLOCK_DURATION_MINUTES = 60; // 封禁时长：60分钟
    private static final int FAIL_COUNT_THRESHOLD = 10; // 失败次数阈值：10次
    
    // Redis Key 前缀
    private static final String EMAIL_COOLDOWN_KEY_PREFIX = "rate_limit:email:cooldown:";
    private static final String EMAIL_DAILY_KEY_PREFIX = "rate_limit:email:daily:";
    private static final String IP_COOLDOWN_KEY_PREFIX = "rate_limit:ip:cooldown:";
    private static final String IP_DAILY_KEY_PREFIX = "rate_limit:ip:daily:";
    private static final String EMAIL_BLOCK_KEY_PREFIX = "rate_limit:email:block:";
    
    public RateLimiterServiceImpl(RedisTemplate<String, Object> redisTemplate) {
        this.redisTemplate = redisTemplate;
    }
    
    @Override
    public boolean checkEmailRateLimit(String email, VerificationPurpose purpose) {
        try {
            // 检查是否被封禁
            if (isEmailBlocked(email, purpose)) {
                log.warn("Email {} is blocked for purpose {}", email, purpose);
                return false;
            }

            String cooldownKey = getEmailCooldownKey(email, purpose);
            String dailyKey = getEmailDailyKey(email, purpose);

            // 检查冷却时间
            Boolean hasCooldown = redisTemplate.hasKey(cooldownKey);
            if (Boolean.TRUE.equals(hasCooldown)) {
                log.warn("Email {} is in cooldown period for purpose {}", email, purpose);
                return false;
            }

            // 检查每日限制
            Integer dailyCount = (Integer) redisTemplate.opsForValue().get(dailyKey);
            if (dailyCount != null && dailyCount >= EMAIL_DAILY_LIMIT) {
                log.warn("Email {} has reached daily limit for purpose {}", email, purpose);
                return false;
            }

            return true;
        } catch (Exception e) {
            log.error("Check email rate limit failed, allow request by default: email={}, purpose={}", email, purpose, e);
            return true;
        }
    }
    
    @Override
    public boolean checkIpRateLimit(String ipAddress) {
        try {
            String cooldownKey = getIpCooldownKey(ipAddress);
            String dailyKey = getIpDailyKey(ipAddress);

            // 检查冷却时间
            Boolean hasCooldown = redisTemplate.hasKey(cooldownKey);
            if (Boolean.TRUE.equals(hasCooldown)) {
                log.warn("IP {} is in cooldown period", ipAddress);
                return false;
            }

            // 检查每日限制
            Integer dailyCount = (Integer) redisTemplate.opsForValue().get(dailyKey);
            if (dailyCount != null && dailyCount >= IP_DAILY_LIMIT) {
                log.warn("IP {} has reached daily limit", ipAddress);
                return false;
            }

            return true;
        } catch (Exception e) {
            log.error("Check IP rate limit failed, allow request by default: ip={}", ipAddress, e);
            return true;
        }
    }
    
    @Override
    public void recordAttempt(String email, VerificationPurpose purpose, String ipAddress) {
        // 记录邮箱冷却时间
        String emailCooldownKey = getEmailCooldownKey(email, purpose);
        redisTemplate.opsForValue().set(emailCooldownKey, 1, EMAIL_COOLDOWN_SECONDS, TimeUnit.SECONDS);
        
        // 增加邮箱每日计数
        String emailDailyKey = getEmailDailyKey(email, purpose);
        Long emailCount = redisTemplate.opsForValue().increment(emailDailyKey);
        if (emailCount != null && emailCount == 1) {
            // 第一次计数，设置过期时间为24小时
            redisTemplate.expire(emailDailyKey, Duration.ofDays(1));
        }
        
        // 记录IP冷却时间
        String ipCooldownKey = getIpCooldownKey(ipAddress);
        redisTemplate.opsForValue().set(ipCooldownKey, 1, IP_COOLDOWN_SECONDS, TimeUnit.SECONDS);
        
        // 增加IP每日计数
        String ipDailyKey = getIpDailyKey(ipAddress);
        Long ipCount = redisTemplate.opsForValue().increment(ipDailyKey);
        if (ipCount != null && ipCount == 1) {
            // 第一次计数，设置过期时间为24小时
            redisTemplate.expire(ipDailyKey, Duration.ofDays(1));
        }
        
        log.info("Recorded attempt for email {} (purpose: {}), IP {}", email, purpose, ipAddress);
    }
    
    @Override
    public long getEmailCooldownSeconds(String email, VerificationPurpose purpose) {
        String cooldownKey = getEmailCooldownKey(email, purpose);
        Long ttl = redisTemplate.getExpire(cooldownKey, TimeUnit.SECONDS);
        return ttl != null && ttl > 0 ? ttl : 0;
    }
    
    @Override
    public long getIpCooldownSeconds(String ipAddress) {
        String cooldownKey = getIpCooldownKey(ipAddress);
        Long ttl = redisTemplate.getExpire(cooldownKey, TimeUnit.SECONDS);
        return ttl != null && ttl > 0 ? ttl : 0;
    }
    
    @Override
    public boolean isEmailBlocked(String email, VerificationPurpose purpose) {
        String blockKey = getEmailBlockKey(email, purpose);
        Boolean hasKey = redisTemplate.hasKey(blockKey);
        return Boolean.TRUE.equals(hasKey);
    }
    
    @Override
    public void blockEmail(String email, VerificationPurpose purpose, int durationMinutes) {
        String blockKey = getEmailBlockKey(email, purpose);
        redisTemplate.opsForValue().set(blockKey, 1, durationMinutes, TimeUnit.MINUTES);
        log.warn("Blocked email {} for purpose {} for {} minutes", email, purpose, durationMinutes);
    }
    
    @Override
    public void resetEmailRateLimit(String email, VerificationPurpose purpose) {
        String cooldownKey = getEmailCooldownKey(email, purpose);
        String dailyKey = getEmailDailyKey(email, purpose);
        String blockKey = getEmailBlockKey(email, purpose);
        
        redisTemplate.delete(cooldownKey);
        redisTemplate.delete(dailyKey);
        redisTemplate.delete(blockKey);
        
        log.info("Reset rate limit for email {} (purpose: {})", email, purpose);
    }
    
    @Override
    public void resetIpRateLimit(String ipAddress) {
        String cooldownKey = getIpCooldownKey(ipAddress);
        String dailyKey = getIpDailyKey(ipAddress);
        
        redisTemplate.delete(cooldownKey);
        redisTemplate.delete(dailyKey);
        
        log.info("Reset rate limit for IP {}", ipAddress);
    }
    
    // Redis Key 生成方法
    
    private String getEmailCooldownKey(String email, VerificationPurpose purpose) {
        return EMAIL_COOLDOWN_KEY_PREFIX + email + ":" + purpose.name();
    }
    
    private String getEmailDailyKey(String email, VerificationPurpose purpose) {
        return EMAIL_DAILY_KEY_PREFIX + email + ":" + purpose.name();
    }
    
    private String getIpCooldownKey(String ipAddress) {
        return IP_COOLDOWN_KEY_PREFIX + ipAddress;
    }
    
    private String getIpDailyKey(String ipAddress) {
        return IP_DAILY_KEY_PREFIX + ipAddress;
    }
    
    private String getEmailBlockKey(String email, VerificationPurpose purpose) {
        return EMAIL_BLOCK_KEY_PREFIX + email + ":" + purpose.name();
    }
}
