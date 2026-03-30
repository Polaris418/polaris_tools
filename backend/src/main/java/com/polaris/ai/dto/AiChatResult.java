package com.polaris.ai.dto;

import lombok.Builder;
import lombok.Data;

/**
 * AI 聊天补全结果
 */
@Data
@Builder
public class AiChatResult {

    private String content;
    private String providerType;
    private String providerName;
    private String model;
    private long latencyMs;
}
