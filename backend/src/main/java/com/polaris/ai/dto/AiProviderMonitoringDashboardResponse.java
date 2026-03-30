package com.polaris.ai.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

/**
 * AI 提供商监控仪表板响应
 */
@Data
@Builder
public class AiProviderMonitoringDashboardResponse {

    private LocalDateTime generatedAt;
    private Integer rangeHours;
    private Integer trendBucketHours;
    private Integer retentionDays;
    private Long selectedProviderId;
    private Summary summary;
    private List<ProviderHealthSnapshot> providers;
    private List<RecentEvent> recentEvents;
    private List<TrendPoint> trendPoints;

    @Data
    @Builder
    public static class Summary {
        private int totalProviders;
        private int enabledProviders;
        private int availableProviders;
        private int healthyProviders;
        private int degradedProviders;
        private long totalChatRequests;
        private long successCount;
        private long failureCount;
        private long fallbackCount;
        private LocalDateTime lastFallbackAt;
    }

    @Data
    @Builder
    public static class ProviderHealthSnapshot {
        private Long id;
        private String name;
        private String providerType;
        private String model;
        private boolean enabled;
        private boolean isPrimary;
        private boolean available;
        private Integer priority;
        private String healthStatus;
        private long successCount;
        private long failureCount;
        private long testSuccessCount;
        private long testFailureCount;
        private long fallbackCount;
        private long avgLatencyMs;
        private Long lastLatencyMs;
        private Double successRate;
        private String lastError;
        private String lastConnectionMessage;
        private LocalDateTime lastUsedAt;
        private LocalDateTime lastSuccessAt;
        private LocalDateTime lastFailureAt;
        private LocalDateTime lastTestedAt;
        private LocalDateTime lastFallbackAt;
    }

    @Data
    @Builder
    public static class RecentEvent {
        private String eventType;
        private Long providerId;
        private String providerName;
        private String providerType;
        private String relatedProviderName;
        private boolean success;
        private Long latencyMs;
        private String message;
        private LocalDateTime occurredAt;
    }

    @Data
    @Builder
    public static class TrendPoint {
        private LocalDateTime metricHour;
        private long successCount;
        private long failureCount;
        private long fallbackCount;
        private Double avgLatencyMs;
    }
}
