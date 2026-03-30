package com.polaris.ai.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

/**
 * AI 提供商创建/更新请求
 */
@Data
public class AiProviderConfigRequest {

    @NotBlank(message = "配置名称不能为空")
    private String name;

    @NotBlank(message = "提供商类型不能为空")
    private String providerType;

    private String baseUrl;

    private String apiKey;

    @NotBlank(message = "模型名称不能为空")
    private String model;

    @NotNull(message = "启用状态不能为空")
    private Boolean enabled;

    @NotNull(message = "主用状态不能为空")
    private Boolean isPrimary;

    @NotNull(message = "优先级不能为空")
    @Min(value = 0, message = "优先级不能小于 0")
    @Max(value = 9999, message = "优先级不能大于 9999")
    private Integer priority;

    @NotNull(message = "超时时间不能为空")
    @Min(value = 1000, message = "超时时间不能小于 1000ms")
    @Max(value = 120000, message = "超时时间不能大于 120000ms")
    private Integer timeoutMs;

    @NotNull(message = "temperature 不能为空")
    private BigDecimal temperature;

    @NotNull(message = "topP 不能为空")
    private BigDecimal topP;

    @NotNull(message = "maxTokens 不能为空")
    @Min(value = 1, message = "maxTokens 不能小于 1")
    @Max(value = 32768, message = "maxTokens 不能大于 32768")
    private Integer maxTokens;
}
