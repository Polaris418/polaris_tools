package com.polaris.email.alert.impl;

import com.polaris.email.alert.AlertConfigService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

/**
 * 告警配置管理服务实现
 * 使用 Redis 存储告警配置，支持动态更新
 * 
 * Requirements: 需求13 - 监控和日志
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AlertConfigServiceImpl implements AlertConfigService {
    
    private final RedisTemplate<String, Object> redisTemplate;
    
    private static final String ALERT_CONFIG_KEY = "verification:alert:config:";
    
    // 默认告警配置
    private static final Map<String, AlertConfig> DEFAULT_CONFIGS = new HashMap<>();
    
    static {
        // 发送失败率告警
        DEFAULT_CONFIGS.put("SEND_FAILURE_RATE", new AlertConfig(
            "SEND_FAILURE_RATE",
            "验证码发送失败率告警",
            "当验证码发送失败率超过阈值时触发告警",
            true,
            0.05, // 5%
            "WARNING",
            30 // 30分钟冷却期
        ));
        
        // 验证失败率告警
        DEFAULT_CONFIGS.put("VERIFY_FAILURE_RATE", new AlertConfig(
            "VERIFY_FAILURE_RATE",
            "验证码验证失败率告警",
            "当验证码验证失败率超过阈值时触发告警",
            true,
            0.30, // 30%
            "WARNING",
            30
        ));
        
        // 限流触发告警
        DEFAULT_CONFIGS.put("RATE_LIMIT_TRIGGERS", new AlertConfig(
            "RATE_LIMIT_TRIGGERS",
            "限流触发次数告警",
            "当限流触发次数超过阈值时触发告警",
            true,
            100, // 每小时100次
            "WARNING",
            60
        ));
        
        // 异常行为检测告警
        DEFAULT_CONFIGS.put("ANOMALY_DETECTION", new AlertConfig(
            "ANOMALY_DETECTION",
            "异常行为检测告警",
            "当检测到异常行为次数超过阈值时触发告警",
            true,
            50, // 每小时50次
            "CRITICAL",
            30
        ));
    }
    
    @Override
    public Map<String, AlertConfig> getAlertConfigs() {
        Map<String, AlertConfig> configs = new HashMap<>();
        
        for (String alertType : DEFAULT_CONFIGS.keySet()) {
            AlertConfig config = getAlertConfig(alertType);
            configs.put(alertType, config);
        }
        
        return configs;
    }
    
    @Override
    public AlertConfig getAlertConfig(String alertType) {
        try {
            String key = ALERT_CONFIG_KEY + alertType;
            Object configObj = redisTemplate.opsForValue().get(key);
            
            if (configObj instanceof AlertConfig) {
                return (AlertConfig) configObj;
            }
            
            // 如果 Redis 中没有配置，返回默认配置
            AlertConfig defaultConfig = DEFAULT_CONFIGS.get(alertType);
            if (defaultConfig != null) {
                // 保存默认配置到 Redis
                redisTemplate.opsForValue().set(key, defaultConfig);
                return defaultConfig;
            }
            
            log.warn("未找到告警配置: {}", alertType);
            return null;
        } catch (Exception e) {
            log.error("获取告警配置失败: {}", alertType, e);
            return DEFAULT_CONFIGS.get(alertType);
        }
    }
    
    @Override
    public void updateAlertConfig(String alertType, AlertConfig config) {
        try {
            String key = ALERT_CONFIG_KEY + alertType;
            redisTemplate.opsForValue().set(key, config);
            log.info("告警配置已更新: type={}, enabled={}, threshold={}", 
                alertType, config.isEnabled(), config.getThreshold());
        } catch (Exception e) {
            log.error("更新告警配置失败: {}", alertType, e);
            throw new RuntimeException("更新告警配置失败", e);
        }
    }
    
    @Override
    public void enableAlert(String alertType) {
        try {
            AlertConfig config = getAlertConfig(alertType);
            if (config != null) {
                config.setEnabled(true);
                updateAlertConfig(alertType, config);
                log.info("告警已启用: {}", alertType);
            }
        } catch (Exception e) {
            log.error("启用告警失败: {}", alertType, e);
            throw new RuntimeException("启用告警失败", e);
        }
    }
    
    @Override
    public void disableAlert(String alertType) {
        try {
            AlertConfig config = getAlertConfig(alertType);
            if (config != null) {
                config.setEnabled(false);
                updateAlertConfig(alertType, config);
                log.info("告警已禁用: {}", alertType);
            }
        } catch (Exception e) {
            log.error("禁用告警失败: {}", alertType, e);
            throw new RuntimeException("禁用告警失败", e);
        }
    }
    
    @Override
    public void resetAlertConfig(String alertType) {
        try {
            AlertConfig defaultConfig = DEFAULT_CONFIGS.get(alertType);
            if (defaultConfig != null) {
                updateAlertConfig(alertType, defaultConfig);
                log.info("告警配置已重置为默认值: {}", alertType);
            } else {
                log.warn("未找到默认告警配置: {}", alertType);
            }
        } catch (Exception e) {
            log.error("重置告警配置失败: {}", alertType, e);
            throw new RuntimeException("重置告警配置失败", e);
        }
    }
}
