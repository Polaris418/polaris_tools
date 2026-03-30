package com.polaris.ai.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * AI 提供商配置响应
 */
@Data
@Builder
public class AiProviderConfigResponse {

    private Long id;
    private String name;
    private String providerType;
    private String baseUrl;
    private String apiKey;
    private String model;
    private Boolean enabled;
    private Boolean isPrimary;
    private Integer priority;
    private Integer timeoutMs;
    private BigDecimal temperature;
    private BigDecimal topP;
    private Integer maxTokens;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private Boolean available;
}
