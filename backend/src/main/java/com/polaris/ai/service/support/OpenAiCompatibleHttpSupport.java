package com.polaris.ai.service.support;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.polaris.ai.dto.AiChatRequest;
import com.polaris.ai.dto.AiChatResult;
import com.polaris.ai.dto.AiProviderConnectionTestResponse;
import com.polaris.ai.entity.AiProviderConfig;
import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.io.IOException;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * OpenAI 兼容协议 HTTP 调用辅助类
 */
@Component
public class OpenAiCompatibleHttpSupport {

    private static final MediaType JSON = MediaType.parse("application/json");
    private static final int MAX_PARSE_ATTEMPTS = 2;

    private final ObjectMapper objectMapper = new ObjectMapper();

    public AiChatResult chatCompletion(AiProviderConfig config, AiChatRequest request, String providerType) {
        long start = System.currentTimeMillis();

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("model", request.getModel() != null ? request.getModel() : config.getModel());
        payload.put("messages", request.getMessages());
        payload.put("temperature", request.getTemperature() != null ? request.getTemperature() : config.getTemperature());
        payload.put("top_p", request.getTopP() != null ? request.getTopP() : config.getTopP());
        payload.put("max_tokens", request.getMaxTokens() != null ? request.getMaxTokens() : config.getMaxTokens());
        payload.put("stream", request.isStream());

        String content = execute(config, payload);
        return AiChatResult.builder()
                .content(content)
                .providerType(providerType)
                .providerName(config.getName())
                .model(config.getModel())
                .latencyMs(System.currentTimeMillis() - start)
                .build();
    }

    public AiProviderConnectionTestResponse testConnection(AiProviderConfig config, String providerType) {
        long start = System.currentTimeMillis();
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("model", config.getModel());
        payload.put("messages", java.util.List.of(Map.of("role", "user", "content", "Reply with OK")));
        payload.put("temperature", config.getTemperature());
        payload.put("top_p", config.getTopP());
        payload.put("max_tokens", Math.min(config.getMaxTokens(), 32));
        payload.put("stream", false);

        String content = execute(config, payload);
        return AiProviderConnectionTestResponse.builder()
                .success(true)
                .providerType(providerType)
                .providerName(config.getName())
                .latencyMs(System.currentTimeMillis() - start)
                .message("连接成功，模型返回：" + truncate(content))
                .build();
    }

    private String execute(AiProviderConfig config, Map<String, Object> payload) {
        OkHttpClient httpClient = new OkHttpClient.Builder()
                .callTimeout(Duration.ofMillis(config.getTimeoutMs()))
                .build();
        String requestBody;

        try {
            requestBody = objectMapper.writeValueAsString(payload);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("构造 AI 请求失败: " + e.getMessage(), e);
        }

        for (int attempt = 1; attempt <= MAX_PARSE_ATTEMPTS; attempt++) {
            try {
                Request request = new Request.Builder()
                        .url(resolveUrl(config.getBaseUrl()))
                        .post(RequestBody.create(requestBody, JSON))
                        .addHeader("Authorization", "Bearer " + config.getApiKeyEncrypted())
                        .addHeader("Content-Type", "application/json")
                        .build();

                try (Response response = httpClient.newCall(request).execute()) {
                    String responseBody = response.body() != null ? response.body().string() : "";
                    if (!response.isSuccessful()) {
                        throw new IllegalStateException("HTTP " + response.code() + ": " + truncate(responseBody, 400));
                    }

                    JsonNode root = objectMapper.readTree(responseBody);
                    return extractMessageContent(root);
                } catch (IllegalStateException ex) {
                    if (attempt >= MAX_PARSE_ATTEMPTS) {
                        throw new IllegalStateException("响应信息解析失败: " + ex.getMessage(), ex);
                    }
                }
            } catch (IOException e) {
                throw new IllegalStateException("调用 AI 提供商失败: " + e.getMessage(), e);
            }
        }

        throw new IllegalStateException("响应信息解析失败");
    }

    String extractMessageContent(JsonNode root) {
        JsonNode choice = root.path("choices").path(0);
        JsonNode message = choice.path("message");

        String content = extractPreferredContent(message, choice, root);
        if (StringUtils.hasText(content)) {
            return content;
        }

        throw new IllegalStateException(
                "响应中缺少可用的内容字段（content/reasoning_content/reasoning/text/output_text），响应片段: "
                        + truncate(root.toString(), 500)
        );
    }

    private String extractPreferredContent(JsonNode message, JsonNode choice, JsonNode root) {
        String content = extractTextNode(message.path("content"));
        if (StringUtils.hasText(content)) {
            return content;
        }

        String reasoningContent = extractTextNode(message.path("reasoning_content"));
        if (StringUtils.hasText(reasoningContent)) {
            return extractJsonCandidate(reasoningContent);
        }

        String reasoning = extractTextNode(message.path("reasoning"));
        if (StringUtils.hasText(reasoning)) {
            return extractJsonCandidate(reasoning);
        }

        String legacyText = extractTextNode(choice.path("text"));
        if (StringUtils.hasText(legacyText)) {
            return legacyText;
        }

        String rootOutputText = extractTextNode(root.path("output_text"));
        if (StringUtils.hasText(rootOutputText)) {
            return rootOutputText;
        }

        String rootContent = extractTextNode(root.path("content"));
        if (StringUtils.hasText(rootContent)) {
            return rootContent;
        }

        String rootMessageContent = extractTextNode(root.path("message").path("content"));
        if (StringUtils.hasText(rootMessageContent)) {
            return rootMessageContent;
        }

        return null;
    }

    private String extractTextNode(JsonNode node) {
        if (node.isMissingNode() || node.isNull()) {
            return null;
        }

        if (node.isTextual()) {
            return node.asText();
        }

        if (node.isArray()) {
            StringBuilder builder = new StringBuilder();
            for (JsonNode item : node) {
                if (item.isTextual()) {
                    builder.append(item.asText());
                    continue;
                }

                JsonNode textNode = item.path("text");
                if (textNode.isTextual()) {
                    builder.append(textNode.asText());
                }
            }
            return builder.toString();
        }

        return null;
    }

    private String extractJsonCandidate(String value) {
        String trimmed = value.trim();
        if (!StringUtils.hasText(trimmed)) {
            return trimmed;
        }

        if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
            return trimmed;
        }

        int objectStart = trimmed.indexOf('{');
        int objectEnd = trimmed.lastIndexOf('}');
        if (objectStart >= 0 && objectEnd > objectStart) {
            return trimmed.substring(objectStart, objectEnd + 1);
        }

        int arrayStart = trimmed.indexOf('[');
        int arrayEnd = trimmed.lastIndexOf(']');
        if (arrayStart >= 0 && arrayEnd > arrayStart) {
            return trimmed.substring(arrayStart, arrayEnd + 1);
        }

        return trimmed;
    }

    private String resolveUrl(String baseUrl) {
        if (baseUrl.endsWith("/chat/completions")) {
            return baseUrl;
        }
        if (baseUrl.endsWith("/")) {
            return baseUrl + "chat/completions";
        }
        return baseUrl + "/chat/completions";
    }

    private String truncate(String value) {
        return truncate(value, 64);
    }

    private String truncate(String value, int maxLength) {
        if (value == null) {
            return "";
        }
        return value.length() <= maxLength ? value : value.substring(0, maxLength) + "...";
    }
}
