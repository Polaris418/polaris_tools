package com.polaris.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.Executor;
import java.util.concurrent.ThreadPoolExecutor;

/**
 * 邮件异步配置
 * 配置邮件发送的异步线程池
 */
@Slf4j
@Configuration
@EnableAsync
public class EmailAsyncConfig {
    
    /**
     * 邮件任务执行器
     * 专门用于异步发送邮件
     * 
     * @return Executor
     */
    @Bean(name = "emailTaskExecutor")
    public Executor emailTaskExecutor() {
        log.info("初始化邮件任务执行器");
        
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        
        // 核心线程数：5
        executor.setCorePoolSize(5);
        
        // 最大线程数：10
        executor.setMaxPoolSize(10);
        
        // 队列容量：100
        executor.setQueueCapacity(100);
        
        // 线程名称前缀
        executor.setThreadNamePrefix("email-async-");
        
        // 拒绝策略：由调用线程处理
        executor.setRejectedExecutionHandler(new ThreadPoolExecutor.CallerRunsPolicy());
        
        // 线程空闲时间：60秒
        executor.setKeepAliveSeconds(60);
        
        // 允许核心线程超时
        executor.setAllowCoreThreadTimeOut(true);
        
        // 等待所有任务完成后再关闭线程池
        executor.setWaitForTasksToCompleteOnShutdown(true);
        
        // 等待时间：60秒
        executor.setAwaitTerminationSeconds(60);
        
        executor.initialize();
        
        log.info("邮件任务执行器初始化完成: corePoolSize={}, maxPoolSize={}, queueCapacity={}",
                executor.getCorePoolSize(), executor.getMaxPoolSize(), executor.getQueueCapacity());
        
        return executor;
    }
}
