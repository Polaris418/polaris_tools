package com.polaris.email.entity;

/**
 * 邮件类型枚举
 */
public enum EmailType {
    
    /**
     * 事务性邮件（不受退订影响）
     * 包括：邮箱验证、密码重置、账户安全通知
     */
    TRANSACTIONAL("TRANSACTIONAL", "事务性邮件", false),
    
    /**
     * 系统通知
     * 包括：登录通知、账户变更通知等
     */
    SYSTEM_NOTIFICATION("SYSTEM_NOTIFICATION", "系统通知", true),
    
    /**
     * 营销邮件
     * 包括：促销活动、优惠信息等
     */
    MARKETING("MARKETING", "营销邮件", true),
    
    /**
     * 产品更新
     * 包括：新功能发布、产品更新通知等
     */
    PRODUCT_UPDATE("PRODUCT_UPDATE", "产品更新", true);
    
    private final String code;
    private final String description;
    private final boolean canUnsubscribe;
    
    EmailType(String code, String description, boolean canUnsubscribe) {
        this.code = code;
        this.description = description;
        this.canUnsubscribe = canUnsubscribe;
    }
    
    public String getCode() {
        return code;
    }
    
    public String getDescription() {
        return description;
    }
    
    public boolean isCanUnsubscribe() {
        return canUnsubscribe;
    }
    
    /**
     * 根据代码获取邮件类型
     */
    public static EmailType fromCode(String code) {
        for (EmailType type : values()) {
            if (type.code.equals(code)) {
                return type;
            }
        }
        return TRANSACTIONAL;
    }
    
    /**
     * 判断是否为事务性邮件
     */
    public boolean isTransactional() {
        return this == TRANSACTIONAL;
    }
}
