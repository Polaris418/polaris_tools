package com.polaris.ai.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

/**
 * AI 聊天补全请求
 */
@Data
@Builder
public class AiChatRequest {

    private String model;
    private List<Message> messages;
    private BigDecimal temperature;
    private BigDecimal topP;
    private Integer maxTokens;
    private boolean stream;

    @Data
    @Builder
    public static class Message {
        private String role;
        private String content;
    }
}
