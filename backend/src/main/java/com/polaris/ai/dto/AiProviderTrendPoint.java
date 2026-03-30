package com.polaris.ai.dto;

import lombok.Data;

import java.time.LocalDateTime;

/**
 * AI 提供商趋势点
 */
@Data
public class AiProviderTrendPoint {

    private LocalDateTime metricHour;
    private long successCount;
    private long failureCount;
    private long fallbackCount;
    private Double avgLatencyMs;
}
