package com.polaris.ai.service;

import com.polaris.ai.dto.AiChatRequest;
import com.polaris.ai.dto.AiChatResult;
import com.polaris.ai.dto.AiProviderConnectionTestResponse;
import com.polaris.ai.entity.AiProviderConfig;
import com.polaris.ai.mapper.AiProviderConfigMapper;
import com.polaris.common.security.SecretCryptoService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.function.Function;

/**
 * AI 提供商管理器
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AiProviderManager {

    private final AiProviderConfigMapper mapper;
    private final List<AiProvider> providers;
    private final SecretCryptoService secretCryptoService;
    private final AiProviderTelemetryService aiProviderTelemetryService;

    public boolean supportsProviderType(String providerType) {
        return providers.stream().anyMatch(provider -> provider.supports(providerType));
    }

    public boolean requiresBaseUrl(String providerType) {
        AiProvider provider = getRequiredProvider(providerType);
        return provider.requiresBaseUrl();
    }

    public boolean isConfigAvailable(AiProviderConfig config) {
        return config != null
                && Boolean.TRUE.equals(config.getEnabled())
                && StringUtils.hasText(config.getApiKeyEncrypted())
                && getProvider(config.getProviderType()) != null;
    }

    public AiProviderConnectionTestResponse testConnection(AiProviderConfig config) {
        AiProvider provider = getRequiredProvider(config.getProviderType());
        AiProviderConfig decryptedConfig = withDecryptedSecret(config);
        try {
            AiProviderConnectionTestResponse response = provider.testConnection(decryptedConfig);
            aiProviderTelemetryService.recordConnectionTestSuccess(config, response);
            return response;
        } catch (Exception ex) {
            aiProviderTelemetryService.recordConnectionTestFailure(config, ex.getMessage());
            throw ex;
        }
    }

    public AiChatResult chatCompletion(AiChatRequest request) {
        return executeWithFallback(request, Function.identity());
    }

    public <T> T executeWithFallback(AiChatRequest request, Function<AiChatResult, T> processor) {
        List<AiProviderConfig> configs = mapper.selectActiveOrdered();
        List<String> failures = new ArrayList<>();
        AiProviderConfig previousFailedConfig = null;
        String previousFailureReason = null;

        for (AiProviderConfig config : configs) {
            if (!isConfigAvailable(config)) {
                continue;
            }

            if (previousFailedConfig != null) {
                aiProviderTelemetryService.recordFallback(previousFailedConfig, config, previousFailureReason);
            }

            AiProvider provider = getRequiredProvider(config.getProviderType());
            Exception finalFailure = null;

            for (int attempt = 1; attempt <= 2; attempt++) {
                try {
                    log.info("尝试使用 AI 提供商: name={}, type={}, priority={}, attempt={}",
                            config.getName(),
                            config.getProviderType(),
                            config.getPriority(),
                            attempt);
                    AiChatResult result = provider.chatCompletion(withDecryptedSecret(config), request);
                    T processedResult = processor.apply(result);
                    aiProviderTelemetryService.recordChatSuccess(config, result);
                    return processedResult;
                } catch (Exception ex) {
                    finalFailure = ex;
                    if (isRetryableFailoverFailure(ex) && attempt < 2) {
                        log.warn("AI 提供商出现可重试错误，将重试当前提供商: name={}, reason={}", config.getName(), summarizeFailure(ex));
                        continue;
                    }
                    break;
                }
            }

            String failureMessage = summarizeFailure(finalFailure);
            aiProviderTelemetryService.recordChatFailure(config, failureMessage);
            failures.add(config.getName() + ": " + failureMessage);

            if (!isRetryableFailoverFailure(finalFailure)) {
                throw new IllegalStateException("AI 提供商返回了不可降级错误: " + failureMessage, finalFailure);
            }

            log.warn("AI 提供商调用失败，将尝试下一个提供商: name={}, reason={}", config.getName(), failureMessage);
            previousFailedConfig = config;
            previousFailureReason = failureMessage;
        }

        throw new IllegalStateException("没有可用的 AI 提供商，失败详情: " + String.join(" | ", failures));
    }

    private AiProvider getRequiredProvider(String providerType) {
        AiProvider provider = getProvider(providerType);
        if (provider == null) {
            throw new IllegalArgumentException("未找到 AI 提供商实现: " + providerType);
        }
        return provider;
    }

    private AiProvider getProvider(String providerType) {
        return providers.stream()
                .filter(provider -> provider.supports(providerType))
                .findFirst()
                .orElse(null);
    }

    private AiProviderConfig withDecryptedSecret(AiProviderConfig config) {
        AiProviderConfig cloned = new AiProviderConfig();
        cloned.setId(config.getId());
        cloned.setName(config.getName());
        cloned.setProviderType(config.getProviderType());
        cloned.setBaseUrl(config.getBaseUrl());
        cloned.setApiKeyEncrypted(secretCryptoService.decrypt(config.getApiKeyEncrypted()));
        cloned.setModel(config.getModel());
        cloned.setEnabled(config.getEnabled());
        cloned.setIsPrimary(config.getIsPrimary());
        cloned.setPriority(config.getPriority());
        cloned.setTimeoutMs(config.getTimeoutMs());
        cloned.setTemperature(config.getTemperature());
        cloned.setTopP(config.getTopP());
        cloned.setMaxTokens(config.getMaxTokens());
        return cloned;
    }

    private boolean isRetryableFailoverFailure(Throwable throwable) {
        if (throwable == null) {
            return false;
        }

        String failure = summarizeFailure(throwable).toLowerCase(Locale.ROOT);
        return failure.contains("timeout")
                || failure.contains("timed out")
                || failure.contains("超时")
                || failure.contains("无效的格式结果")
                || failure.contains("invalid response")
                || failure.contains("缺少可用的内容字段")
                || failure.contains("响应信息解析失败");
    }

    private String summarizeFailure(Throwable throwable) {
        if (throwable == null) {
            return "unknown failure";
        }

        String message = throwable.getMessage();
        if (StringUtils.hasText(message)) {
            return message;
        }

        return throwable.getClass().getSimpleName();
    }
}
