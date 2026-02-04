package com.polaris.service;

import com.polaris.mapper.EmailTokenMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

/**
 * 邮件 Token 清理定时任务
 * 每天凌晨 2 点执行，清理超过 7 天的过期 Token
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class EmailTokenCleanupTask {
    
    private final EmailTokenMapper emailTokenMapper;
    
    /**
     * 清理过期的 Token
     * 每天凌晨 2 点执行
     * 清理超过 7 天的过期 Token
     */
    @Scheduled(cron = "0 0 2 * * ?")
    public void cleanupExpiredTokens() {
        log.info("开始清理过期的邮件 Token");
        
        try {
            // 计算 7 天前的时间
            LocalDateTime expiryDate = LocalDateTime.now().minusDays(7);
            
            // 删除过期的 Token
            int deletedCount = emailTokenMapper.deleteExpiredTokens(expiryDate);
            
            log.info("清理过期的邮件 Token 完成: deletedCount={}, expiryDate={}", 
                    deletedCount, expiryDate);
        } catch (Exception e) {
            log.error("清理过期的邮件 Token 失败", e);
        }
    }
}
