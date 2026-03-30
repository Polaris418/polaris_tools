package com.polaris.ai.service.impl;

import com.polaris.ai.dto.AiChatRequest;
import com.polaris.ai.dto.AiChatResult;
import com.polaris.ai.dto.AiProviderConnectionTestResponse;
import com.polaris.ai.entity.AiProviderConfig;
import com.polaris.ai.service.AiProvider;
import com.polaris.ai.service.support.OpenAiCompatibleHttpSupport;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/**
 * OpenAI 兼容协议 AI 提供商
 */
@Service
@RequiredArgsConstructor
public class OpenAiCompatibleAiProvider implements AiProvider {

    private final OpenAiCompatibleHttpSupport httpSupport;

    @Override
    public String getProviderType() {
        return "openai-compatible";
    }

    @Override
    public AiChatResult chatCompletion(AiProviderConfig config, AiChatRequest request) {
        return httpSupport.chatCompletion(config, request, getProviderType());
    }

    @Override
    public AiProviderConnectionTestResponse testConnection(AiProviderConfig config) {
        return httpSupport.testConnection(config, getProviderType());
    }
}
