package com.polaris.ai.service.impl;

import com.polaris.ai.dto.AiChatRequest;
import com.polaris.ai.dto.AiChatResult;
import com.polaris.ai.dto.AiProviderConnectionTestResponse;
import com.polaris.ai.entity.AiProviderConfig;
import com.polaris.ai.service.AiProvider;
import com.polaris.ai.service.support.OpenAiCompatibleHttpSupport;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

/**
 * NVIDIA 集成 API 提供商
 */
@Service
@RequiredArgsConstructor
public class NvidiaAiProvider implements AiProvider {

    private static final String DEFAULT_URL = "https://integrate.api.nvidia.com/v1/chat/completions";

    private final OpenAiCompatibleHttpSupport httpSupport;

    @Override
    public String getProviderType() {
        return "nvidia";
    }

    @Override
    public boolean requiresBaseUrl() {
        return false;
    }

    @Override
    public AiChatResult chatCompletion(AiProviderConfig config, AiChatRequest request) {
        return httpSupport.chatCompletion(withDefaultUrl(config), request, getProviderType());
    }

    @Override
    public AiProviderConnectionTestResponse testConnection(AiProviderConfig config) {
        return httpSupport.testConnection(withDefaultUrl(config), getProviderType());
    }

    private AiProviderConfig withDefaultUrl(AiProviderConfig config) {
        if (StringUtils.hasText(config.getBaseUrl())) {
            return config;
        }

        AiProviderConfig effectiveConfig = new AiProviderConfig();
        effectiveConfig.setId(config.getId());
        effectiveConfig.setName(config.getName());
        effectiveConfig.setProviderType(config.getProviderType());
        effectiveConfig.setBaseUrl(DEFAULT_URL);
        effectiveConfig.setApiKeyEncrypted(config.getApiKeyEncrypted());
        effectiveConfig.setModel(config.getModel());
        effectiveConfig.setEnabled(config.getEnabled());
        effectiveConfig.setIsPrimary(config.getIsPrimary());
        effectiveConfig.setPriority(config.getPriority());
        effectiveConfig.setTimeoutMs(config.getTimeoutMs());
        effectiveConfig.setTemperature(config.getTemperature());
        effectiveConfig.setTopP(config.getTopP());
        effectiveConfig.setMaxTokens(config.getMaxTokens());
        return effectiveConfig;
    }
}
