package com.polaris.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.client.config.ClientOverrideConfiguration;
import software.amazon.awssdk.core.retry.RetryPolicy;
import software.amazon.awssdk.core.retry.backoff.BackoffStrategy;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.sesv2.SesV2Client;
import software.amazon.awssdk.services.sesv2.SesV2ClientBuilder;

/**
 * AWS SES 邮件服务配置
 */
@Data
@Configuration
@ConfigurationProperties(prefix = "aws.ses")
public class AwsSesConfig {
    
    /**
     * AWS 区域 (例如: us-east-1)
     */
    private String region = "us-east-1";
    
    /**
     * AWS 访问密钥 ID (建议使用环境变量或 IAM 角色)
     */
    private String accessKeyId;
    
    /**
     * AWS 秘密访问密钥 (建议使用环境变量或 IAM 角色)
     */
    private String secretAccessKey;
    
    /**
     * 发件人邮箱地址
     */
    private String fromEmail;
    
    /**
     * 是否启用邮件服务
     */
    private boolean enabled = true;
    
    /**
     * 配置集名称 (用于事件跟踪)
     */
    private String configurationSetName;
    
    /**
     * 重试配置
     */
    private RetryConfig retry = new RetryConfig();
    
    /**
     * 限流配置
     */
    private RateLimitConfig rateLimit = new RateLimitConfig();
    
    /**
     * 多发件人地址配置
     */
    private SenderConfig senders = new SenderConfig();
    
    /**
     * 重试配置类
     */
    @Data
    public static class RetryConfig {
        /**
         * 最大重试次数
         */
        private int maxAttempts = 3;
        
        /**
         * 基础延迟时间 (毫秒)
         */
        private long baseDelayMillis = 1000;
        
        /**
         * 最大延迟时间 (毫秒)
         */
        private long maxDelayMillis = 20000;
    }
    
    /**
     * 限流配置类
     */
    @Data
    public static class RateLimitConfig {
        /**
         * 每秒最大邮件发送数
         */
        private int maxEmailsPerSecond = 10;
        
        /**
         * 每日最大邮件发送数
         */
        private int maxEmailsPerDay = 50000;
        
        /**
         * 同一邮箱地址验证/重置邮件冷却时间（秒）
         */
        private int emailCooldownSeconds = 60;
        
        /**
         * 同一用户每日最多验证/重置邮件数
         */
        private int userDailyLimit = 5;
        
        /**
         * 同一 IP 地址邮件请求冷却时间（秒）
         */
        private int ipCooldownSeconds = 60;
        
        /**
         * 同一 IP 地址冷却时间内最多邮件请求数
         */
        private int ipMaxRequests = 3;
    }
    
    /**
     * 多发件人地址配置类
     */
    @Data
    public static class SenderConfig {
        /**
         * 默认发件人地址（用于一般邮件）
         */
        private String noreply = "Polaris Tools <noreply@polaristools.online>";
        
        /**
         * 客户支持发件人地址
         */
        private String support = "Polaris Support <support@polaristools.online>";
        
        /**
         * 安全通知发件人地址
         */
        private String security = "Polaris Security <security@polaristools.online>";
        
        /**
         * 默认 Reply-To 地址（可选）
         */
        private String defaultReplyTo;
        
        /**
         * 客户支持 Reply-To 地址（可选）
         */
        private String supportReplyTo;
        
        /**
         * 根据邮件类型获取发件人地址
         * 
         * @param emailType 邮件类型
         * @return 发件人地址
         */
        public String getSenderByEmailType(String emailType) {
            if (emailType == null) {
                return noreply;
            }
            
            switch (emailType.toUpperCase()) {
                case "PASSWORD_RESET":
                case "EMAIL_VERIFICATION":
                case "ACCOUNT_SECURITY":
                    return security;
                case "CUSTOMER_SUPPORT":
                case "FEEDBACK":
                    return support;
                case "WELCOME":
                case "LOGIN_NOTIFICATION":
                case "SYSTEM_NOTIFICATION":
                case "MARKETING":
                case "PRODUCT_UPDATE":
                default:
                    return noreply;
            }
        }
        
        /**
         * 根据邮件类型获取 Reply-To 地址
         * 
         * @param emailType 邮件类型
         * @return Reply-To 地址（如果未配置则返回 null）
         */
        public String getReplyToByEmailType(String emailType) {
            if (emailType == null) {
                return defaultReplyTo;
            }
            
            switch (emailType.toUpperCase()) {
                case "CUSTOMER_SUPPORT":
                case "FEEDBACK":
                    return supportReplyTo != null ? supportReplyTo : defaultReplyTo;
                default:
                    return defaultReplyTo;
            }
        }
    }
    
    /**
     * 获取默认发件人地址（向后兼容）
     * 如果配置了 fromEmail，使用 fromEmail；否则使用 senders.noreply
     * 
     * @return 默认发件人地址
     */
    public String getDefaultFromEmail() {
        if (fromEmail != null && !fromEmail.isEmpty()) {
            return fromEmail;
        }
        return senders.getNoreply();
    }
    
    /**
     * 根据邮件类型获取发件人地址
     * 
     * @param emailType 邮件类型
     * @return 发件人地址
     */
    public String getFromEmailByType(String emailType) {
        return senders.getSenderByEmailType(emailType);
    }
    
    /**
     * 根据邮件类型获取 Reply-To 地址
     * 
     * @param emailType 邮件类型
     * @return Reply-To 地址（如果未配置则返回 null）
     */
    public String getReplyToByType(String emailType) {
        return senders.getReplyToByEmailType(emailType);
    }
    
    /**
     * 创建 SesV2Client Bean
     */
    @Bean
    public SesV2Client sesV2Client() {
        Region awsRegion = Region.of(region);
        
        SesV2ClientBuilder builder = SesV2Client.builder()
                .region(awsRegion);
        
        // 如果提供了访问密钥，使用静态凭证
        // 否则使用默认凭证链 (环境变量、IAM 角色等)
        if (accessKeyId != null && !accessKeyId.isEmpty() && 
            secretAccessKey != null && !secretAccessKey.isEmpty()) {
            AwsBasicCredentials credentials = AwsBasicCredentials.create(
                    accessKeyId, secretAccessKey);
            builder.credentialsProvider(StaticCredentialsProvider.create(credentials));
        }
        
        // 配置重试策略
        RetryPolicy retryPolicy = RetryPolicy.builder()
                .numRetries(retry.getMaxAttempts())
                .backoffStrategy(BackoffStrategy.defaultStrategy())
                .build();
        
        builder.overrideConfiguration(ClientOverrideConfiguration.builder()
                .retryPolicy(retryPolicy)
                .build());
        
        return builder.build();
    }
}
