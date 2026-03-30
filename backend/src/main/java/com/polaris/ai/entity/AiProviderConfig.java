package com.polaris.ai.entity;

import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import com.polaris.common.base.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.math.BigDecimal;

/**
 * AI 提供商配置实体
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("ai_provider_config")
public class AiProviderConfig extends BaseEntity {

    @TableField("name")
    private String name;

    @TableField("provider_type")
    private String providerType;

    @TableField("base_url")
    private String baseUrl;

    @TableField("api_key_encrypted")
    private String apiKeyEncrypted;

    @TableField("model")
    private String model;

    @TableField("enabled")
    private Boolean enabled;

    @TableField("is_primary")
    private Boolean isPrimary;

    @TableField("priority")
    private Integer priority;

    @TableField("timeout_ms")
    private Integer timeoutMs;

    @TableField("temperature")
    private BigDecimal temperature;

    @TableField("top_p")
    private BigDecimal topP;

    @TableField("max_tokens")
    private Integer maxTokens;
}
