package com.polaris.security;

import com.polaris.entity.VerificationPurpose;
import com.polaris.auth.service.impl.RateLimiterServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * 限流服务安全测试
 * 测试限流机制和防滥用保护
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("限流服务安全测试")
public class RateLimiterSecurityTest {

    @Mock
    private RedisTemplate<String, Object> redisTemplate;

    @Mock
    private ValueOperations<String, Object> valueOperations;

    @InjectMocks
    private RateLimiterServiceImpl rateLimiterService;

    private static final String TEST_EMAIL = "test@example.com";
    private static final String TEST_IP = "192.168.1.1";
    private static final VerificationPurpose TEST_PURPOSE = VerificationPurpose.LOGIN;

    @BeforeEach
    void setUp() {
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
    }

    /**
     * 测试1: 邮箱级限流 - 60秒冷却时间
     * 验证同一邮箱在60秒内只能发送1次验证码
     */
    @Test
    @DisplayName("邮箱级限流 - 60秒冷却时间")
    void testEmailRateLimit_CooldownPeriod() {
        String cooldownKey = "rate_limit:email:cooldown:" + TEST_EMAIL + ":" + TEST_PURPOSE.name();

        // 第一次请求应该通过
        when(redisTemplate.hasKey(cooldownKey)).thenReturn(false);
        assertTrue(rateLimiterService.checkEmailRateLimit(TEST_EMAIL, TEST_PURPOSE),
                "第一次请求应该通过");

        // 记录尝试后，冷却期内的请求应该被拒绝
        rateLimiterService.recordAttempt(TEST_EMAIL, TEST_PURPOSE, TEST_IP);
        
        when(redisTemplate.hasKey(cooldownKey)).thenReturn(true);
        assertFalse(rateLimiterService.checkEmailRateLimit(TEST_EMAIL, TEST_PURPOSE),
                "冷却期内的请求应该被拒绝");

        // 验证Redis设置了正确的过期时间
        verify(valueOperations).set(eq(cooldownKey), eq(1), eq(60L), eq(TimeUnit.SECONDS));
    }

    /**
     * 测试2: 邮箱级限流 - 每日最多10次
     * 验证同一邮箱每日最多发送10次验证码
     */
    @Test
    @DisplayName("邮箱级限流 - 每日最多10次")
    void testEmailRateLimit_DailyLimit() {
        String dailyKey = "rate_limit:email:daily:" + TEST_EMAIL + ":" + TEST_PURPOSE.name();
        String cooldownKey = "rate_limit:email:cooldown:" + TEST_EMAIL + ":" + TEST_PURPOSE.name();

        // 模拟已发送9次
        when(valueOperations.get(dailyKey)).thenReturn(9);
        when(redisTemplate.hasKey(cooldownKey)).thenReturn(false);

        // 第10次应该通过
        assertTrue(rateLimiterService.checkEmailRateLimit(TEST_EMAIL, TEST_PURPOSE),
                "第10次请求应该通过");

        // 模拟已发送10次
        when(valueOperations.get(dailyKey)).thenReturn(10);

        // 第11次应该被拒绝
        assertFalse(rateLimiterService.checkEmailRateLimit(TEST_EMAIL, TEST_PURPOSE),
                "超过每日限制的请求应该被拒绝");
    }

    /**
     * 测试3: IP级限流 - 60秒冷却时间
     * 验证同一IP在60秒内最多发送3次验证码请求
     */
    @Test
    @DisplayName("IP级限流 - 60秒冷却时间")
    void testIpRateLimit_CooldownPeriod() {
        String cooldownKey = "rate_limit:ip:cooldown:" + TEST_IP;
        String dailyKey = "rate_limit:ip:daily:" + TEST_IP;

        // 前3次请求应该通过
        when(redisTemplate.hasKey(cooldownKey)).thenReturn(false, false, false, true);
        when(valueOperations.get(dailyKey)).thenReturn(0);
        
        assertTrue(rateLimiterService.checkIpRateLimit(TEST_IP),
                "第1次IP请求应该通过");
        assertTrue(rateLimiterService.checkIpRateLimit(TEST_IP),
                "第2次IP请求应该通过");
        assertTrue(rateLimiterService.checkIpRateLimit(TEST_IP),
                "第3次IP请求应该通过");

        // 第4次请求应该被拒绝
        assertFalse(rateLimiterService.checkIpRateLimit(TEST_IP),
                "第4次IP请求应该被拒绝");
    }

    /**
     * 测试4: IP级限流 - 每日最多20次
     * 验证同一IP每日最多发送20次验证码请求
     */
    @Test
    @DisplayName("IP级限流 - 每日最多20次")
    void testIpRateLimit_DailyLimit() {
        String dailyKey = "rate_limit:ip:daily:" + TEST_IP;
        String cooldownKey = "rate_limit:ip:cooldown:" + TEST_IP;

        // 模拟已发送19次
        when(valueOperations.get(dailyKey)).thenReturn(19);
        when(redisTemplate.hasKey(cooldownKey)).thenReturn(false);

        // 第20次应该通过
        assertTrue(rateLimiterService.checkIpRateLimit(TEST_IP),
                "第20次IP请求应该通过");

        // 模拟已发送20次
        when(valueOperations.get(dailyKey)).thenReturn(20);

        // 第21次应该被拒绝
        assertFalse(rateLimiterService.checkIpRateLimit(TEST_IP),
                "超过每日IP限制的请求应该被拒绝");
    }

    /**
     * 测试5: 邮箱封禁机制
     * 验证验证失败10次后邮箱被临时封禁1小时
     */
    @Test
    @DisplayName("邮箱封禁机制 - 失败10次后封禁")
    void testEmailBlocking_AfterFailures() {
        String blockKey = "rate_limit:email:block:" + TEST_EMAIL + ":" + TEST_PURPOSE.name();

        // 未封禁时应该返回false
        when(redisTemplate.hasKey(blockKey)).thenReturn(false);
        assertFalse(rateLimiterService.isEmailBlocked(TEST_EMAIL, TEST_PURPOSE),
                "未封禁的邮箱应该返回false");

        // 封禁邮箱
        rateLimiterService.blockEmail(TEST_EMAIL, TEST_PURPOSE, 60);

        // 验证Redis设置了封禁标记
        verify(valueOperations).set(eq(blockKey), eq(1), eq(60L), eq(TimeUnit.MINUTES));

        // 封禁后应该返回true
        when(redisTemplate.hasKey(blockKey)).thenReturn(true);
        assertTrue(rateLimiterService.isEmailBlocked(TEST_EMAIL, TEST_PURPOSE),
                "封禁的邮箱应该返回true");
    }

    /**
     * 测试6: 获取剩余冷却时间
     * 验证能正确获取邮箱和IP的剩余冷却时间
     */
    @Test
    @DisplayName("获取剩余冷却时间")
    void testGetCooldownSeconds() {
        String emailCooldownKey = "rate_limit:email:cooldown:" + TEST_EMAIL + ":" + TEST_PURPOSE.name();
        String ipCooldownKey = "rate_limit:ip:cooldown:" + TEST_IP;

        // 模拟剩余30秒
        when(redisTemplate.getExpire(emailCooldownKey, TimeUnit.SECONDS)).thenReturn(30L);
        when(redisTemplate.getExpire(ipCooldownKey, TimeUnit.SECONDS)).thenReturn(45L);

        long emailCooldown = rateLimiterService.getEmailCooldownSeconds(TEST_EMAIL, TEST_PURPOSE);
        long ipCooldown = rateLimiterService.getIpCooldownSeconds(TEST_IP);

        assertEquals(30L, emailCooldown, "邮箱冷却时间应该是30秒");
        assertEquals(45L, ipCooldown, "IP冷却时间应该是45秒");
    }

    /**
     * 测试7: 重置限流计数器
     * 验证管理员可以重置限流计数器
     */
    @Test
    @DisplayName("重置限流计数器 - 管理员功能")
    void testResetRateLimit() {
        String cooldownKey = "rate_limit:email:cooldown:" + TEST_EMAIL + ":" + TEST_PURPOSE.name();
        String dailyKey = "rate_limit:email:daily:" + TEST_EMAIL + ":" + TEST_PURPOSE.name();
        String blockKey = "rate_limit:email:block:" + TEST_EMAIL + ":" + TEST_PURPOSE.name();

        // 重置限流计数器
        rateLimiterService.resetEmailRateLimit(TEST_EMAIL, TEST_PURPOSE);

        // 验证删除了所有相关的Redis键
        verify(redisTemplate).delete(cooldownKey);
        verify(redisTemplate).delete(dailyKey);
        verify(redisTemplate).delete(blockKey);
    }

    /**
     * 测试8: 记录尝试 - 增加计数器
     * 验证记录尝试时正确增加计数器
     */
    @Test
    @DisplayName("记录尝试 - 增加计数器")
    void testRecordAttempt_IncrementCounters() {
        String emailCooldownKey = "rate_limit:email:cooldown:" + TEST_EMAIL + ":" + TEST_PURPOSE.name();
        String emailDailyKey = "rate_limit:email:daily:" + TEST_EMAIL + ":" + TEST_PURPOSE.name();
        String ipCooldownKey = "rate_limit:ip:cooldown:" + TEST_IP;
        String ipDailyKey = "rate_limit:ip:daily:" + TEST_IP;

        // 记录尝试
        rateLimiterService.recordAttempt(TEST_EMAIL, TEST_PURPOSE, TEST_IP);

        // 验证设置了冷却期
        verify(valueOperations).set(eq(emailCooldownKey), eq(1), eq(60L), eq(TimeUnit.SECONDS));
        verify(valueOperations).set(eq(ipCooldownKey), eq(1), eq(60L), eq(TimeUnit.SECONDS));

        // 验证增加了每日计数
        verify(valueOperations).increment(emailDailyKey);
        verify(valueOperations).increment(ipDailyKey);
    }

    /**
     * 测试9: 分布式环境下的限流一致性
     * 验证在分布式环境下限流机制的一致性
     */
    @Test
    @DisplayName("分布式限流一致性")
    void testDistributedRateLimiting() {
        String cooldownKey = "rate_limit:email:cooldown:" + TEST_EMAIL + ":" + TEST_PURPOSE.name();

        // 模拟多个服务器实例同时检查限流
        when(redisTemplate.hasKey(cooldownKey)).thenReturn(false);

        // 第一个实例检查通过
        assertTrue(rateLimiterService.checkEmailRateLimit(TEST_EMAIL, TEST_PURPOSE));

        // 记录尝试后，其他实例应该看到限流
        when(redisTemplate.hasKey(cooldownKey)).thenReturn(true);
        assertFalse(rateLimiterService.checkEmailRateLimit(TEST_EMAIL, TEST_PURPOSE));
    }

    /**
     * 测试10: 恶意IP检测
     * 验证能检测到来自同一IP的大量请求
     */
    @Test
    @DisplayName("恶意IP检测 - 大量请求")
    void testMaliciousIpDetection() {
        String ipCooldownKey = "rate_limit:ip:cooldown:" + TEST_IP;
        String ipDailyKey = "rate_limit:ip:daily:" + TEST_IP;

        // 模拟短时间内的多次请求
        when(redisTemplate.hasKey(ipCooldownKey)).thenReturn(false, false, false, true);
        when(valueOperations.get(ipDailyKey)).thenReturn(0);

        // 前3次应该通过
        assertTrue(rateLimiterService.checkIpRateLimit(TEST_IP));
        assertTrue(rateLimiterService.checkIpRateLimit(TEST_IP));
        assertTrue(rateLimiterService.checkIpRateLimit(TEST_IP));

        // 第4次应该被拒绝（达到60秒内3次的限制）
        assertFalse(rateLimiterService.checkIpRateLimit(TEST_IP));
    }

    /**
     * 测试11: 不同用途的独立限流
     * 验证不同用途的验证码有独立的限流计数
     */
    @Test
    @DisplayName("不同用途的独立限流")
    void testIndependentRateLimitByPurpose() {
        String loginCooldownKey = "rate_limit:email:cooldown:" + TEST_EMAIL + ":" + VerificationPurpose.LOGIN.name();
        String registerCooldownKey = "rate_limit:email:cooldown:" + TEST_EMAIL + ":" + VerificationPurpose.REGISTER.name();

        // 登录用途的限流
        when(redisTemplate.hasKey(loginCooldownKey)).thenReturn(true);
        when(redisTemplate.hasKey(registerCooldownKey)).thenReturn(false);

        // 登录用途被限流
        assertFalse(rateLimiterService.checkEmailRateLimit(TEST_EMAIL, VerificationPurpose.LOGIN));

        // 注册用途不受影响
        assertTrue(rateLimiterService.checkEmailRateLimit(TEST_EMAIL, VerificationPurpose.REGISTER));
    }

    /**
     * 测试12: Redis故障处理
     * 验证Redis故障时的降级处理
     */
    @Test
    @DisplayName("Redis故障处理")
    void testRedisFailureHandling() {
        // 模拟Redis异常
        when(redisTemplate.hasKey(anyString())).thenThrow(new RuntimeException("Redis connection failed"));

        // 应该安全处理异常，不影响系统运行
        // 在实际实现中，可能会选择允许请求通过或拒绝请求
        assertDoesNotThrow(() -> 
            rateLimiterService.checkEmailRateLimit(TEST_EMAIL, TEST_PURPOSE),
            "Redis故障时应该安全处理"
        );
    }
}
