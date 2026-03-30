package com.polaris.ai;

import com.polaris.ai.mapper.AiProviderEventMapper;
import com.polaris.ai.service.AiProviderEventRetentionService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Duration;
import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("AI 提供商事件保留服务测试")
class AiProviderEventRetentionServiceTest {

    @Mock
    private AiProviderEventMapper eventMapper;

    private AiProviderEventRetentionService retentionService;

    @BeforeEach
    void setUp() {
        retentionService = new AiProviderEventRetentionService(eventMapper);
        ReflectionTestUtils.setField(retentionService, "retentionDays", 14);
    }

    @Test
    @DisplayName("应按保留天数清理过期事件")
    void shouldCleanupExpiredEventsByRetentionWindow() {
        when(eventMapper.markExpiredAsDeleted(org.mockito.ArgumentMatchers.any())).thenReturn(5);

        int affectedRows = retentionService.cleanupExpiredEvents();

        ArgumentCaptor<LocalDateTime> cutoffCaptor = ArgumentCaptor.forClass(LocalDateTime.class);
        verify(eventMapper).markExpiredAsDeleted(cutoffCaptor.capture());
        assertEquals(5, affectedRows);

        Duration duration = Duration.between(cutoffCaptor.getValue(), LocalDateTime.now());
        long hours = duration.toHours();
        assertTrue(hours >= 14 * 24 - 1);
        assertTrue(hours <= 14 * 24 + 1);
    }
}
