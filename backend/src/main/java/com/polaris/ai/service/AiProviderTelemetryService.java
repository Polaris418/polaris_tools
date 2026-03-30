package com.polaris.ai.service;

import com.polaris.ai.dto.AiChatResult;
import com.polaris.ai.dto.AiProviderConnectionTestResponse;
import com.polaris.ai.entity.AiProviderConfig;
import com.polaris.ai.entity.AiProviderEvent;
import com.polaris.ai.mapper.AiProviderEventMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;

/**
 * AI 提供商运行时遥测服务
 */
@Service
@RequiredArgsConstructor
public class AiProviderTelemetryService {

    private final AiProviderEventMapper aiProviderEventMapper;

    public void recordChatSuccess(AiProviderConfig config, AiChatResult result) {
        insertEvent(config, null, "chat_success", true, result.getLatencyMs(), "格式解析调用成功");
    }

    public void recordChatFailure(AiProviderConfig config, String errorMessage) {
        insertEvent(config, null, "chat_failure", false, null, errorMessage);
    }

    public void recordFallback(AiProviderConfig fromConfig, AiProviderConfig toConfig, String reason) {
        insertEvent(toConfig, fromConfig, "fallback", true, null, reason);
    }

    public void recordConnectionTestSuccess(AiProviderConfig config, AiProviderConnectionTestResponse response) {
        insertEvent(config, null, "test_success", true, response.getLatencyMs(), response.getMessage());
    }

    public void recordConnectionTestFailure(AiProviderConfig config, String errorMessage) {
        insertEvent(config, null, "test_failure", false, null, errorMessage);
    }

    private void insertEvent(
            AiProviderConfig config,
            AiProviderConfig relatedConfig,
            String eventType,
            boolean success,
            Long latencyMs,
            String message
    ) {
        LocalDateTime now = LocalDateTime.now();
        AiProviderEvent event = new AiProviderEvent();
        event.setProviderId(config.getId());
        event.setProviderName(config.getName());
        event.setProviderType(config.getProviderType());
        if (relatedConfig != null) {
            event.setRelatedProviderId(relatedConfig.getId());
            event.setRelatedProviderName(relatedConfig.getName());
        }
        event.setEventType(eventType);
        event.setSuccess(success);
        event.setLatencyMs(latencyMs);
        event.setMessage(message);
        event.setOccurredAt(now);
        event.setMetricHour(now.truncatedTo(ChronoUnit.HOURS));
        aiProviderEventMapper.insert(event);
    }
}
