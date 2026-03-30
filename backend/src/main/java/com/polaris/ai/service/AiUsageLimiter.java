package com.polaris.ai.service;

import com.polaris.ai.dto.AiUsageLimitResult;

/**
 * AI 使用额度限制器
 */
public interface AiUsageLimiter {

    AiUsageLimitResult consumeFormattingQuota(Long userId, String guestId, String ipAddress);
}
