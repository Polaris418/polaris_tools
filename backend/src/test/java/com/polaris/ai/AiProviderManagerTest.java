package com.polaris.ai;

import com.polaris.ai.dto.AiChatRequest;
import com.polaris.ai.dto.AiChatResult;
import com.polaris.ai.entity.AiProviderConfig;
import com.polaris.ai.mapper.AiProviderConfigMapper;
import com.polaris.ai.service.AiProvider;
import com.polaris.ai.service.AiProviderManager;
import com.polaris.ai.service.AiProviderTelemetryService;
import com.polaris.common.security.SecretCryptoService;
import com.polaris.common.exception.BusinessException;
import com.polaris.common.exception.ErrorCode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("AI 提供商管理器测试")
class AiProviderManagerTest {

    @Mock
    private AiProviderConfigMapper mapper;

    @Mock
    private AiProvider nvidiaProvider;

    @Mock
    private AiProvider openAiCompatibleProvider;

    @Mock
    private AiProviderTelemetryService aiProviderTelemetryService;

    private SecretCryptoService cryptoService;
    private AiProviderManager manager;

    @BeforeEach
    void setUp() {
        cryptoService = new SecretCryptoService("this-is-a-very-secure-test-secret-key-123456", "");
        cryptoService.init();
        manager = new AiProviderManager(mapper, List.of(nvidiaProvider, openAiCompatibleProvider), cryptoService, aiProviderTelemetryService);
    }

    @Test
    @DisplayName("主用提供商可用时应优先命中主用")
    void shouldUsePrimaryProviderFirst() {
        AiProviderConfig primary = createConfig(1L, "主用 NVIDIA", "nvidia", true, true, 1);
        when(nvidiaProvider.supports("nvidia")).thenReturn(true);
        when(mapper.selectActiveOrdered()).thenReturn(List.of(primary));
        when(nvidiaProvider.chatCompletion(any(), any())).thenReturn(
                AiChatResult.builder().content("ok").providerName("主用 NVIDIA").providerType("nvidia").build()
        );

        AiChatResult result = manager.chatCompletion(simpleRequest());

        assertEquals("ok", result.getContent());
        assertEquals("主用 NVIDIA", result.getProviderName());
        verify(aiProviderTelemetryService).recordChatSuccess(primary, result);
    }

    @Test
    @DisplayName("主用超时时应自动降级到备用提供商")
    void shouldFallbackWhenPrimaryTimesOut() {
        AiProviderConfig primary = createConfig(1L, "主用 NVIDIA", "nvidia", true, true, 1);
        AiProviderConfig backup = createConfig(2L, "备用兼容", "openai-compatible", true, false, 2);
        when(nvidiaProvider.supports("nvidia")).thenReturn(true);
        when(nvidiaProvider.supports("openai-compatible")).thenReturn(false);
        when(openAiCompatibleProvider.supports("openai-compatible")).thenReturn(true);
        when(mapper.selectActiveOrdered()).thenReturn(List.of(primary, backup));
        when(nvidiaProvider.chatCompletion(any(), any())).thenThrow(new IllegalStateException("timeout"));
        when(openAiCompatibleProvider.chatCompletion(any(), any())).thenReturn(
                AiChatResult.builder().content("fallback-ok").providerName("备用兼容").providerType("openai-compatible").build()
        );

        AiChatResult result = manager.chatCompletion(simpleRequest());

        assertEquals("fallback-ok", result.getContent());
        assertEquals("备用兼容", result.getProviderName());
        verify(aiProviderTelemetryService).recordChatFailure(primary, "timeout");
        verify(aiProviderTelemetryService).recordFallback(primary, backup, "timeout");
        verify(aiProviderTelemetryService).recordChatSuccess(backup, result);
    }

    @Test
    @DisplayName("主用返回脏结果时应自动降级到备用提供商")
    void shouldFallbackWhenPrimaryReturnsInvalidResponse() {
        AiProviderConfig primary = createConfig(1L, "主用 NVIDIA", "nvidia", true, true, 1);
        AiProviderConfig backup = createConfig(2L, "备用兼容", "openai-compatible", true, false, 2);
        when(nvidiaProvider.supports("nvidia")).thenReturn(true);
        when(nvidiaProvider.supports("openai-compatible")).thenReturn(false);
        when(openAiCompatibleProvider.supports("openai-compatible")).thenReturn(true);
        when(mapper.selectActiveOrdered()).thenReturn(List.of(primary, backup));
        when(nvidiaProvider.chatCompletion(any(), any())).thenReturn(
                AiChatResult.builder().content("dirty-json").providerName("主用 NVIDIA").providerType("nvidia").build()
        );
        when(openAiCompatibleProvider.chatCompletion(any(), any())).thenReturn(
                AiChatResult.builder().content("fallback-ok").providerName("备用兼容").providerType("openai-compatible").build()
        );

        String result = manager.executeWithFallback(simpleRequest(), aiChatResult -> {
            if ("dirty-json".equals(aiChatResult.getContent())) {
                throw new BusinessException(ErrorCode.AI_FORMAT_INVALID_RESPONSE);
            }
            return aiChatResult.getContent();
        });

        assertEquals("fallback-ok", result);
        verify(aiProviderTelemetryService).recordChatFailure(primary, ErrorCode.AI_FORMAT_INVALID_RESPONSE.getMessage());
        verify(aiProviderTelemetryService).recordFallback(primary, backup, ErrorCode.AI_FORMAT_INVALID_RESPONSE.getMessage());
    }

    @Test
    @DisplayName("主用出现不可降级错误时不应切换到备用提供商")
    void shouldNotFallbackWhenPrimaryFailsWithNonRetryableError() {
        AiProviderConfig primary = createConfig(1L, "主用 NVIDIA", "nvidia", true, true, 1);
        AiProviderConfig backup = createConfig(2L, "备用兼容", "openai-compatible", true, false, 2);
        when(nvidiaProvider.supports("nvidia")).thenReturn(true);
        when(mapper.selectActiveOrdered()).thenReturn(List.of(primary, backup));
        when(nvidiaProvider.chatCompletion(any(), any())).thenThrow(new IllegalStateException("HTTP 401: invalid api key"));

        assertThrows(IllegalStateException.class, () -> manager.chatCompletion(simpleRequest()));
        verify(aiProviderTelemetryService).recordChatFailure(primary, "HTTP 401: invalid api key");
        verify(aiProviderTelemetryService, never()).recordFallback(eq(primary), eq(backup), any());
        verify(openAiCompatibleProvider, never()).chatCompletion(any(), any());
    }

    @Test
    @DisplayName("全部提供商都因可降级错误失败时应抛出异常")
    void shouldThrowWhenAllProvidersFail() {
        AiProviderConfig primary = createConfig(1L, "主用 NVIDIA", "nvidia", true, true, 1);
        AiProviderConfig backup = createConfig(2L, "备用兼容", "openai-compatible", true, false, 2);
        when(nvidiaProvider.supports("nvidia")).thenReturn(true);
        when(nvidiaProvider.supports("openai-compatible")).thenReturn(false);
        when(openAiCompatibleProvider.supports("openai-compatible")).thenReturn(true);
        when(mapper.selectActiveOrdered()).thenReturn(List.of(primary, backup));
        when(nvidiaProvider.chatCompletion(any(), any())).thenThrow(new IllegalStateException("timeout"));
        when(openAiCompatibleProvider.chatCompletion(any(), any())).thenThrow(new IllegalStateException("rate limit"));

        assertThrows(IllegalStateException.class, () -> manager.chatCompletion(simpleRequest()));
        verify(aiProviderTelemetryService).recordChatFailure(primary, "timeout");
        verify(aiProviderTelemetryService).recordChatFailure(backup, "rate limit");
    }

    private AiProviderConfig createConfig(Long id, String name, String providerType, boolean enabled, boolean primary, int priority) {
        AiProviderConfig config = new AiProviderConfig();
        config.setId(id);
        config.setName(name);
        config.setProviderType(providerType);
        config.setBaseUrl("https://example.com/v1");
        config.setApiKeyEncrypted(cryptoService.encrypt("secret-" + id));
        config.setModel("openai/gpt-oss-20b");
        config.setEnabled(enabled);
        config.setIsPrimary(primary);
        config.setPriority(priority);
        config.setTimeoutMs(15000);
        config.setTemperature(BigDecimal.valueOf(0.1));
        config.setTopP(BigDecimal.ONE);
        config.setMaxTokens(1024);
        return config;
    }

    private AiChatRequest simpleRequest() {
        return AiChatRequest.builder()
                .model("openai/gpt-oss-20b")
                .temperature(BigDecimal.valueOf(0.1))
                .topP(BigDecimal.ONE)
                .maxTokens(256)
                .stream(false)
                .messages(List.of(
                        AiChatRequest.Message.builder()
                                .role("user")
                                .content("Reply with OK")
                                .build()
                ))
                .build();
    }
}
