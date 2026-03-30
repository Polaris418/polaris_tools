package com.polaris.email.service;

import com.polaris.email.entity.EmailQueue;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.lang.reflect.Field;
import java.util.List;

import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class EmailQueueWorkerFlowTest {

    @Mock
    private EmailQueueService emailQueueService;

    private EmailQueueWorker worker;

    @BeforeEach
    void setUp() {
        worker = new EmailQueueWorker(emailQueueService);
        setField(worker, "enabled", true);
        setField(worker, "workerThreads", 1);
        setField(worker, "batchSize", 2);
        worker.init();
    }

    @AfterEach
    void tearDown() {
        worker.destroy();
    }

    @Test
    void shouldDispatchPendingEmailsToQueueService() {
        EmailQueue item = new EmailQueue();
        item.setId(100L);

        when(emailQueueService.getPendingEmails(2)).thenReturn(List.of(item));

        worker.processQueue();

        verify(emailQueueService).getPendingEmails(2);
        verify(emailQueueService, timeout(2000)).processQueueItem(item);
    }

    private static void setField(Object target, String fieldName, Object value) {
        try {
            Field field = target.getClass().getDeclaredField(fieldName);
            field.setAccessible(true);
            field.set(target, value);
        } catch (Exception e) {
            throw new RuntimeException("设置字段失败: " + fieldName, e);
        }
    }
}
