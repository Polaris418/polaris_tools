package com.polaris.ai;

import com.polaris.ai.dto.AiChatResult;
import com.polaris.ai.dto.AiProviderMetricsAggregate;
import com.polaris.ai.dto.AiProviderMonitoringDashboardResponse;
import com.polaris.ai.dto.AiProviderTrendPoint;
import com.polaris.ai.entity.AiProviderConfig;
import com.polaris.ai.entity.AiProviderEvent;
import com.polaris.ai.mapper.AiProviderConfigMapper;
import com.polaris.ai.mapper.AiProviderEventMapper;
import com.polaris.ai.service.AiProviderManager;
import com.polaris.ai.service.AiProviderMonitoringService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("AI 提供商监控服务测试")
class AiProviderMonitoringServiceTest {

    @Mock
    private AiProviderConfigMapper mapper;

    @Mock
    private AiProviderEventMapper eventMapper;

    @Mock
    private AiProviderManager aiProviderManager;

    private AiProviderMonitoringService monitoringService;

    @BeforeEach
    void setUp() {
        monitoringService = new AiProviderMonitoringService(mapper, eventMapper, aiProviderManager);
    }

    @Test
    @DisplayName("应聚合健康状态与最近降级事件")
    void shouldBuildDashboardFromTelemetry() {
        AiProviderConfig primary = createConfig(1L, "NVIDIA 主用", "nvidia", true, true, 10);
        AiProviderConfig backup = createConfig(2L, "兼容备用", "openai-compatible", true, false, 20);

        when(mapper.selectAllOrdered()).thenReturn(List.of(primary, backup));
        when(eventMapper.aggregateByProvider(any(), any())).thenReturn(List.of(
                aggregate(1L, "NVIDIA 主用", "nvidia", 0, 1, 0, 0, 0, null, null, "timeout", null, null, null, LocalDateTime.now(), null, null),
                aggregate(2L, "兼容备用", "openai-compatible", 1, 0, 1, 0, 1, 420L, 210L, null, "连接成功", LocalDateTime.now(), LocalDateTime.now(), null, LocalDateTime.now(), LocalDateTime.now())
        ));
        when(eventMapper.findRecentByTimeRange(any(), any(), org.mockito.ArgumentMatchers.isNull(), eq(40)))
                .thenReturn(List.of(event(2L, "兼容备用", "openai-compatible", "fallback", true, null, "timeout", "NVIDIA 主用")));
        when(eventMapper.aggregateTrend(any(), any(), org.mockito.ArgumentMatchers.isNull()))
                .thenReturn(List.of(trendPoint()));
        when(aiProviderManager.isConfigAvailable(primary)).thenReturn(true);
        when(aiProviderManager.isConfigAvailable(backup)).thenReturn(true);

        AiProviderMonitoringDashboardResponse response = monitoringService.getDashboard(24, null);

        assertEquals(2, response.getSummary().getTotalProviders());
        assertEquals(24, response.getRangeHours());
        assertEquals(30, response.getRetentionDays());
        assertEquals(1, response.getTrendBucketHours());
        assertEquals(1L, response.getSummary().getFallbackCount());
        assertEquals(1L, response.getSummary().getFailureCount());
        assertEquals(1L, response.getSummary().getSuccessCount());
        assertNotNull(response.getSummary().getLastFallbackAt());
        assertEquals(2, response.getProviders().size());
        assertTrue(response.getRecentEvents().stream().anyMatch(event -> "fallback".equals(event.getEventType())));
        assertEquals(1, response.getTrendPoints().size());
        assertTrue(response.getProviders().stream().anyMatch(provider ->
                "兼容备用".equals(provider.getName())
                        && provider.getFallbackCount() == 1
                        && provider.getAvgLatencyMs() == 420L
        ));
    }

    @Test
    @DisplayName("长时间范围应按桶聚合趋势数据")
    void shouldDownsampleTrendPointsForLongRange() {
        AiProviderConfig primary = createConfig(1L, "NVIDIA 主用", "nvidia", true, true, 10);
        when(mapper.selectAllOrdered()).thenReturn(List.of(primary));
        when(eventMapper.aggregateByProvider(any(), any())).thenReturn(List.of());
        when(eventMapper.findRecentByTimeRange(any(), any(), eq(1L), eq(40))).thenReturn(List.of());
        when(eventMapper.aggregateTrend(any(), any(), eq(1L))).thenReturn(List.of(
                trendPointAt(LocalDateTime.of(2026, 3, 15, 0, 0), 2, 0, 0, 100D),
                trendPointAt(LocalDateTime.of(2026, 3, 15, 4, 0), 1, 1, 1, 200D),
                trendPointAt(LocalDateTime.of(2026, 3, 15, 8, 0), 3, 0, 0, 300D)
        ));
        when(aiProviderManager.isConfigAvailable(primary)).thenReturn(true);

        AiProviderMonitoringDashboardResponse response = monitoringService.getDashboard(24 * 7, 1L);

        assertEquals(168, response.getRangeHours());
        assertEquals(8, response.getTrendBucketHours());
        assertEquals(2, response.getTrendPoints().size());
        assertEquals(3L, response.getTrendPoints().get(0).getSuccessCount());
        assertEquals(1L, response.getTrendPoints().get(0).getFailureCount());
        assertEquals(1L, response.getTrendPoints().get(0).getFallbackCount());
        assertEquals(133.33333333333334D, response.getTrendPoints().get(0).getAvgLatencyMs(), 0.0001D);
        assertEquals(3L, response.getTrendPoints().get(1).getSuccessCount());
        assertEquals(0L, response.getTrendPoints().get(1).getFailureCount());
    }

    private AiProviderMetricsAggregate aggregate(
            Long providerId,
            String providerName,
            String providerType,
            long successCount,
            long failureCount,
            long testSuccessCount,
            long testFailureCount,
            long fallbackCount,
            Long avgLatencyMs,
            Long lastLatencyMs,
            String lastError,
            String lastConnectionMessage,
            LocalDateTime lastUsedAt,
            LocalDateTime lastSuccessAt,
            LocalDateTime lastFailureAt,
            LocalDateTime lastTestedAt,
            LocalDateTime lastFallbackAt
    ) {
        AiProviderMetricsAggregate aggregate = new AiProviderMetricsAggregate();
        aggregate.setProviderId(providerId);
        aggregate.setProviderName(providerName);
        aggregate.setProviderType(providerType);
        aggregate.setSuccessCount(successCount);
        aggregate.setFailureCount(failureCount);
        aggregate.setTestSuccessCount(testSuccessCount);
        aggregate.setTestFailureCount(testFailureCount);
        aggregate.setFallbackCount(fallbackCount);
        aggregate.setAvgLatencyMs(avgLatencyMs);
        aggregate.setLastLatencyMs(lastLatencyMs);
        aggregate.setLastError(lastError);
        aggregate.setLastConnectionMessage(lastConnectionMessage);
        aggregate.setLastUsedAt(lastUsedAt);
        aggregate.setLastSuccessAt(lastSuccessAt);
        aggregate.setLastFailureAt(lastFailureAt);
        aggregate.setLastTestedAt(lastTestedAt);
        aggregate.setLastFallbackAt(lastFallbackAt);
        return aggregate;
    }

    private AiProviderEvent event(
            Long providerId,
            String providerName,
            String providerType,
            String eventType,
            boolean success,
            Long latencyMs,
            String message,
            String relatedProviderName
    ) {
        AiProviderEvent event = new AiProviderEvent();
        event.setProviderId(providerId);
        event.setProviderName(providerName);
        event.setProviderType(providerType);
        event.setEventType(eventType);
        event.setSuccess(success);
        event.setLatencyMs(latencyMs);
        event.setMessage(message);
        event.setRelatedProviderName(relatedProviderName);
        event.setOccurredAt(LocalDateTime.now());
        return event;
    }

    private AiProviderTrendPoint trendPoint() {
        return trendPointAt(LocalDateTime.now().minusHours(1), 1, 1, 1, 420D);
    }

    private AiProviderTrendPoint trendPointAt(LocalDateTime metricHour, long successCount, long failureCount, long fallbackCount, Double avgLatencyMs) {
        AiProviderTrendPoint point = new AiProviderTrendPoint();
        point.setMetricHour(metricHour);
        point.setSuccessCount(successCount);
        point.setFailureCount(failureCount);
        point.setFallbackCount(fallbackCount);
        point.setAvgLatencyMs(avgLatencyMs);
        return point;
    }

    private AiProviderConfig createConfig(Long id, String name, String providerType, boolean enabled, boolean primary, int priority) {
        AiProviderConfig config = new AiProviderConfig();
        config.setId(id);
        config.setName(name);
        config.setProviderType(providerType);
        config.setBaseUrl("https://example.com/v1/chat/completions");
        config.setApiKeyEncrypted("encrypted");
        config.setModel("step-3.5");
        config.setEnabled(enabled);
        config.setIsPrimary(primary);
        config.setPriority(priority);
        config.setTimeoutMs(10000);
        config.setTemperature(BigDecimal.valueOf(0.2));
        config.setTopP(BigDecimal.valueOf(0.9));
        config.setMaxTokens(1024);
        return config;
    }
}
