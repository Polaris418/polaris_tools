package com.polaris.service;

import com.polaris.email.alert.AlertRuleEngine;
import com.polaris.email.entity.EmailMetrics;
import com.polaris.email.mapper.EmailMetricsMapper;
import com.polaris.service.impl.MonitoringServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MonitoringAlertFlowTest {

    @Mock
    private EmailMetricsMapper emailMetricsMapper;
    @Mock
    private AlertRuleEngine alertRuleEngine;

    private MonitoringServiceImpl monitoringService;

    @BeforeEach
    void setUp() {
        monitoringService = new MonitoringServiceImpl(emailMetricsMapper, alertRuleEngine);
    }

    @Test
    void shouldPersistMetricsAndTriggerAlertEngineWhenFlushing() {
        when(emailMetricsMapper.findByHour(any())).thenReturn(null);
        when(emailMetricsMapper.insert(any(EmailMetrics.class))).thenReturn(1);

        monitoringService.recordEmailSent(120);
        monitoringService.recordEmailFailed();
        monitoringService.recordEmailBounce();

        monitoringService.flushCurrentMetrics();

        ArgumentCaptor<EmailMetrics> captor = ArgumentCaptor.forClass(EmailMetrics.class);
        verify(emailMetricsMapper).insert(captor.capture());
        verify(alertRuleEngine).checkAndAlert(any(EmailMetrics.class));

        EmailMetrics persisted = captor.getValue();
        assertEquals(1, persisted.getSentCount());
        assertEquals(1, persisted.getFailedCount());
        assertEquals(1, persisted.getBounceCount());
    }
}
