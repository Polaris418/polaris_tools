package com.polaris.ai.service;

import com.polaris.ai.dto.AiProviderMetricsAggregate;
import com.polaris.ai.dto.AiProviderMonitoringDashboardResponse;
import com.polaris.ai.dto.AiProviderTrendPoint;
import com.polaris.ai.entity.AiProviderConfig;
import com.polaris.ai.entity.AiProviderEvent;
import com.polaris.ai.mapper.AiProviderConfigMapper;
import com.polaris.ai.mapper.AiProviderEventMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * AI 提供商监控服务
 */
@Service
@RequiredArgsConstructor
public class AiProviderMonitoringService {

    private static final int DEFAULT_RANGE_HOURS = 24;
    private static final int MAX_RECENT_EVENTS = 40;
    private static final LocalDateTime BUCKET_ORIGIN = LocalDateTime.of(2026, 1, 1, 0, 0);

    private final AiProviderConfigMapper configMapper;
    private final AiProviderEventMapper eventMapper;
    private final AiProviderManager aiProviderManager;

    @Value("${app.ai.monitoring.retention-days:30}")
    private int retentionDays = 30;

    @Value("${app.ai.monitoring.max-trend-points:24}")
    private int maxTrendPoints = 24;

    public AiProviderMonitoringDashboardResponse getDashboard(Integer hours, Long providerId) {
        int rangeHours = sanitizeRangeHours(hours);
        int trendBucketHours = resolveTrendBucketHours(rangeHours);
        LocalDateTime endTime = LocalDateTime.now();
        LocalDateTime startTime = endTime.minusHours(rangeHours);

        List<AiProviderConfig> configs = configMapper.selectAllOrdered();
        Map<Long, AiProviderMetricsAggregate> aggregateMap = new HashMap<>();
        for (AiProviderMetricsAggregate aggregate : eventMapper.aggregateByProvider(startTime, endTime)) {
            aggregateMap.put(aggregate.getProviderId(), aggregate);
        }

        List<AiProviderMonitoringDashboardResponse.ProviderHealthSnapshot> providers = configs.stream()
                .map(config -> toSnapshot(config, aggregateMap.get(config.getId())))
                .toList();
        List<AiProviderMonitoringDashboardResponse.RecentEvent> recentEvents = eventMapper.findRecentByTimeRange(
                        startTime,
                        endTime,
                        providerId,
                        MAX_RECENT_EVENTS
                ).stream()
                .map(this::toRecentEvent)
                .toList();
        List<AiProviderMonitoringDashboardResponse.TrendPoint> trendPoints = downsampleTrendPoints(
                eventMapper.aggregateTrend(startTime, endTime, providerId),
                trendBucketHours
        );

        long successCount = providers.stream().mapToLong(AiProviderMonitoringDashboardResponse.ProviderHealthSnapshot::getSuccessCount).sum();
        long failureCount = providers.stream().mapToLong(AiProviderMonitoringDashboardResponse.ProviderHealthSnapshot::getFailureCount).sum();
        long fallbackCount = providers.stream().mapToLong(AiProviderMonitoringDashboardResponse.ProviderHealthSnapshot::getFallbackCount).sum();

        return AiProviderMonitoringDashboardResponse.builder()
                .generatedAt(endTime)
                .rangeHours(rangeHours)
                .trendBucketHours(trendBucketHours)
                .retentionDays(retentionDays)
                .selectedProviderId(providerId)
                .summary(AiProviderMonitoringDashboardResponse.Summary.builder()
                        .totalProviders(configs.size())
                        .enabledProviders((int) configs.stream().filter(config -> Boolean.TRUE.equals(config.getEnabled())).count())
                        .availableProviders((int) configs.stream().filter(aiProviderManager::isConfigAvailable).count())
                        .healthyProviders((int) providers.stream().filter(provider -> "healthy".equals(provider.getHealthStatus())).count())
                        .degradedProviders((int) providers.stream().filter(provider ->
                                "degraded".equals(provider.getHealthStatus()) || "misconfigured".equals(provider.getHealthStatus())
                        ).count())
                        .totalChatRequests(successCount + failureCount)
                        .successCount(successCount)
                        .failureCount(failureCount)
                        .fallbackCount(fallbackCount)
                        .lastFallbackAt(providers.stream()
                                .map(AiProviderMonitoringDashboardResponse.ProviderHealthSnapshot::getLastFallbackAt)
                                .filter(java.util.Objects::nonNull)
                                .max(LocalDateTime::compareTo)
                                .orElse(null))
                        .build())
                .providers(providers)
                .recentEvents(recentEvents)
                .trendPoints(trendPoints)
                .build();
    }

    private AiProviderMonitoringDashboardResponse.ProviderHealthSnapshot toSnapshot(
            AiProviderConfig config,
            AiProviderMetricsAggregate aggregate
    ) {
        boolean available = aiProviderManager.isConfigAvailable(config);
        long successCount = aggregate != null ? aggregate.getSuccessCount() : 0;
        long failureCount = aggregate != null ? aggregate.getFailureCount() : 0;
        long testSuccessCount = aggregate != null ? aggregate.getTestSuccessCount() : 0;
        long testFailureCount = aggregate != null ? aggregate.getTestFailureCount() : 0;
        long fallbackCount = aggregate != null ? aggregate.getFallbackCount() : 0;

        return AiProviderMonitoringDashboardResponse.ProviderHealthSnapshot.builder()
                .id(config.getId())
                .name(config.getName())
                .providerType(config.getProviderType())
                .model(config.getModel())
                .enabled(Boolean.TRUE.equals(config.getEnabled()))
                .isPrimary(Boolean.TRUE.equals(config.getIsPrimary()))
                .available(available)
                .priority(config.getPriority())
                .healthStatus(resolveHealthStatus(config, available, aggregate))
                .successCount(successCount)
                .failureCount(failureCount)
                .testSuccessCount(testSuccessCount)
                .testFailureCount(testFailureCount)
                .fallbackCount(fallbackCount)
                .avgLatencyMs(aggregate != null && aggregate.getAvgLatencyMs() != null ? aggregate.getAvgLatencyMs() : 0L)
                .lastLatencyMs(aggregate != null ? aggregate.getLastLatencyMs() : null)
                .successRate(resolveSuccessRate(successCount, failureCount))
                .lastError(aggregate != null ? aggregate.getLastError() : null)
                .lastConnectionMessage(aggregate != null ? aggregate.getLastConnectionMessage() : null)
                .lastUsedAt(aggregate != null ? aggregate.getLastUsedAt() : null)
                .lastSuccessAt(aggregate != null ? aggregate.getLastSuccessAt() : null)
                .lastFailureAt(aggregate != null ? aggregate.getLastFailureAt() : null)
                .lastTestedAt(aggregate != null ? aggregate.getLastTestedAt() : null)
                .lastFallbackAt(aggregate != null ? aggregate.getLastFallbackAt() : null)
                .build();
    }

    private AiProviderMonitoringDashboardResponse.RecentEvent toRecentEvent(AiProviderEvent event) {
        return AiProviderMonitoringDashboardResponse.RecentEvent.builder()
                .eventType(event.getEventType())
                .providerId(event.getProviderId())
                .providerName(event.getProviderName())
                .providerType(event.getProviderType())
                .relatedProviderName(event.getRelatedProviderName())
                .success(Boolean.TRUE.equals(event.getSuccess()))
                .latencyMs(event.getLatencyMs())
                .message(event.getMessage())
                .occurredAt(event.getOccurredAt())
                .build();
    }

    private List<AiProviderMonitoringDashboardResponse.TrendPoint> downsampleTrendPoints(
            List<AiProviderTrendPoint> rawPoints,
            int bucketHours
    ) {
        if (rawPoints.isEmpty()) {
            return List.of();
        }

        Map<LocalDateTime, TrendBucketAccumulator> buckets = new HashMap<>();
        for (AiProviderTrendPoint point : rawPoints) {
            LocalDateTime bucketStart = resolveBucketStart(point.getMetricHour(), bucketHours);
            TrendBucketAccumulator accumulator = buckets.computeIfAbsent(bucketStart, ignored -> new TrendBucketAccumulator(bucketStart));
            accumulator.successCount += point.getSuccessCount();
            accumulator.failureCount += point.getFailureCount();
            accumulator.fallbackCount += point.getFallbackCount();
            if (point.getAvgLatencyMs() != null && point.getSuccessCount() > 0) {
                accumulator.latencyWeight += point.getSuccessCount();
                accumulator.weightedLatencySum += point.getAvgLatencyMs() * point.getSuccessCount();
            }
        }

        List<LocalDateTime> sortedBucketStarts = new ArrayList<>(buckets.keySet());
        sortedBucketStarts.sort(LocalDateTime::compareTo);

        List<AiProviderMonitoringDashboardResponse.TrendPoint> trendPoints = new ArrayList<>(sortedBucketStarts.size());
        for (LocalDateTime bucketStart : sortedBucketStarts) {
            TrendBucketAccumulator accumulator = buckets.get(bucketStart);
            trendPoints.add(AiProviderMonitoringDashboardResponse.TrendPoint.builder()
                    .metricHour(bucketStart)
                    .successCount(accumulator.successCount)
                    .failureCount(accumulator.failureCount)
                    .fallbackCount(accumulator.fallbackCount)
                    .avgLatencyMs(accumulator.latencyWeight > 0 ? accumulator.weightedLatencySum / accumulator.latencyWeight : null)
                    .build());
        }
        return trendPoints;
    }

    private Double resolveSuccessRate(long successCount, long failureCount) {
        long total = successCount + failureCount;
        if (total == 0) {
            return null;
        }
        return successCount * 100.0D / total;
    }

    private String resolveHealthStatus(AiProviderConfig config, boolean available, AiProviderMetricsAggregate aggregate) {
        if (!Boolean.TRUE.equals(config.getEnabled())) {
            return "disabled";
        }
        if (!available) {
            return "misconfigured";
        }
        if (aggregate == null) {
            return "idle";
        }
        if (aggregate.getLastFailureAt() != null
                && (aggregate.getLastSuccessAt() == null || aggregate.getLastFailureAt().isAfter(aggregate.getLastSuccessAt()))) {
            return "degraded";
        }
        Double successRate = resolveSuccessRate(aggregate.getSuccessCount(), aggregate.getFailureCount());
        if (successRate != null && aggregate.getSuccessCount() + aggregate.getFailureCount() >= 3 && successRate < 80D) {
            return "degraded";
        }
        if (aggregate.getTestFailureCount() > 0 && aggregate.getTestSuccessCount() == 0 && aggregate.getSuccessCount() == 0) {
            return "degraded";
        }
        return "healthy";
    }

    private int sanitizeRangeHours(Integer hours) {
        if (hours == null) {
            return DEFAULT_RANGE_HOURS;
        }
        if (hours <= 0) {
            return DEFAULT_RANGE_HOURS;
        }
        return Math.min(hours, 24 * 30);
    }

    private int resolveTrendBucketHours(int rangeHours) {
        int sanitizedMaxTrendPoints = Math.max(1, maxTrendPoints);
        int bucketHours = 1;
        while ((int) Math.ceil(rangeHours / (double) bucketHours) > sanitizedMaxTrendPoints) {
            bucketHours *= 2;
        }
        return Math.max(1, bucketHours);
    }

    private LocalDateTime resolveBucketStart(LocalDateTime metricHour, int bucketHours) {
        long hoursSinceOrigin = Duration.between(BUCKET_ORIGIN, metricHour).toHours();
        long bucketIndex = Math.floorDiv(hoursSinceOrigin, bucketHours);
        return BUCKET_ORIGIN.plusHours(bucketIndex * bucketHours);
    }

    private static final class TrendBucketAccumulator {
        private final LocalDateTime bucketStart;
        private long successCount;
        private long failureCount;
        private long fallbackCount;
        private double weightedLatencySum;
        private long latencyWeight;

        private TrendBucketAccumulator(LocalDateTime bucketStart) {
            this.bucketStart = bucketStart;
        }
    }
}
