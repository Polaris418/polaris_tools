package com.polaris.ai.service;

import com.polaris.ai.mapper.AiProviderEventMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

/**
 * AI 提供商监控事件保留服务
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AiProviderEventRetentionService {

    private final AiProviderEventMapper eventMapper;

    @Value("${app.ai.monitoring.retention-days:30}")
    private int retentionDays = 30;

    @Scheduled(cron = "${app.ai.monitoring.cleanup-cron:0 15 3 * * ?}")
    public void cleanupExpiredEventsOnSchedule() {
        cleanupExpiredEvents();
    }

    public int cleanupExpiredEvents() {
        int sanitizedRetentionDays = Math.max(1, retentionDays);
        LocalDateTime cutoff = LocalDateTime.now().minusDays(sanitizedRetentionDays);
        int affectedRows = eventMapper.markExpiredAsDeleted(cutoff);
        if (affectedRows > 0) {
            log.info("已清理过期 AI 提供商事件: retentionDays={}, affectedRows={}", sanitizedRetentionDays, affectedRows);
        } else {
            log.debug("AI 提供商事件清理完成，无需清理: retentionDays={}", sanitizedRetentionDays);
        }
        return affectedRows;
    }
}
