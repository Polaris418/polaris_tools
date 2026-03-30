package com.polaris.ai;

import com.polaris.ai.dto.AiUsageLimitResult;
import com.polaris.ai.service.impl.RedisAiUsageLimiter;
import com.polaris.common.exception.BusinessException;
import com.polaris.common.exception.ErrorCode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import java.time.Duration;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("Redis AI 使用额度限制器测试")
class RedisAiUsageLimiterTest {

    @Mock
    private RedisTemplate<String, Object> redisTemplate;

    @Mock
    private ValueOperations<String, Object> valueOperations;

    private RedisAiUsageLimiter limiter;

    @BeforeEach
    void setUp() {
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        limiter = new RedisAiUsageLimiter(redisTemplate, 10, 100, "Asia/Hong_Kong");
    }

    @Test
    @DisplayName("游客首次请求应返回剩余 9 次并设置到次日的过期时间")
    void shouldConsumeGuestQuotaAndSetExpiry() {
        String key = "ai:format:guest:guest-1:127.0.0.1:" + currentDate();
        when(valueOperations.increment(key)).thenReturn(1L);

        AiUsageLimitResult result = limiter.consumeFormattingQuota(null, "guest-1", "127.0.0.1");

        assertEquals(9, result.getRemainingCount());
        assertEquals(10, result.getDailyLimit());
        assertEquals(key, result.getQuotaKey());
        verify(redisTemplate).expire(eq(key), any(Duration.class));
    }

    @Test
    @DisplayName("游客第 11 次请求应触发每日限额")
    void shouldRejectGuestWhenQuotaExceeded() {
        String key = "ai:format:guest:guest-1:127.0.0.1:" + currentDate();
        when(valueOperations.increment(key)).thenReturn(11L);

        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> limiter.consumeFormattingQuota(null, "guest-1", "127.0.0.1")
        );

        assertEquals(ErrorCode.AI_FORMAT_QUOTA_EXCEEDED.getCode(), exception.getCode());
    }

    @Test
    @DisplayName("登录用户应按用户 ID 计数")
    void shouldUseUserIdQuotaForAuthenticatedUser() {
        String key = "ai:format:user:42:" + currentDate();
        when(valueOperations.increment(key)).thenReturn(1L);

        AiUsageLimitResult result = limiter.consumeFormattingQuota(42L, "guest-1", "127.0.0.1");

        assertEquals(99, result.getRemainingCount());
        assertEquals(key, result.getQuotaKey());
    }

    private String currentDate() {
        return LocalDate.now(ZoneId.of("Asia/Hong_Kong")).format(DateTimeFormatter.ISO_LOCAL_DATE);
    }
}
