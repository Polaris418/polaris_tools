package com.polaris.email.converter;

import com.polaris.email.dto.EmailAuditLogResponse;
import com.polaris.email.entity.EmailAuditLog;
import com.polaris.email.entity.EmailType;
import org.mapstruct.AfterMapping;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.NullValuePropertyMappingStrategy;

/**
 * 邮件审计日志转换器
 * 使用 MapStruct 自动生成实现
 * 
 * 注意：EmailAuditLog 是系统自动创建的审计日志，不需要 Create/Update Request
 * 因此不继承 BaseConverter，只提供 toResponse 方法
 */
@Mapper(componentModel = "spring", nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
public interface EmailAuditLogConverter {
    
    /**
     * Entity -> Response DTO
     * 
     * @param emailAuditLog 邮件审计日志实体
     * @return 邮件审计日志响应 DTO
     */
    @Mapping(target = "emailTypeDescriptionZh", ignore = true)
    @Mapping(target = "emailTypeDescriptionEn", ignore = true)
    EmailAuditLogResponse toResponse(EmailAuditLog emailAuditLog);
    
    /**
     * 在映射完成后，添加邮件类型的翻译
     */
    @AfterMapping
    default void addEmailTypeTranslations(@MappingTarget EmailAuditLogResponse response, EmailAuditLog emailAuditLog) {
        if (emailAuditLog.getEmailType() != null) {
            response.setEmailTypeDescriptionZh(getEmailTypeDescription(emailAuditLog.getEmailType(), true));
            response.setEmailTypeDescriptionEn(getEmailTypeDescription(emailAuditLog.getEmailType(), false));
        }
    }
    
    /**
     * 根据邮件类型代码获取描述
     * 
     * @param emailTypeCode 邮件类型代码
     * @param isChinese 是否返回中文描述
     * @return 邮件类型描述
     */
    default String getEmailTypeDescription(String emailTypeCode, boolean isChinese) {
        if (emailTypeCode == null) {
            return null;
        }
        
        // 尝试从枚举获取
        try {
            EmailType emailType = EmailType.fromCode(emailTypeCode);
            if (isChinese) {
                return emailType.getDescription();
            } else {
                // 返回英文描述
                return getEnglishDescription(emailType);
            }
        } catch (Exception e) {
            // 如果不是枚举类型，返回自定义映射
            return getCustomEmailTypeDescription(emailTypeCode, isChinese);
        }
    }
    
    /**
     * 获取邮件类型的英文描述
     */
    default String getEnglishDescription(EmailType emailType) {
        switch (emailType) {
            case TRANSACTIONAL:
                return "Transactional Email";
            case SYSTEM_NOTIFICATION:
                return "System Notification";
            case MARKETING:
                return "Marketing Email";
            case PRODUCT_UPDATE:
                return "Product Update";
            default:
                return emailType.name();
        }
    }
    
    /**
     * 获取自定义邮件类型的描述（用于模板代码）
     */
    default String getCustomEmailTypeDescription(String code, boolean isChinese) {
        if (code == null) {
            return isChinese ? "未知类型" : "Unknown Type";
        }
        
        // 常见的邮件模板代码映射
        switch (code.toUpperCase()) {
            case "VERIFICATION":
            case "EMAIL_VERIFICATION":
                return isChinese ? "邮箱验证" : "Email Verification";
            case "PASSWORD_RESET":
            case "RESET_PASSWORD":
                return isChinese ? "密码重置" : "Password Reset";
            case "WELCOME":
                return isChinese ? "欢迎邮件" : "Welcome Email";
            case "LOGIN_NOTIFICATION":
                return isChinese ? "登录通知" : "Login Notification";
            case "ACCOUNT_SECURITY":
                return isChinese ? "账户安全" : "Account Security";
            case "SUBSCRIPTION_CONFIRMATION":
                return isChinese ? "订阅确认" : "Subscription Confirmation";
            case "UNSUBSCRIBE_CONFIRMATION":
                return isChinese ? "退订确认" : "Unsubscribe Confirmation";
            case "PROMOTIONAL":
                return isChinese ? "促销活动" : "Promotional";
            case "NEWSLETTER":
                return isChinese ? "新闻通讯" : "Newsletter";
            case "PRODUCT_ANNOUNCEMENT":
                return isChinese ? "产品公告" : "Product Announcement";
            case "VERIFICATION_CODE":
                return isChinese ? "验证码" : "Verification Code";
            default:
                // 如果没有匹配，返回格式化的代码
                return formatEmailTypeCode(code);
        }
    }
    
    /**
     * 格式化邮件类型代码为可读文本
     */
    default String formatEmailTypeCode(String code) {
        if (code == null || code.isEmpty()) {
            return code;
        }
        // 将下划线替换为空格，并首字母大写
        String[] words = code.toLowerCase().split("_");
        StringBuilder result = new StringBuilder();
        for (String word : words) {
            if (word.length() > 0) {
                result.append(Character.toUpperCase(word.charAt(0)))
                      .append(word.substring(1))
                      .append(" ");
            }
        }
        return result.toString().trim();
    }
}
