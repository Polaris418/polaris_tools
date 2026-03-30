package com.polaris.service;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.polaris.email.entity.EmailVerificationLog;
import com.polaris.entity.VerificationPurpose;
import com.polaris.email.mapper.EmailVerificationLogMapper;
import com.polaris.service.impl.VerificationLogServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * 验证日志服务测试
 */
@ExtendWith(MockitoExtension.class)
class VerificationLogServiceTest {
    
    @Mock
    private EmailVerificationLogMapper verificationLogMapper;
    
    @InjectMocks
    private VerificationLogServiceImpl verificationLogService;
    
    private String testEmail;
    private VerificationPurpose testPurpose;
    private String testIpAddress;
    private String testUserAgent;
    
    @BeforeEach
    void setUp() {
        testEmail = "test@example.com";
        testPurpose = VerificationPurpose.REGISTER;
        testIpAddress = "192.168.1.1";
        testUserAgent = "Mozilla/5.0";
    }
    
    @Test
    void testLogSend_Success() {
        // Given
        when(verificationLogMapper.insert(any(EmailVerificationLog.class))).thenReturn(1);
        
        // When
        verificationLogService.logSend(testEmail, testPurpose, testIpAddress, testUserAgent, true, null);
        
        // Then
        ArgumentCaptor<EmailVerificationLog> captor = ArgumentCaptor.forClass(EmailVerificationLog.class);
        verify(verificationLogMapper, timeout(1000)).insert(captor.capture());
        
        EmailVerificationLog captured = captor.getValue();
        assertEquals(testEmail, captured.getEmail());
        assertEquals(testPurpose.name(), captured.getPurpose());
        assertEquals("send", captured.getAction());
        assertEquals(testIpAddress, captured.getIpAddress());
        assertEquals(testUserAgent, captured.getUserAgent());
        assertEquals(1, captured.getSuccess());
        assertNull(captured.getErrorMessage());
    }
    
    @Test
    void testLogSend_Failure() {
        // Given
        String errorMessage = "Email sending failed";
        when(verificationLogMapper.insert(any(EmailVerificationLog.class))).thenReturn(1);
        
        // When
        verificationLogService.logSend(testEmail, testPurpose, testIpAddress, testUserAgent, false, errorMessage);
        
        // Then
        ArgumentCaptor<EmailVerificationLog> captor = ArgumentCaptor.forClass(EmailVerificationLog.class);
        verify(verificationLogMapper, timeout(1000)).insert(captor.capture());
        
        EmailVerificationLog captured = captor.getValue();
        assertEquals(testEmail, captured.getEmail());
        assertEquals(0, captured.getSuccess());
        assertEquals(errorMessage, captured.getErrorMessage());
    }
    
    @Test
    void testLogVerify_Success() {
        // Given
        when(verificationLogMapper.insert(any(EmailVerificationLog.class))).thenReturn(1);
        
        // When
        verificationLogService.logVerify(testEmail, testPurpose, testIpAddress, testUserAgent, true, null);
        
        // Then
        ArgumentCaptor<EmailVerificationLog> captor = ArgumentCaptor.forClass(EmailVerificationLog.class);
        verify(verificationLogMapper, timeout(1000)).insert(captor.capture());
        
        EmailVerificationLog captured = captor.getValue();
        assertEquals(testEmail, captured.getEmail());
        assertEquals("verify", captured.getAction());
        assertEquals(1, captured.getSuccess());
    }
    
    @Test
    void testLogFail() {
        // Given
        String errorMessage = "Invalid verification code";
        when(verificationLogMapper.insert(any(EmailVerificationLog.class))).thenReturn(1);
        
        // When
        verificationLogService.logFail(testEmail, testPurpose, testIpAddress, testUserAgent, errorMessage);
        
        // Then
        ArgumentCaptor<EmailVerificationLog> captor = ArgumentCaptor.forClass(EmailVerificationLog.class);
        verify(verificationLogMapper, timeout(1000)).insert(captor.capture());
        
        EmailVerificationLog captured = captor.getValue();
        assertEquals(testEmail, captured.getEmail());
        assertEquals("fail", captured.getAction());
        assertEquals(0, captured.getSuccess());
        assertEquals(errorMessage, captured.getErrorMessage());
    }
    
    @Test
    void testFindByEmail() {
        // Given
        EmailVerificationLog log1 = new EmailVerificationLog();
        log1.setEmail(testEmail);
        EmailVerificationLog log2 = new EmailVerificationLog();
        log2.setEmail(testEmail);
        List<EmailVerificationLog> expectedLogs = Arrays.asList(log1, log2);
        
        when(verificationLogMapper.findByEmail(testEmail)).thenReturn(expectedLogs);
        
        // When
        List<EmailVerificationLog> actualLogs = verificationLogService.findByEmail(testEmail);
        
        // Then
        assertEquals(expectedLogs.size(), actualLogs.size());
        verify(verificationLogMapper).findByEmail(testEmail);
    }
    
    @Test
    void testFindByEmailAndPurpose() {
        // Given
        EmailVerificationLog log = new EmailVerificationLog();
        log.setEmail(testEmail);
        log.setPurpose(testPurpose.name());
        List<EmailVerificationLog> expectedLogs = Arrays.asList(log);
        
        when(verificationLogMapper.findByEmailAndPurpose(testEmail, testPurpose.name()))
            .thenReturn(expectedLogs);
        
        // When
        List<EmailVerificationLog> actualLogs = verificationLogService.findByEmailAndPurpose(testEmail, testPurpose);
        
        // Then
        assertEquals(expectedLogs.size(), actualLogs.size());
        verify(verificationLogMapper).findByEmailAndPurpose(testEmail, testPurpose.name());
    }
    
    @Test
    void testFindByIpAddress() {
        // Given
        EmailVerificationLog log = new EmailVerificationLog();
        log.setIpAddress(testIpAddress);
        List<EmailVerificationLog> expectedLogs = Arrays.asList(log);
        
        when(verificationLogMapper.findByIpAddress(testIpAddress)).thenReturn(expectedLogs);
        
        // When
        List<EmailVerificationLog> actualLogs = verificationLogService.findByIpAddress(testIpAddress);
        
        // Then
        assertEquals(expectedLogs.size(), actualLogs.size());
        verify(verificationLogMapper).findByIpAddress(testIpAddress);
    }
    
    @Test
    void testFindByQuery() {
        // Given
        Page<EmailVerificationLog> page = new Page<>(1, 10);
        LocalDateTime startDate = LocalDateTime.now().minusDays(7);
        LocalDateTime endDate = LocalDateTime.now();
        
        IPage<EmailVerificationLog> expectedPage = mock(IPage.class);
        when(verificationLogMapper.findByQuery(any(), eq(testEmail), eq(testPurpose.name()), 
                                               eq("send"), eq(1), eq(startDate), eq(endDate)))
            .thenReturn(expectedPage);
        
        // When
        IPage<EmailVerificationLog> actualPage = verificationLogService.findByQuery(
            page, testEmail, testPurpose.name(), "send", 1, startDate, endDate);
        
        // Then
        assertEquals(expectedPage, actualPage);
        verify(verificationLogMapper).findByQuery(any(), eq(testEmail), eq(testPurpose.name()), 
                                                  eq("send"), eq(1), eq(startDate), eq(endDate));
    }
    
    @Test
    void testCountByDateRange() {
        // Given
        LocalDateTime startDate = LocalDateTime.now().minusDays(7);
        LocalDateTime endDate = LocalDateTime.now();
        Long expectedCount = 100L;
        
        when(verificationLogMapper.countByDateRange(startDate, endDate)).thenReturn(expectedCount);
        
        // When
        Long actualCount = verificationLogService.countByDateRange(startDate, endDate);
        
        // Then
        assertEquals(expectedCount, actualCount);
        verify(verificationLogMapper).countByDateRange(startDate, endDate);
    }
    
    @Test
    void testCountSuccessByDateRange() {
        // Given
        LocalDateTime startDate = LocalDateTime.now().minusDays(7);
        LocalDateTime endDate = LocalDateTime.now();
        Long expectedCount = 80L;
        
        when(verificationLogMapper.countSuccessByDateRange(startDate, endDate)).thenReturn(expectedCount);
        
        // When
        Long actualCount = verificationLogService.countSuccessByDateRange(startDate, endDate);
        
        // Then
        assertEquals(expectedCount, actualCount);
        verify(verificationLogMapper).countSuccessByDateRange(startDate, endDate);
    }
    
    @Test
    void testCountByActionInDateRange() {
        // Given
        LocalDateTime startDate = LocalDateTime.now().minusDays(7);
        LocalDateTime endDate = LocalDateTime.now();
        List<Map<String, Object>> expectedStats = Arrays.asList(
            Map.of("action", "send", "count", 50L),
            Map.of("action", "verify", "count", 40L)
        );
        
        when(verificationLogMapper.countByActionInDateRange(startDate, endDate)).thenReturn(expectedStats);
        
        // When
        List<Map<String, Object>> actualStats = verificationLogService.countByActionInDateRange(startDate, endDate);
        
        // Then
        assertEquals(expectedStats.size(), actualStats.size());
        verify(verificationLogMapper).countByActionInDateRange(startDate, endDate);
    }
    
    @Test
    void testCountByPurposeInDateRange() {
        // Given
        LocalDateTime startDate = LocalDateTime.now().minusDays(7);
        LocalDateTime endDate = LocalDateTime.now();
        List<Map<String, Object>> expectedStats = Arrays.asList(
            Map.of("purpose", "REGISTER", "count", 30L),
            Map.of("purpose", "LOGIN", "count", 20L)
        );
        
        when(verificationLogMapper.countByPurposeInDateRange(startDate, endDate)).thenReturn(expectedStats);
        
        // When
        List<Map<String, Object>> actualStats = verificationLogService.countByPurposeInDateRange(startDate, endDate);
        
        // Then
        assertEquals(expectedStats.size(), actualStats.size());
        verify(verificationLogMapper).countByPurposeInDateRange(startDate, endDate);
    }
}
