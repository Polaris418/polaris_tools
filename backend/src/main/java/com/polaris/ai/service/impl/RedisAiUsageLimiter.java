package com.polaris.ai.service.impl;

import com.polaris.ai.dto.AiUsageLimitResult;
import com.polaris.ai.service.AiUsageLimiter;
import com.polaris.common.exception.BusinessException;
import com.polaris.common.exception.ErrorCode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.Duration;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;

/**
 * 基于 Redis 的 AI 使用额度限制器
 */
@Service
@Slf4j
public class RedisAiUsageLimiter implements AiUsageLimiter {

    private static final String GUEST_KEY_PREFIX = "ai:format:guest:";
    private static final String USER_KEY_PREFIX = "ai:format:user:";
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ISO_LOCAL_DATE;

    private final RedisTemplate<String, Object> redisTemplate;
    private final int guestDailyLimit;
    private final int userDailyLimit;
    private final ZoneId zoneId;

    public RedisAiUsageLimiter(
            RedisTemplate<String, Object> redisTemplate,
            @Value("${app.ai.formatting.guest-daily-limit:10}") int guestDailyLimit,
            @Value("${app.ai.formatting.user-daily-limit:100}") int userDailyLimit,
            @Value("${app.ai.formatting.zone-id:Asia/Hong_Kong}") String zoneId
    ) {
        this.redisTemplate = redisTemplate;
        this.guestDailyLimit = guestDailyLimit;
        this.userDailyLimit = userDailyLimit;
        this.zoneId = ZoneId.of(zoneId);
    }

    @Override
    public AiUsageLimitResult consumeFormattingQuota(Long userId, String guestId, String ipAddress) {
        boolean authenticated = userId != null;
        String key = authenticated
                ? buildUserKey(userId)
                : buildGuestKey(guestId, ipAddress);
        int limit = authenticated ? userDailyLimit : guestDailyLimit;

        try {
            Long currentCount = redisTemplate.opsForValue().increment(key);
            if (currentCount == null) {
                throw new IllegalStateException("Redis 未返回有效计数");
            }

            if (currentCount == 1L) {
                redisTemplate.expire(key, ttlUntilNextDay());
            }

            if (currentCount > limit) {
                throw new BusinessException(ErrorCode.AI_FORMAT_QUOTA_EXCEEDED);
            }

            return AiUsageLimitResult.builder()
                    .authenticated(authenticated)
                    .dailyLimit(limit)
                    .quotaKey(key)
                    .remainingCount(Math.max(0, limit - currentCount.intValue()))
                    .build();
        } catch (BusinessException ex) {
            throw ex;
        } catch (Exception ex) {
            log.error("AI 格式额度校验失败，放行本次请求: key={}", key, ex);
            return AiUsageLimitResult.builder()
                    .authenticated(authenticated)
                    .dailyLimit(limit)
                    .quotaKey(key)
                    .remainingCount(null)
                    .build();
        }
    }

    private String buildUserKey(Long userId) {
        return USER_KEY_PREFIX + userId + ":" + currentDate();
    }

    private String buildGuestKey(String guestId, String ipAddress) {
        String normalizedGuestId = StringUtils.hasText(guestId) ? guestId.trim() : "anonymous";
        String normalizedIp = StringUtils.hasText(ipAddress) ? ipAddress.trim() : "unknown";
        return GUEST_KEY_PREFIX + normalizedGuestId + ":" + normalizedIp + ":" + currentDate();
    }

    private String currentDate() {
        return LocalDate.now(zoneId).format(DATE_FORMATTER);
    }

    private Duration ttlUntilNextDay() {
        ZonedDateTime now = ZonedDateTime.now(zoneId);
        ZonedDateTime nextDayStart = now.toLocalDate().plusDays(1).atStartOfDay(zoneId);
        return Duration.between(now, nextDayStart);
    }
}
