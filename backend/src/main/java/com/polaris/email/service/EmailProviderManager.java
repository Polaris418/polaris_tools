package com.polaris.email.service;

import com.polaris.email.service.impl.AwsSesEmailProvider;
import com.polaris.email.service.impl.ResendEmailProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

/**
 * 邮件服务提供商管理器
 * 
 * 负责管理多个邮件服务提供商，支持动态切换
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class EmailProviderManager {
    
    private final AwsSesEmailProvider awsSesEmailProvider;
    private final ResendEmailProvider resendEmailProvider;
    private final StringRedisTemplate redisTemplate;
    
    @Value("${email.provider:resend}")
    private String defaultProvider;
    
    private static final String REDIS_KEY_EMAIL_PROVIDER = "email:provider:current";
    
    /**
     * 获取所有可用的邮件服务提供商
     */
    public Map<String, EmailProvider> getAllProviders() {
        Map<String, EmailProvider> providers = new HashMap<>();
        providers.put("aws-ses", awsSesEmailProvider);
        providers.put("resend", resendEmailProvider);
        return providers;
    }
    
    /**
     * 获取当前使用的邮件服务提供商
     */
    public EmailProvider getCurrentProvider() {
        String providerName = getCurrentProviderName();
        EmailProvider provider = getProviderByName(providerName);
        
        if (provider == null || !provider.isAvailable()) {
            log.warn("当前邮件服务提供商 [{}] 不可用，尝试使用备用提供商", providerName);
            provider = getFallbackProvider();
        }
        
        if (provider == null) {
            throw new RuntimeException("没有可用的邮件服务提供商");
        }
        
        return provider;
    }
    
    /**
     * 获取当前使用的邮件服务提供商名称
     */
    public String getCurrentProviderName() {
        try {
            // 优先从 Redis 获取（支持动态切换）
            String providerName = redisTemplate.opsForValue().get(REDIS_KEY_EMAIL_PROVIDER);
            if (providerName != null && !providerName.isEmpty()) {
                log.debug("从 Redis 获取邮件服务提供商: {}", providerName);
                return providerName;
            }
        } catch (Exception e) {
            log.warn("从 Redis 获取邮件服务提供商失败，使用默认配置: {}", e.getMessage());
        }
        
        // 使用配置文件中的默认值
        log.debug("使用默认邮件服务提供商: {}", defaultProvider);
        return defaultProvider;
    }
    
    /**
     * 切换邮件服务提供商
     * 
     * @param providerName 提供商名称（aws-ses 或 resend）
     * @return 是否切换成功
     */
    public boolean switchProvider(String providerName) {
        EmailProvider provider = getProviderByName(providerName);
        
        if (provider == null) {
            log.error("邮件服务提供商不存在: {}", providerName);
            return false;
        }
        
        if (!provider.isAvailable()) {
            log.error("邮件服务提供商不可用: {}", providerName);
            return false;
        }
        
        try {
            // 保存到 Redis
            redisTemplate.opsForValue().set(REDIS_KEY_EMAIL_PROVIDER, providerName);
            log.info("成功切换邮件服务提供商: {} -> {}", getCurrentProviderName(), providerName);
            return true;
        } catch (Exception e) {
            log.error("切换邮件服务提供商失败: {}", providerName, e);
            return false;
        }
    }
    
    /**
     * 根据名称获取邮件服务提供商
     */
    private EmailProvider getProviderByName(String providerName) {
        if (providerName == null || providerName.isEmpty()) {
            return null;
        }
        
        return switch (providerName.toLowerCase()) {
            case "aws-ses" -> awsSesEmailProvider;
            case "resend" -> resendEmailProvider;
            default -> null;
        };
    }
    
    /**
     * 获取备用邮件服务提供商
     * 
     * 当当前提供商不可用时，自动切换到可用的备用提供商
     */
    private EmailProvider getFallbackProvider() {
        // 尝试所有提供商
        for (EmailProvider provider : getAllProviders().values()) {
            if (provider.isAvailable()) {
                log.info("使用备用邮件服务提供商: {}", provider.getProviderName());
                return provider;
            }
        }
        
        log.error("没有可用的备用邮件服务提供商");
        return null;
    }
    
    /**
     * 获取所有提供商的状态
     */
    public Map<String, Boolean> getProvidersStatus() {
        Map<String, Boolean> status = new HashMap<>();
        for (Map.Entry<String, EmailProvider> entry : getAllProviders().entrySet()) {
            status.put(entry.getKey(), entry.getValue().isAvailable());
        }
        return status;
    }
}
