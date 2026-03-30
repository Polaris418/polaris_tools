package com.polaris.ai.dto;

import lombok.Data;

import java.time.LocalDateTime;

/**
 * AI 提供商聚合指标
 */
@Data
public class AiProviderMetricsAggregate {

    private Long providerId;
    private String providerName;
    private String providerType;
    private long successCount;
    private long failureCount;
    private long testSuccessCount;
    private long testFailureCount;
    private long fallbackCount;
    private Long avgLatencyMs;
    private Long lastLatencyMs;
    private String lastError;
    private String lastConnectionMessage;
    private LocalDateTime lastUsedAt;
    private LocalDateTime lastSuccessAt;
    private LocalDateTime lastFailureAt;
    private LocalDateTime lastTestedAt;
    private LocalDateTime lastFallbackAt;
}
