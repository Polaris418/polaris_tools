package com.polaris.ai.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * AI 使用额度结果
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiUsageLimitResult {

    private boolean authenticated;
    private Integer remainingCount;
    private Integer dailyLimit;
    private String quotaKey;
}
