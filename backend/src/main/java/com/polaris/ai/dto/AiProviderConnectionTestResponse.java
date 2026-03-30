package com.polaris.ai.dto;

import lombok.Builder;
import lombok.Data;

/**
 * AI 提供商连通性测试响应
 */
@Data
@Builder
public class AiProviderConnectionTestResponse {

    private boolean success;
    private String providerType;
    private String providerName;
    private long latencyMs;
    private String message;
}
