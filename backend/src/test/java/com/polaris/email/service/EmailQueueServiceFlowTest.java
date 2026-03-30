package com.polaris.email.service;

import com.polaris.email.dto.SendEmailResponse;
import com.polaris.email.dto.SendEmailResult;
import com.polaris.email.entity.EmailAuditLog;
import com.polaris.email.entity.EmailPriority;
import com.polaris.email.entity.EmailQueue;
import com.polaris.email.entity.EmailQueueStatus;
import com.polaris.email.entity.EmailStatus;
import com.polaris.email.mapper.EmailQueueMapper;
import com.polaris.email.service.impl.EmailQueueServiceImpl;
import com.polaris.service.MonitoringService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class EmailQueueServiceFlowTest {

    @Mock
    private EmailQueueMapper emailQueueMapper;
    @Mock
    private EmailProviderManager providerManager;
    @Mock
    private EmailAuditService auditService;
    @Mock
    private MonitoringService monitoringService;
    @Mock
    private EmailQueueWorker emailQueueWorker;
    @Mock
    private EmailProvider emailProvider;

    private EmailQueueServiceImpl emailQueueService;

    @BeforeEach
    void setUp() {
        emailQueueService = new EmailQueueServiceImpl(
                emailQueueMapper,
                providerManager,
                auditService,
                monitoringService,
                emailQueueWorker
        );
    }

    @Test
    void shouldProcessQueueItemAndRecordAuditOnSuccess() {
        EmailQueue queueItem = buildQueueItem();

        when(providerManager.getCurrentProvider()).thenReturn(emailProvider);
        when(providerManager.getCurrentProviderName()).thenReturn("resend");
        when(emailProvider.sendEmail(anyString(), anyString(), anyString(), any())).thenReturn(SendEmailResult.success("msg-1"));

        SendEmailResponse response = emailQueueService.processQueueItem(queueItem);

        assertTrue(response.isSuccess());
        assertEquals("msg-1", response.getId());
        verify(emailQueueMapper, atLeast(2)).updateById(queueItem);
        verify(monitoringService).recordEmailSent(0);

        ArgumentCaptor<EmailAuditLog> auditCaptor = ArgumentCaptor.forClass(EmailAuditLog.class);
        verify(auditService).logEmailSent(auditCaptor.capture());
        assertEquals(EmailStatus.SENT, auditCaptor.getValue().getStatus());
        assertEquals("msg-1", auditCaptor.getValue().getMessageId());
    }

    @Test
    void shouldProcessQueueItemAndRecordFailureAudit() {
        EmailQueue queueItem = buildQueueItem();

        when(providerManager.getCurrentProvider()).thenReturn(emailProvider);
        when(providerManager.getCurrentProviderName()).thenReturn("resend");
        when(emailProvider.sendEmail(anyString(), anyString(), anyString(), any()))
                .thenReturn(SendEmailResult.failure("PROVIDER_ERROR", "send failed", false));

        SendEmailResponse response = emailQueueService.processQueueItem(queueItem);

        assertFalse(response.isSuccess());
        assertTrue(response.getMessage().contains("邮件发送失败"));
        verify(monitoringService).recordEmailFailed();

        ArgumentCaptor<EmailAuditLog> auditCaptor = ArgumentCaptor.forClass(EmailAuditLog.class);
        verify(auditService).logEmailSent(auditCaptor.capture());
        assertEquals(EmailStatus.FAILED, auditCaptor.getValue().getStatus());
        assertEquals("PROVIDER_ERROR", auditCaptor.getValue().getErrorCode());
    }

    private EmailQueue buildQueueItem() {
        EmailQueue queueItem = new EmailQueue();
        queueItem.setId(1L);
        queueItem.setRecipient("user@example.com");
        queueItem.setSubject("subject");
        queueItem.setHtmlContent("<p>body</p>");
        queueItem.setTextContent("body");
        queueItem.setEmailType("WELCOME");
        queueItem.setPriority(EmailPriority.MEDIUM);
        queueItem.setStatus(EmailQueueStatus.PENDING);
        queueItem.setRetryCount(0);
        return queueItem;
    }
}
