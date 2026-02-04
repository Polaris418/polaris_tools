/**
 * 邮件类型翻译工具函数
 * Email Type Translation Utilities
 */

import type { EmailAuditLogResponse } from '../pages/admin/types';

/**
 * 获取邮件类型的显示文本（自动根据语言选择）
 * Get email type display text (automatically select based on language)
 * 
 * @param email 邮件日志对象
 * @param language 当前语言 ('zh' | 'en')
 * @returns 邮件类型的显示文本
 */
export function getEmailTypeDisplay(
  email: EmailAuditLogResponse,
  language: 'zh' | 'en'
): string {
  // 优先使用后端返回的翻译字段
  if (language === 'zh' && email.emailTypeDescriptionZh) {
    return email.emailTypeDescriptionZh;
  }
  if (language === 'en' && email.emailTypeDescriptionEn) {
    return email.emailTypeDescriptionEn;
  }
  
  // 如果后端没有返回翻译，使用前端的备用映射
  return getEmailTypeLabel(email.emailType, language);
}

/**
 * 根据邮件类型代码获取翻译标签
 * Get translated label by email type code
 * 
 * @param type 邮件类型代码
 * @param language 当前语言 ('zh' | 'en')
 * @returns 翻译后的标签
 */
export function getEmailTypeLabel(
  type: string,
  language: 'zh' | 'en'
): string {
  const labels: Record<string, { zh: string; en: string }> = {
    // 事务性邮件
    TRANSACTIONAL: { zh: '事务性邮件', en: 'Transactional Email' },
    
    // 验证相关
    VERIFICATION: { zh: '邮箱验证', en: 'Email Verification' },
    EMAIL_VERIFICATION: { zh: '邮箱验证', en: 'Email Verification' },
    VERIFICATION_CODE: { zh: '验证码', en: 'Verification Code' },
    
    // 密码相关
    PASSWORD_RESET: { zh: '密码重置', en: 'Password Reset' },
    RESET_PASSWORD: { zh: '密码重置', en: 'Password Reset' },
    
    // 通知相关
    NOTIFICATION: { zh: '通知', en: 'Notification' },
    SYSTEM_NOTIFICATION: { zh: '系统通知', en: 'System Notification' },
    LOGIN_NOTIFICATION: { zh: '登录通知', en: 'Login Notification' },
    
    // 欢迎和账户
    WELCOME: { zh: '欢迎邮件', en: 'Welcome Email' },
    ACCOUNT_SECURITY: { zh: '账户安全', en: 'Account Security' },
    
    // 订阅相关
    SUBSCRIPTION_CONFIRMATION: { zh: '订阅确认', en: 'Subscription Confirmation' },
    UNSUBSCRIBE_CONFIRMATION: { zh: '退订确认', en: 'Unsubscribe Confirmation' },
    
    // 营销相关
    MARKETING: { zh: '营销邮件', en: 'Marketing Email' },
    PROMOTIONAL: { zh: '促销活动', en: 'Promotional' },
    NEWSLETTER: { zh: '新闻通讯', en: 'Newsletter' },
    
    // 产品相关
    PRODUCT_UPDATE: { zh: '产品更新', en: 'Product Update' },
    PRODUCT_ANNOUNCEMENT: { zh: '产品公告', en: 'Product Announcement' },
  };
  
  const label = labels[type];
  if (label) {
    return language === 'zh' ? label.zh : label.en;
  }
  
  // 如果没有匹配，返回格式化的代码
  return formatEmailTypeCode(type);
}

/**
 * 格式化邮件类型代码为可读文本
 * Format email type code to readable text
 * 
 * @param code 邮件类型代码
 * @returns 格式化后的文本
 */
function formatEmailTypeCode(code: string): string {
  if (!code) return '';
  
  // 将下划线替换为空格，并首字母大写
  const words = code.toLowerCase().split('_');
  return words
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * 获取所有支持的邮件类型列表（用于筛选器）
 * Get all supported email types (for filters)
 * 
 * @param language 当前语言 ('zh' | 'en')
 * @returns 邮件类型选项数组
 */
export function getEmailTypeOptions(language: 'zh' | 'en'): Array<{ value: string; label: string }> {
  const types = [
    'VERIFICATION',
    'PASSWORD_RESET',
    'NOTIFICATION',
    'WELCOME',
    'SYSTEM_NOTIFICATION',
    'MARKETING',
    'PRODUCT_UPDATE',
  ];
  
  return types.map(type => ({
    value: type,
    label: getEmailTypeLabel(type, language),
  }));
}
