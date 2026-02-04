package com.polaris.service;

import java.util.Map;

/**
 * 告警配置管理服务接口
 * 负责管理告警规则的配置
 * 
 * Requirements: 需求13 - 监控和日志
 */
public interface AlertConfigService {
    
    /**
     * 获取告警配置
     * 
     * @return 告警配置映射
     */
    Map<String, AlertConfig> getAlertConfigs();
    
    /**
     * 获取指定类型的告警配置
     * 
     * @param alertType 告警类型
     * @return 告警配置
     */
    AlertConfig getAlertConfig(String alertType);
    
    /**
     * 更新告警配置
     * 
     * @param alertType 告警类型
     * @param config 告警配置
     */
    void updateAlertConfig(String alertType, AlertConfig config);
    
    /**
     * 启用告警
     * 
     * @param alertType 告警类型
     */
    void enableAlert(String alertType);
    
    /**
     * 禁用告警
     * 
     * @param alertType 告警类型
     */
    void disableAlert(String alertType);
    
    /**
     * 重置告警配置为默认值
     * 
     * @param alertType 告警类型
     */
    void resetAlertConfig(String alertType);
    
    /**
     * 告警配置类
     */
    class AlertConfig {
        private String alertType;
        private String name;
        private String description;
        private boolean enabled;
        private double threshold;
        private String level;
        private int cooldownMinutes;
        
        public AlertConfig() {
        }
        
        public AlertConfig(String alertType, String name, String description, 
                         boolean enabled, double threshold, String level, int cooldownMinutes) {
            this.alertType = alertType;
            this.name = name;
            this.description = description;
            this.enabled = enabled;
            this.threshold = threshold;
            this.level = level;
            this.cooldownMinutes = cooldownMinutes;
        }
        
        // Getters and Setters
        public String getAlertType() {
            return alertType;
        }
        
        public void setAlertType(String alertType) {
            this.alertType = alertType;
        }
        
        public String getName() {
            return name;
        }
        
        public void setName(String name) {
            this.name = name;
        }
        
        public String getDescription() {
            return description;
        }
        
        public void setDescription(String description) {
            this.description = description;
        }
        
        public boolean isEnabled() {
            return enabled;
        }
        
        public void setEnabled(boolean enabled) {
            this.enabled = enabled;
        }
        
        public double getThreshold() {
            return threshold;
        }
        
        public void setThreshold(double threshold) {
            this.threshold = threshold;
        }
        
        public String getLevel() {
            return level;
        }
        
        public void setLevel(String level) {
            this.level = level;
        }
        
        public int getCooldownMinutes() {
            return cooldownMinutes;
        }
        
        public void setCooldownMinutes(int cooldownMinutes) {
            this.cooldownMinutes = cooldownMinutes;
        }
    }
}
