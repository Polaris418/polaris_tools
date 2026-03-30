package com.polaris.ai.service;

import com.polaris.ai.dto.AiProviderConfigRequest;
import com.polaris.ai.dto.AiProviderConfigResponse;
import com.polaris.ai.dto.AiProviderConnectionTestResponse;
import com.polaris.ai.entity.AiProviderConfig;
import com.polaris.ai.mapper.AiProviderConfigMapper;
import com.polaris.common.security.SecretCryptoService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.List;

/**
 * AI 提供商配置服务
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AiProviderConfigService {

    private static final String NVIDIA_DEFAULT_BASE_URL = "https://integrate.api.nvidia.com/v1/chat/completions";

    private final AiProviderConfigMapper mapper;
    private final SecretCryptoService secretCryptoService;
    private final AiProviderManager aiProviderManager;

    public List<AiProviderConfigResponse> listAll() {
        return mapper.selectAllOrdered().stream()
                .map(config -> toResponse(config, false))
                .toList();
    }

    public AiProviderConfigResponse getById(Long id) {
        AiProviderConfig config = requireConfig(id);
        return toResponse(config, true);
    }

    @Transactional
    public AiProviderConfigResponse create(AiProviderConfigRequest request) {
        String providerType = normalizeProviderType(request.getProviderType());
        validateProviderType(providerType);
        validateNameUniqueness(request.getName(), null);
        validateProviderRequirements(request, providerType, null, true);

        AiProviderConfig config = new AiProviderConfig();
        applyRequest(config, request);
        mapper.insert(config);

        if (Boolean.TRUE.equals(config.getIsPrimary())) {
            setPrimary(config.getId());
        }

        return getById(config.getId());
    }

    @Transactional
    public AiProviderConfigResponse update(Long id, AiProviderConfigRequest request) {
        AiProviderConfig config = requireConfig(id);
        String providerType = normalizeProviderType(request.getProviderType());
        validateProviderType(providerType);
        validateNameUniqueness(request.getName(), id);
        validateProviderRequirements(request, providerType, config, false);
        applyRequest(config, request);
        mapper.updateById(config);

        if (Boolean.TRUE.equals(config.getIsPrimary())) {
            setPrimary(config.getId());
        }

        return getById(id);
    }

    @Transactional
    public AiProviderConfigResponse updateEnabled(Long id, boolean enabled) {
        AiProviderConfig config = requireConfig(id);
        config.setEnabled(enabled);
        mapper.updateById(config);
        return getById(id);
    }

    @Transactional
    public AiProviderConfigResponse setPrimary(Long id) {
        AiProviderConfig config = requireConfig(id);
        mapper.clearPrimaryFlag();
        config.setIsPrimary(true);
        mapper.updateById(config);
        return getById(id);
    }

    public AiProviderConnectionTestResponse testConnection(Long id) {
        return aiProviderManager.testConnection(requireConfig(id));
    }

    private AiProviderConfig requireConfig(Long id) {
        AiProviderConfig config = mapper.selectById(id);
        if (config == null || Integer.valueOf(1).equals(config.getDeleted())) {
            throw new IllegalArgumentException("AI 提供商配置不存在");
        }
        return config;
    }

    private void validateProviderType(String providerType) {
        if (!aiProviderManager.supportsProviderType(providerType)) {
            throw new IllegalArgumentException("不支持的 AI 提供商类型: " + providerType);
        }
    }

    private void validateProviderRequirements(
            AiProviderConfigRequest request,
            String providerType,
            AiProviderConfig existingConfig,
            boolean creating
    ) {
        String baseUrl = normalizeNullable(request.getBaseUrl());
        if (aiProviderManager.requiresBaseUrl(providerType) && !StringUtils.hasText(baseUrl)) {
            throw new IllegalArgumentException("当前 AI 提供商必须配置接口地址");
        }

        String apiKey = normalizeNullable(request.getApiKey());
        if (creating && !StringUtils.hasText(apiKey)) {
            throw new IllegalArgumentException("创建 AI 提供商时必须填写 API Key");
        }

        if (!creating && !StringUtils.hasText(apiKey) && existingConfig != null && !StringUtils.hasText(existingConfig.getApiKeyEncrypted())) {
            throw new IllegalArgumentException("当前 AI 提供商尚未配置 API Key，请先补充后再保存");
        }
    }

    private void validateNameUniqueness(String name, Long excludeId) {
        int count = excludeId == null
                ? mapper.countByName(name)
                : mapper.countByNameExcludingId(name, excludeId);
        if (count > 0) {
            throw new IllegalArgumentException("配置名称已存在");
        }
    }

    private void applyRequest(AiProviderConfig config, AiProviderConfigRequest request) {
        String providerType = normalizeProviderType(request.getProviderType());
        config.setName(request.getName().trim());
        config.setProviderType(providerType);
        config.setBaseUrl(resolveBaseUrl(providerType, request.getBaseUrl()));
        String apiKey = normalizeNullable(request.getApiKey());
        if (StringUtils.hasText(apiKey)) {
            config.setApiKeyEncrypted(secretCryptoService.encrypt(apiKey));
        }
        config.setModel(request.getModel().trim());
        config.setEnabled(request.getEnabled());
        config.setIsPrimary(request.getIsPrimary());
        config.setPriority(request.getPriority());
        config.setTimeoutMs(request.getTimeoutMs());
        config.setTemperature(request.getTemperature());
        config.setTopP(request.getTopP());
        config.setMaxTokens(request.getMaxTokens());
    }

    private AiProviderConfigResponse toResponse(AiProviderConfig config, boolean includeSecret) {
        return AiProviderConfigResponse.builder()
                .id(config.getId())
                .name(config.getName())
                .providerType(config.getProviderType())
                .baseUrl(config.getBaseUrl())
                .apiKey(includeSecret ? secretCryptoService.decrypt(config.getApiKeyEncrypted()) : null)
                .model(config.getModel())
                .enabled(config.getEnabled())
                .isPrimary(config.getIsPrimary())
                .priority(config.getPriority())
                .timeoutMs(config.getTimeoutMs())
                .temperature(config.getTemperature())
                .topP(config.getTopP())
                .maxTokens(config.getMaxTokens())
                .createdAt(config.getCreatedAt())
                .updatedAt(config.getUpdatedAt())
                .available(aiProviderManager.isConfigAvailable(config))
                .build();
    }

    private String normalizeProviderType(String providerType) {
        return providerType == null ? "" : providerType.trim().toLowerCase();
    }

    private String normalizeNullable(String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }
        return value.trim();
    }

    private String resolveBaseUrl(String providerType, String rawBaseUrl) {
        String normalizedBaseUrl = normalizeNullable(rawBaseUrl);
        if (StringUtils.hasText(normalizedBaseUrl)) {
            return normalizedBaseUrl;
        }

        if ("nvidia".equals(providerType)) {
            return NVIDIA_DEFAULT_BASE_URL;
        }

        return null;
    }
}
