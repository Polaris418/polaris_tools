package com.polaris.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * Resend 邮件服务配置
 * 
 * 配置项：
 * - resend.api-key: Resend API Key
 * - resend.from-email: 发件人邮箱
 * - resend.from-name: 发件人名称
 * - resend.api-url: Resend API 地址
 */
@Configuration
@ConfigurationProperties(prefix = "resend")
@Data
public class ResendConfig {
    
    /**
     * Resend API Key
     * 从 https://resend.com/api-keys 获取
     */
    private String apiKey;
    
    /**
     * 发件人邮箱地址
     * 例如：noreply@yourdomain.com
     * 如果没有验证域名，可以使用：onboarding@resend.dev
     */
    private String fromEmail;
    
    /**
     * 发件人名称
     * 例如：Polaris Tools
     */
    private String fromName = "Polaris Tools";
    
    /**
     * Resend API 地址
     * 默认：https://api.resend.com
     */
    private String apiUrl = "https://api.resend.com";
    
    /**
     * 是否启用 Resend（用于切换邮件服务提供商）
     */
    private boolean enabled = true;
}
