package com.polaris.ai.entity;

import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import com.polaris.common.base.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;

/**
 * AI 提供商事件实体
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("ai_provider_event")
public class AiProviderEvent extends BaseEntity {

    @TableField("provider_id")
    private Long providerId;

    @TableField("provider_name")
    private String providerName;

    @TableField("provider_type")
    private String providerType;

    @TableField("related_provider_id")
    private Long relatedProviderId;

    @TableField("related_provider_name")
    private String relatedProviderName;

    @TableField("event_type")
    private String eventType;

    @TableField("success")
    private Boolean success;

    @TableField("latency_ms")
    private Long latencyMs;

    @TableField("message")
    private String message;

    @TableField("metric_hour")
    private LocalDateTime metricHour;

    @TableField("occurred_at")
    private LocalDateTime occurredAt;
}
