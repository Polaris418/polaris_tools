package com.polaris.email.service;

import com.polaris.email.config.AwsSesConfig;
import com.polaris.email.dto.RateLimitResult;
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.concurrent.TimeUnit;

/**
 * 邮件发送限流器
 * 使用 Bucket4j 令牌桶算法实现每秒和每日限流
 * 使用 Redis 实现邮箱级、用户级和 IP 级限流
 */
@Component
public class EmailRateLimiter {
    
    private static final Logger log = LoggerFactory.getLogger(EmailRateLimiter.class);
    
    private static final String EMAIL_RATE_LIMIT_KEY_PREFIX = "rate_limit:email:";
    private static final String USER_RATE_LIMIT_KEY_PREFIX = "rate_limit:user:";
    private static final String IP_RATE_LIMIT_KEY_PREFIX = "rate_limit:ip:";
    
    private final Bucket perSecondBucket;
    private final Bucket perDayBucket;
    private final StringRedisTemplate redisTemplate;
    private final AwsSesConfig config;
    
    public EmailRateLimiter(AwsSesConfig config, StringRedisTemplate redisTemplate) {
        this.config = config;
        this.redisTemplate = redisTemplate;
        
        // 每秒限流桶
        Bandwidth perSecondLimit = Bandwidth.builder()
                .capacity(config.getRateLimit().getMaxEmailsPerSecond())
                .refillIntervally(
                        config.getRateLimit().getMaxEmailsPerSecond(),
                        Duration.ofSeconds(1)
                )
                .build();
        this.perSecondBucket = Bucket.builder()
                .addLimit(perSecondLimit)
                .build();
        
        // 每日限流桶
        Bandwidth perDayLimit = Bandwidth.builder()
                .capacity(config.getRateLimit().getMaxEmailsPerDay())
                .refillIntervally(
                        config.getRateLimit().getMaxEmailsPerDay(),
                        Duration.ofDays(1)
                )
                .build();
        this.perDayBucket = Bucket.builder()
                .addLimit(perDayLimit)
                .build();
        
        log.info("邮件限流器已初始化: 每秒最大{}封, 每日最大{}封, 邮箱冷却{}秒, 用户每日限制{}次, IP冷却{}秒/{}次",
                config.getRateLimit().getMaxEmailsPerSecond(),
                config.getRateLimit().getMaxEmailsPerDay(),
                config.getRateLimit().getEmailCooldownSeconds(),
                config.getRateLimit().getUserDailyLimit(),
                config.getRateLimit().getIpCooldownSeconds(),
                config.getRateLimit().getIpMaxRequests());
    }
    
    /**
     * 尝试获取发送许可 (阻塞式)
     * 如果达到限流，会阻塞等待直到有可用令牌
     */
    public void acquirePermit() {
        try {
            // 等待每秒限流桶
            perSecondBucket.asBlocking().consume(1);
            
            // 等待每日限流桶
            perDayBucket.asBlocking().consume(1);
            
            log.debug("成功获取邮件发送许可");
            
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.warn("限流等待被中断", e);
            throw new RuntimeException("限流等待被中断", e);
        }
    }
    
    /**
     * 尝试获取发送许可 (非阻塞式)
     * 
     * @return 是否成功获取许可
     */
    public boolean tryAcquirePermit() {
        boolean perSecondAvailable = perSecondBucket.tryConsume(1);
        if (!perSecondAvailable) {
            log.warn("达到每秒邮件发送限制，无法获取发送许可");
            return false;
        }
        
        boolean perDayAvailable = perDayBucket.tryConsume(1);
        if (!perDayAvailable) {
            log.warn("达到每日邮件发送限制，无法获取发送许可");
            // 归还每秒限流桶的令牌
            perSecondBucket.addTokens(1);
            return false;
        }
        
        log.debug("成功获取邮件发送许可 (非阻塞)");
        return true;
    }
    
    /**
     * 检查邮箱级限流（用于验证/重置邮件）
     * 同一邮箱 60 秒内最多 1 次验证/重置邮件
     * 
     * @param email 邮箱地址
     * @return 限流检查结果
     */
    public RateLimitResult checkEmailRateLimit(String email) {
        String key = EMAIL_RATE_LIMIT_KEY_PREFIX + email;
        
        // 检查是否存在限流记录
        Long ttl = redisTemplate.getExpire(key, TimeUnit.SECONDS);
        if (ttl != null && ttl > 0) {
            String message = String.format("该邮箱地址发送过于频繁，请在 %d 秒后重试", ttl);
            log.warn("邮箱级限流触发: email={}, remainingSeconds={}", email, ttl);
            return RateLimitResult.denied("email", message, ttl);
        }
        
        // 设置限流记录
        redisTemplate.opsForValue().set(
                key, 
                String.valueOf(System.currentTimeMillis()),
                config.getRateLimit().getEmailCooldownSeconds(),
                TimeUnit.SECONDS
        );
        
        log.debug("邮箱级限流检查通过: email={}", email);
        return RateLimitResult.allowed();
    }
    
    /**
     * 检查用户级每日限流（用于验证/重置邮件）
     * 同一用户每日最多 5 次验证/重置邮件
     * 
     * @param userId 用户 ID
     * @return 限流检查结果
     */
    public RateLimitResult checkUserDailyLimit(Long userId) {
        String key = USER_RATE_LIMIT_KEY_PREFIX + userId;
        
        // 获取当前计数
        String countStr = redisTemplate.opsForValue().get(key);
        int count = countStr != null ? Integer.parseInt(countStr) : 0;
        
        // 检查是否超过限制
        if (count >= config.getRateLimit().getUserDailyLimit()) {
            Long ttl = redisTemplate.getExpire(key, TimeUnit.SECONDS);
            String message = String.format("您今日的验证/重置邮件次数已达上限，请在 %d 秒后重试", ttl != null ? ttl : 0);
            log.warn("用户级每日限流触发: userId={}, count={}, limit={}", 
                    userId, count, config.getRateLimit().getUserDailyLimit());
            return RateLimitResult.denied("user", message, ttl);
        }
        
        // 增加计数
        redisTemplate.opsForValue().increment(key);
        
        // 如果是第一次，设置过期时间为 24 小时
        if (count == 0) {
            redisTemplate.expire(key, 24, TimeUnit.HOURS);
        }
        
        log.debug("用户级每日限流检查通过: userId={}, count={}/{}", 
                userId, count + 1, config.getRateLimit().getUserDailyLimit());
        return RateLimitResult.allowed();
    }
    
    /**
     * 检查 IP 级限流
     * 同一 IP 60 秒内最多 3 次邮件请求
     * 
     * @param ipAddress IP 地址
     * @return 限流检查结果
     */
    public RateLimitResult checkIpRateLimit(String ipAddress) {
        String key = IP_RATE_LIMIT_KEY_PREFIX + ipAddress;
        
        // 获取当前计数
        String countStr = redisTemplate.opsForValue().get(key);
        int count = countStr != null ? Integer.parseInt(countStr) : 0;
        
        // 检查是否超过限制
        if (count >= config.getRateLimit().getIpMaxRequests()) {
            Long ttl = redisTemplate.getExpire(key, TimeUnit.SECONDS);
            String message = String.format("该 IP 地址请求过于频繁，请在 %d 秒后重试", ttl != null ? ttl : 0);
            log.warn("IP 级限流触发: ip={}, count={}, limit={}", 
                    ipAddress, count, config.getRateLimit().getIpMaxRequests());
            return RateLimitResult.denied("ip", message, ttl);
        }
        
        // 增加计数
        redisTemplate.opsForValue().increment(key);
        
        // 如果是第一次，设置过期时间
        if (count == 0) {
            redisTemplate.expire(key, config.getRateLimit().getIpCooldownSeconds(), TimeUnit.SECONDS);
        }
        
        log.debug("IP 级限流检查通过: ip={}, count={}/{}", 
                ipAddress, count + 1, config.getRateLimit().getIpMaxRequests());
        return RateLimitResult.allowed();
    }
    
    /**
     * 重置邮箱级限流
     * 
     * @param email 邮箱地址
     */
    public void resetEmailRateLimit(String email) {
        String key = EMAIL_RATE_LIMIT_KEY_PREFIX + email;
        redisTemplate.delete(key);
        log.info("已重置邮箱级限流: email={}", email);
    }
    
    /**
     * 重置用户级每日限流
     * 
     * @param userId 用户 ID
     */
    public void resetUserDailyLimit(Long userId) {
        String key = USER_RATE_LIMIT_KEY_PREFIX + userId;
        redisTemplate.delete(key);
        log.info("已重置用户级每日限流: userId={}", userId);
    }
    
    /**
     * 重置 IP 级限流
     * 
     * @param ipAddress IP 地址
     */
    public void resetIpRateLimit(String ipAddress) {
        String key = IP_RATE_LIMIT_KEY_PREFIX + ipAddress;
        redisTemplate.delete(key);
        log.info("已重置 IP 级限流: ip={}", ipAddress);
    }
    
    /**
     * 获取邮箱级限流剩余时间
     * 
     * @param email 邮箱地址
     * @return 剩余秒数，如果没有限流则返回 0
     */
    public long getEmailRateLimitRemaining(String email) {
        String key = EMAIL_RATE_LIMIT_KEY_PREFIX + email;
        Long ttl = redisTemplate.getExpire(key, TimeUnit.SECONDS);
        return ttl != null && ttl > 0 ? ttl : 0;
    }
    
    /**
     * 获取用户级每日限流使用次数
     * 
     * @param userId 用户 ID
     * @return 已使用次数
     */
    public int getUserDailyLimitUsage(Long userId) {
        String key = USER_RATE_LIMIT_KEY_PREFIX + userId;
        String countStr = redisTemplate.opsForValue().get(key);
        return countStr != null ? Integer.parseInt(countStr) : 0;
    }
    
    /**
     * 获取 IP 级限流使用次数
     * 
     * @param ipAddress IP 地址
     * @return 已使用次数
     */
    public int getIpRateLimitUsage(String ipAddress) {
        String key = IP_RATE_LIMIT_KEY_PREFIX + ipAddress;
        String countStr = redisTemplate.opsForValue().get(key);
        return countStr != null ? Integer.parseInt(countStr) : 0;
    }
}
