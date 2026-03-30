package com.polaris.service.impl;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.polaris.email.entity.EmailVerificationLog;
import com.polaris.entity.VerificationPurpose;
import com.polaris.email.mapper.EmailVerificationLogMapper;
import com.polaris.service.VerificationLogService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * 验证日志服务实现类
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class VerificationLogServiceImpl implements VerificationLogService {
    
    private final EmailVerificationLogMapper verificationLogMapper;
    
    @Override
    @Async
    public void logSend(String email, VerificationPurpose purpose, String ipAddress, 
                        String userAgent, boolean success, String errorMessage) {
        try {
            EmailVerificationLog logEntry = new EmailVerificationLog();
            logEntry.setEmail(email);
            logEntry.setPurpose(purpose.name());
            logEntry.setAction("send");
            logEntry.setIpAddress(ipAddress);
            logEntry.setUserAgent(userAgent);
            logEntry.setSuccess(success ? 1 : 0);
            logEntry.setErrorMessage(errorMessage);
            
            verificationLogMapper.insert(logEntry);
            log.debug("Logged verification code send event for email: {}, purpose: {}, success: {}", 
                     email, purpose, success);
        } catch (Exception e) {
            log.error("Failed to log verification code send event", e);
        }
    }
    
    @Override
    @Async
    public void logVerify(String email, VerificationPurpose purpose, String ipAddress, 
                          String userAgent, boolean success, String errorMessage) {
        try {
            EmailVerificationLog logEntry = new EmailVerificationLog();
            logEntry.setEmail(email);
            logEntry.setPurpose(purpose.name());
            logEntry.setAction("verify");
            logEntry.setIpAddress(ipAddress);
            logEntry.setUserAgent(userAgent);
            logEntry.setSuccess(success ? 1 : 0);
            logEntry.setErrorMessage(errorMessage);
            
            verificationLogMapper.insert(logEntry);
            log.debug("Logged verification code verify event for email: {}, purpose: {}, success: {}", 
                     email, purpose, success);
        } catch (Exception e) {
            log.error("Failed to log verification code verify event", e);
        }
    }
    
    @Override
    @Async
    public void logFail(String email, VerificationPurpose purpose, String ipAddress, 
                        String userAgent, String errorMessage) {
        try {
            EmailVerificationLog logEntry = new EmailVerificationLog();
            logEntry.setEmail(email);
            logEntry.setPurpose(purpose.name());
            logEntry.setAction("fail");
            logEntry.setIpAddress(ipAddress);
            logEntry.setUserAgent(userAgent);
            logEntry.setSuccess(0);
            logEntry.setErrorMessage(errorMessage);
            
            verificationLogMapper.insert(logEntry);
            log.debug("Logged verification code fail event for email: {}, purpose: {}, error: {}", 
                     email, purpose, errorMessage);
        } catch (Exception e) {
            log.error("Failed to log verification code fail event", e);
        }
    }
    
    @Override
    public List<EmailVerificationLog> findByEmail(String email) {
        return verificationLogMapper.findByEmail(email);
    }
    
    @Override
    public List<EmailVerificationLog> findByEmailAndPurpose(String email, VerificationPurpose purpose) {
        return verificationLogMapper.findByEmailAndPurpose(email, purpose.name());
    }
    
    @Override
    public List<EmailVerificationLog> findByIpAddress(String ipAddress) {
        return verificationLogMapper.findByIpAddress(ipAddress);
    }
    
    @Override
    public IPage<EmailVerificationLog> findByQuery(Page<EmailVerificationLog> page,
                                                   String email,
                                                   String purpose,
                                                   String action,
                                                   Integer success,
                                                   LocalDateTime startDate,
                                                   LocalDateTime endDate) {
        return verificationLogMapper.findByQuery(page, email, purpose, action, success, startDate, endDate);
    }
    
    @Override
    public Long countByDateRange(LocalDateTime startDate, LocalDateTime endDate) {
        return verificationLogMapper.countByDateRange(startDate, endDate);
    }
    
    @Override
    public Long countSuccessByDateRange(LocalDateTime startDate, LocalDateTime endDate) {
        return verificationLogMapper.countSuccessByDateRange(startDate, endDate);
    }
    
    @Override
    public List<Map<String, Object>> countByActionInDateRange(LocalDateTime startDate, LocalDateTime endDate) {
        return verificationLogMapper.countByActionInDateRange(startDate, endDate);
    }
    
    @Override
    public List<Map<String, Object>> countByPurposeInDateRange(LocalDateTime startDate, LocalDateTime endDate) {
        return verificationLogMapper.countByPurposeInDateRange(startDate, endDate);
    }
    
    @Override
    public List<Map<String, Object>> countSuccessRateByPurpose(LocalDateTime startDate, LocalDateTime endDate) {
        return verificationLogMapper.countSuccessRateByPurpose(startDate, endDate);
    }
    
    @Override
    public List<Map<String, Object>> countByHourlyInterval(LocalDateTime startDate, LocalDateTime endDate) {
        return verificationLogMapper.countByHourlyInterval(startDate, endDate);
    }
    
    @Override
    public Double calculateAvgVerificationTime(LocalDateTime startDate, LocalDateTime endDate) {
        return verificationLogMapper.calculateAvgVerificationTime(startDate, endDate);
    }
}
