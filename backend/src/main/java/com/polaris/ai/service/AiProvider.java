package com.polaris.ai.service;

import com.polaris.ai.dto.AiChatRequest;
import com.polaris.ai.dto.AiChatResult;
import com.polaris.ai.dto.AiProviderConnectionTestResponse;
import com.polaris.ai.entity.AiProviderConfig;

/**
 * AI 提供商接口
 */
public interface AiProvider {

    String getProviderType();

    default boolean supports(String providerType) {
        return getProviderType().equalsIgnoreCase(providerType);
    }

    default boolean requiresBaseUrl() {
        return true;
    }

    AiChatResult chatCompletion(AiProviderConfig config, AiChatRequest request);

    AiProviderConnectionTestResponse testConnection(AiProviderConfig config);
}
