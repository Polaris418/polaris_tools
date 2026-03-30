package com.polaris.ai;

import com.polaris.ai.dto.AiProviderConfigRequest;
import com.polaris.ai.dto.AiProviderConfigResponse;
import com.polaris.ai.entity.AiProviderConfig;
import com.polaris.ai.mapper.AiProviderConfigMapper;
import com.polaris.ai.service.AiProviderConfigService;
import com.polaris.ai.service.AiProviderManager;
import com.polaris.common.security.SecretCryptoService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("AI 提供商配置服务测试")
class AiProviderConfigServiceTest {

    private static final String NVIDIA_DEFAULT_BASE_URL = "https://integrate.api.nvidia.com/v1/chat/completions";

    @Mock
    private AiProviderConfigMapper mapper;

    @Mock
    private AiProviderManager aiProviderManager;

    private SecretCryptoService cryptoService;
    private AiProviderConfigService service;

    @BeforeEach
    void setUp() {
        cryptoService = new SecretCryptoService("this-is-a-very-secure-test-secret-key-123456", "");
        cryptoService.init();
        service = new AiProviderConfigService(mapper, cryptoService, aiProviderManager);
    }

    @Test
    @DisplayName("更新配置时若未填写 API Key 应保留原密钥")
    void shouldKeepExistingApiKeyWhenUpdateRequestOmitsIt() {
        AiProviderConfig existing = existingConfig();
        when(mapper.selectById(1L)).thenReturn(existing);
        when(mapper.countByNameExcludingId("NVIDIA 主用", 1L)).thenReturn(0);
        when(aiProviderManager.supportsProviderType("nvidia")).thenReturn(true);
        when(aiProviderManager.requiresBaseUrl("nvidia")).thenReturn(false);
        when(mapper.selectById(1L)).thenReturn(existing);

        AiProviderConfigRequest request = baseRequest();
        request.setBaseUrl("");
        request.setApiKey("");
        request.setIsPrimary(false);

        AiProviderConfigResponse response = service.update(1L, request);

        ArgumentCaptor<AiProviderConfig> captor = ArgumentCaptor.forClass(AiProviderConfig.class);
        verify(mapper).updateById(captor.capture());
        assertEquals(existing.getApiKeyEncrypted(), captor.getValue().getApiKeyEncrypted());
        assertEquals(NVIDIA_DEFAULT_BASE_URL, captor.getValue().getBaseUrl());
        assertEquals("old-secret", response.getApiKey());
    }

    @Test
    @DisplayName("NVIDIA 创建配置时省略接口地址应自动补默认地址")
    void shouldApplyDefaultBaseUrlForNvidiaProvider() {
        when(mapper.countByName("NVIDIA 主用")).thenReturn(0);
        when(aiProviderManager.supportsProviderType("nvidia")).thenReturn(true);
        when(aiProviderManager.requiresBaseUrl("nvidia")).thenReturn(false);
        doAnswer(invocation -> {
            AiProviderConfig created = invocation.getArgument(0);
            created.setId(2L);
            return 1;
        }).when(mapper).insert(any(AiProviderConfig.class));
        when(mapper.selectById(anyLong())).thenAnswer(invocation -> {
            AiProviderConfig created = new AiProviderConfig();
            created.setId(invocation.getArgument(0));
            created.setName("NVIDIA 主用");
            created.setProviderType("nvidia");
            created.setBaseUrl(NVIDIA_DEFAULT_BASE_URL);
            created.setApiKeyEncrypted(cryptoService.encrypt("secret-1"));
            created.setModel("openai/gpt-oss-20b");
            created.setEnabled(true);
            created.setIsPrimary(true);
            created.setPriority(1);
            created.setTimeoutMs(15000);
            created.setTemperature(BigDecimal.valueOf(0.1));
            created.setTopP(BigDecimal.ONE);
            created.setMaxTokens(1024);
            created.setDeleted(0);
            return created;
        });

        AiProviderConfigRequest request = baseRequest();
        request.setBaseUrl("");
        request.setApiKey("secret-1");
        request.setIsPrimary(false);

        AiProviderConfigResponse response = service.create(request);

        ArgumentCaptor<AiProviderConfig> captor = ArgumentCaptor.forClass(AiProviderConfig.class);
        verify(mapper).insert(captor.capture());
        assertEquals(NVIDIA_DEFAULT_BASE_URL, captor.getValue().getBaseUrl());
        assertEquals(NVIDIA_DEFAULT_BASE_URL, response.getBaseUrl());
        assertEquals("secret-1", response.getApiKey());
    }

    @Test
    @DisplayName("OpenAI 兼容提供商创建时必须填写接口地址")
    void shouldRequireBaseUrlForOpenAiCompatibleProvider() {
        when(mapper.countByName("兼容主用")).thenReturn(0);
        when(aiProviderManager.supportsProviderType("openai-compatible")).thenReturn(true);
        when(aiProviderManager.requiresBaseUrl("openai-compatible")).thenReturn(true);

        AiProviderConfigRequest request = baseRequest();
        request.setName("兼容主用");
        request.setProviderType("openai-compatible");
        request.setBaseUrl("");

        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class, () -> service.create(request));

        assertEquals("当前 AI 提供商必须配置接口地址", exception.getMessage());
    }

    private AiProviderConfig existingConfig() {
        AiProviderConfig config = new AiProviderConfig();
        config.setId(1L);
        config.setName("NVIDIA 主用");
        config.setProviderType("nvidia");
        config.setBaseUrl("https://integrate.api.nvidia.com/v1/chat/completions");
        config.setApiKeyEncrypted(cryptoService.encrypt("old-secret"));
        config.setModel("openai/gpt-oss-20b");
        config.setEnabled(true);
        config.setIsPrimary(true);
        config.setPriority(1);
        config.setTimeoutMs(15000);
        config.setTemperature(BigDecimal.valueOf(0.1));
        config.setTopP(BigDecimal.ONE);
        config.setMaxTokens(1024);
        config.setDeleted(0);
        return config;
    }

    private AiProviderConfigRequest baseRequest() {
        AiProviderConfigRequest request = new AiProviderConfigRequest();
        request.setName("NVIDIA 主用");
        request.setProviderType("nvidia");
        request.setBaseUrl("https://integrate.api.nvidia.com/v1/chat/completions");
        request.setApiKey("secret-1");
        request.setModel("openai/gpt-oss-20b");
        request.setEnabled(true);
        request.setIsPrimary(true);
        request.setPriority(1);
        request.setTimeoutMs(15000);
        request.setTemperature(BigDecimal.valueOf(0.1));
        request.setTopP(BigDecimal.ONE);
        request.setMaxTokens(1024);
        return request;
    }
}
