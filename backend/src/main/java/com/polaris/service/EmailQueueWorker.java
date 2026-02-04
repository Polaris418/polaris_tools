package com.polaris.service;

import com.polaris.entity.EmailQueue;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Lazy;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

/**
 * 邮件队列后台处理器
 * 定时从队列中获取待发送邮件并处理
 */
@Slf4j
@Component
public class EmailQueueWorker {
    
    private final EmailQueueService emailQueueService;
    
    @Value("${email.queue.worker-threads:5}")
    private int workerThreads;
    
    @Value("${email.queue.batch-size:10}")
    private int batchSize;
    
    @Value("${email.queue.enabled:true}")
    private boolean enabled;
    
    private ExecutorService executorService;
    
    // 使用@Lazy打破循环依赖
    public EmailQueueWorker(@Lazy EmailQueueService emailQueueService) {
        this.emailQueueService = emailQueueService;
    }
    
    @PostConstruct
    public void init() {
        if (enabled) {
            executorService = Executors.newFixedThreadPool(workerThreads);
            log.info("邮件队列 Worker 已启动: workerThreads={}, batchSize={}", workerThreads, batchSize);
        } else {
            log.info("邮件队列 Worker 已禁用");
        }
    }
    
    @PreDestroy
    public void destroy() {
        if (executorService != null) {
            log.info("正在关闭邮件队列 Worker...");
            executorService.shutdown();
            try {
                if (!executorService.awaitTermination(60, TimeUnit.SECONDS)) {
                    executorService.shutdownNow();
                }
            } catch (InterruptedException e) {
                executorService.shutdownNow();
                Thread.currentThread().interrupt();
            }
            log.info("邮件队列 Worker 已关闭");
        }
    }
    
    /**
     * 动态调整线程池大小
     * 
     * @param threads 新的线程数
     */
    public synchronized void setWorkerThreads(int threads) {
        if (threads < 1 || threads > 50) {
            throw new IllegalArgumentException("线程数必须在 1-50 之间");
        }
        
        if (threads == this.workerThreads) {
            log.info("线程数未变化: {}", threads);
            return;
        }
        
        log.info("动态调整线程池大小: {} -> {}", this.workerThreads, threads);
        
        // 关闭旧的线程池
        if (executorService != null) {
            executorService.shutdown();
            try {
                if (!executorService.awaitTermination(30, TimeUnit.SECONDS)) {
                    executorService.shutdownNow();
                }
            } catch (InterruptedException e) {
                executorService.shutdownNow();
                Thread.currentThread().interrupt();
            }
        }
        
        // 创建新的线程池
        this.workerThreads = threads;
        executorService = Executors.newFixedThreadPool(threads);
        
        log.info("线程池已重新创建: workerThreads={}", threads);
    }
    
    /**
     * 动态调整批处理大小
     * 
     * @param size 新的批处理大小
     */
    public synchronized void setBatchSize(int size) {
        if (size < 1 || size > 100) {
            throw new IllegalArgumentException("批处理大小必须在 1-100 之间");
        }
        
        log.info("动态调整批处理大小: {} -> {}", this.batchSize, size);
        this.batchSize = size;
    }
    
    /**
     * 获取当前线程数
     */
    public int getWorkerThreads() {
        return workerThreads;
    }
    
    /**
     * 获取当前批处理大小
     */
    public int getBatchSize() {
        return batchSize;
    }
    
    /**
     * 定时处理队列（每10秒执行一次）
     */
    @Scheduled(fixedDelay = 10000, initialDelay = 5000)
    public void processQueue() {
        if (!enabled) {
            return;
        }
        
        try {
            // 获取待发送的邮件
            List<EmailQueue> pendingEmails = emailQueueService.getPendingEmails(batchSize);
            
            if (pendingEmails.isEmpty()) {
                return;
            }
            
            log.debug("开始处理邮件队列: count={}", pendingEmails.size());
            
            // 并发处理邮件
            for (EmailQueue email : pendingEmails) {
                executorService.submit(() -> {
                    try {
                        emailQueueService.processQueueItem(email);
                    } catch (Exception e) {
                        log.error("处理队列邮件异常: queueId={}", email.getId(), e);
                    }
                });
            }
            
        } catch (Exception e) {
            log.error("邮件队列处理异常", e);
        }
    }
    
    /**
     * 获取队列统计信息（每分钟执行一次）
     */
    @Scheduled(fixedDelay = 60000, initialDelay = 10000)
    public void logQueueStats() {
        if (!enabled) {
            return;
        }
        
        try {
            long queueLength = emailQueueService.getQueueLength();
            double processingSpeed = emailQueueService.getProcessingSpeed();
            double failureRate = emailQueueService.getFailureRate();
            
            if (queueLength > 0 || processingSpeed > 0) {
                log.info("邮件队列统计: queueLength={}, processingSpeed={}/hour, failureRate={}%",
                        queueLength, processingSpeed, String.format("%.2f", failureRate * 100));
            }
            
            // 告警：队列积压
            if (queueLength > 100) {
                log.warn("邮件队列积压告警: queueLength={}", queueLength);
            }
            
            // 告警：失败率过高
            if (failureRate > 0.1) { // 10%
                log.warn("邮件发送失败率过高: failureRate={}%", String.format("%.2f", failureRate * 100));
            }
            
        } catch (Exception e) {
            log.error("获取队列统计信息失败", e);
        }
    }
}
